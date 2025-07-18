/**
 * HTTP Load Balancer Implementation
 *
 * A high-performance load balancer that distributes incoming requests across multiple
 * backend targets using various strategies. Supports health checking, sticky sessions,
 * and comprehensive monitoring for production-grade API gateway deployments.
 *
 * Features:
 * - Multiple load balancing strategies (round-robin, least-connections, weighted, random, ip-hash)
 * - Automatic health checking with configurable intervals and validation
 * - Sticky session support for session affinity
 * - Real-time statistics and monitoring
 * - Circuit breaker pattern for fault tolerance
 * - Comprehensive logging and observability
 *
 * @example
 * ```ts
 * const loadBalancer = new HttpLoadBalancer({
 *   strategy: 'least-connections',
 *   targets: [
 *     { url: 'http://service1:3000', weight: 2 },
 *     { url: 'http://service2:3000', weight: 1 }
 *   ],
 *   healthCheck: { enabled: true, interval: 30000, path: '/health' }
 * })
 *
 * const target = loadBalancer.selectTarget(request)
 * ```
 */
import type {
  LoadBalancer,
  LoadBalancerConfig,
  LoadBalancerTarget,
  LoadBalancerStats,
} from '../interfaces/load-balancer'
import type { Logger } from '../interfaces/logger'
import { defaultLogger } from '../logger/pino-logger'
import * as crypto from 'crypto'

/**
 * Internal target representation with runtime tracking data
 * Extends the base LoadBalancerTarget with operational metrics
 */
interface InternalTarget extends LoadBalancerTarget {
  /** Number of requests routed to this target */
  requests: number
  /** Number of failed requests to this target */
  errors: number
  /** Cumulative response time for average calculation */
  totalResponseTime: number
  /** Timestamp of last request to this target */
  lastUsed: number
}

/**
 * Session tracking for sticky session functionality
 * Maintains client-to-target affinity for stateful applications
 */
interface Session {
  /** Target URL this session is bound to */
  targetUrl: string
  /** Session creation timestamp */
  createdAt: number
  /** Session expiration timestamp */
  expiresAt: number
}

/**
 * Production-ready HTTP Load Balancer Implementation
 *
 * Provides intelligent request distribution across multiple backend services
 * with enterprise-grade features for high-availability deployments.
 */
export class HttpLoadBalancer implements LoadBalancer {
  /** Map of target URLs to their internal tracking data */
  private targets = new Map<string, InternalTarget>()
  /** Load balancer configuration */
  private config: LoadBalancerConfig
  /** Current index for round-robin strategy */
  private currentIndex = 0
  /** Total number of requests processed */
  private totalRequests = 0
  /** Health check interval timer */
  private healthCheckInterval?: Timer
  /** Session tracking for sticky sessions */
  private sessions = new Map<string, Session>()
  /** Session cleanup interval timer */
  private sessionCleanupInterval?: Timer
  /** Logger instance for monitoring and debugging */
  private logger: Logger

  /**
   * Initialize the load balancer with configuration and start background services
   *
   * @param config - Load balancer configuration including strategy, targets, and options
   */
  constructor(config: LoadBalancerConfig) {
    this.config = { ...config }
    this.logger = config.logger ?? defaultLogger

    this.logger.info('Load balancer initialized', {
      strategy: config.strategy,
      targetCount: config.targets.length,
      healthCheckEnabled: config.healthCheck?.enabled,
      stickySessionEnabled: config.stickySession?.enabled,
    })

    // Initialize all configured targets
    for (const target of config.targets) {
      this.addTarget(target)
    }

    // Start health monitoring if enabled
    if (config.healthCheck?.enabled) {
      this.startHealthChecks()
    }

    // Start session management if sticky sessions are enabled
    if (config.stickySession?.enabled) {
      this.startSessionCleanup()
    }
  }

  /**
   * Select the optimal target for the incoming request
   *
   * Uses the configured load balancing strategy to distribute requests intelligently
   * across healthy targets. Supports sticky sessions for session affinity.
   *
   * @param request - The incoming HTTP request to route
   * @returns Selected target or null if no healthy targets available
   *
   * @example
   * ```ts
   * const target = loadBalancer.selectTarget(request)
   * if (target) {
   *   // Forward request to target.url
   *   const response = await fetch(`${target.url}${request.url}`)
   * }
   * ```
   */
  selectTarget(request: Request): LoadBalancerTarget | null {
    const startTime = Date.now()
    const healthyTargets = this.getHealthyTargets()

    if (healthyTargets.length === 0) {
      this.logger.warn('No healthy targets available', {
        totalTargets: this.targets.size,
        strategy: this.config.strategy,
      })
      return null
    }

    // Check for sticky session first
    if (this.config.stickySession?.enabled) {
      const stickyTarget = this.getStickyTarget(request)
      if (stickyTarget) {
        this.recordRequest(stickyTarget.url)
        this.logger.logLoadBalancing(this.config.strategy, stickyTarget.url, {
          reason: 'sticky-session',
          duration: Date.now() - startTime,
          healthyTargets: healthyTargets.length,
        })
        return stickyTarget
      }
    }

    let selectedTarget: LoadBalancerTarget | null = null

    try {
      switch (this.config.strategy) {
        case 'round-robin':
          selectedTarget = this.selectRoundRobin(healthyTargets)
          break
        case 'least-connections':
          selectedTarget = this.selectLeastConnections(healthyTargets)
          break
        case 'weighted':
          selectedTarget = this.selectWeighted(healthyTargets)
          break
        case 'random':
          selectedTarget = this.selectRandom(healthyTargets)
          break
        case 'ip-hash':
          selectedTarget = this.selectIpHash(request, healthyTargets)
          break
        default:
          selectedTarget = this.selectRoundRobin(healthyTargets)
      }
    } catch (error) {
      this.logger.error('Error selecting target', error as Error, {
        strategy: this.config.strategy,
        healthyTargets: healthyTargets.length,
      })
      return null
    }

    if (selectedTarget) {
      this.recordRequest(selectedTarget.url)

      // Create sticky session if enabled
      if (this.config.stickySession?.enabled) {
        this.createStickySession(request, selectedTarget)
      }

      this.logger.logLoadBalancing(this.config.strategy, selectedTarget.url, {
        duration: Date.now() - startTime,
        healthyTargets: healthyTargets.length,
        totalRequests: this.totalRequests,
      })
    }

    return selectedTarget
  }

  /**
   * Add a new target to the load balancer pool
   *
   * Initializes tracking data and makes the target available for request routing.
   * Can be used for dynamic scaling by adding targets at runtime.
   *
   * @param target - Target configuration to add
   *
   * @example
   * ```ts
   * loadBalancer.addTarget({
   *   url: 'http://new-service:3000',
   *   weight: 2,
   *   metadata: { region: 'us-west-2' }
   * })
   * ```
   */
  addTarget(target: LoadBalancerTarget): void {
    const internalTarget: InternalTarget = {
      ...target,
      requests: 0,
      errors: 0,
      totalResponseTime: 0,
      lastUsed: 0,
      weight: target.weight ?? 1,
      connections: target.connections ?? 0,
      averageResponseTime: target.averageResponseTime ?? 0,
    }

    this.targets.set(target.url, internalTarget)
  }

  /**
   * Remove a target from the load balancer pool
   *
   * Immediately stops routing requests to the specified target.
   * Useful for maintenance, scaling down, or handling failed services.
   *
   * @param url - Target URL to remove from the pool
   *
   * @example
   * ```ts
   * // Remove a failed service
   * loadBalancer.removeTarget('http://failed-service:3000')
   * ```
   */
  removeTarget(url: string): void {
    this.targets.delete(url)
  }

  /**
   * Update the health status of a specific target
   *
   * Called by health checks or external monitoring systems to mark
   * targets as healthy or unhealthy, affecting routing decisions.
   *
   * @param url - Target URL to update
   * @param healthy - New health status
   *
   * @example
   * ```ts
   * // Mark a target as unhealthy after circuit breaker opens
   * loadBalancer.updateTargetHealth('http://service:3000', false)
   * ```
   */
  updateTargetHealth(url: string, healthy: boolean): void {
    const target = this.targets.get(url)
    if (target) {
      target.healthy = healthy
      target.lastHealthCheck = Date.now()
    }
  }

  /**
   * Get all configured targets with their current status
   *
   * Returns complete target information including health status,
   * connection counts, and performance metrics.
   *
   * @returns Array of all targets with runtime data
   */
  getTargets(): LoadBalancerTarget[] {
    return Array.from(this.targets.values())
  }

  /**
   * Get only healthy targets available for routing
   *
   * Filters out unhealthy targets that should not receive traffic.
   * Used internally by routing strategies and externally for monitoring.
   *
   * @returns Array of healthy targets ready to handle requests
   */
  getHealthyTargets(): LoadBalancerTarget[] {
    return Array.from(this.targets.values()).filter((target) => target.healthy)
  }

  /**
   * Get comprehensive load balancer statistics
   *
   * Provides operational metrics for monitoring, alerting, and capacity planning.
   * Includes per-target statistics and overall performance data.
   *
   * @returns Statistics object with performance and health metrics
   *
   * @example
   * ```ts
   * const stats = loadBalancer.getStats()
   * console.log(`Total requests: ${stats.totalRequests}`)
   * console.log(`Healthy targets: ${stats.healthyTargets}/${stats.totalTargets}`)
   * ```
   */
  getStats(): LoadBalancerStats {
    const targetStats: Record<string, any> = {}

    for (const [url, target] of this.targets.entries()) {
      targetStats[url] = {
        requests: target.requests,
        errors: target.errors,
        averageResponseTime:
          target.requests > 0 ? target.totalResponseTime / target.requests : 0,
        lastUsed: target.lastUsed,
      }
    }

    return {
      totalRequests: this.totalRequests,
      targetStats,
      strategy: this.config.strategy,
      healthyTargets: this.getHealthyTargets().length,
      totalTargets: this.targets.size,
    }
  }

  /**
   * Start health checks
   */
  startHealthChecks(): void {
    if (!this.config.healthCheck?.enabled || this.healthCheckInterval) {
      return
    }

    const interval = this.config.healthCheck.interval
    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks()
    }, interval)
  }

  /**
   * Stop health checks
   */
  stopHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = undefined
    }
  }

  /**
   * Record request and response time for a target
   */
  recordResponse(url: string, responseTime: number, isError = false): void {
    const target = this.targets.get(url)
    if (target) {
      target.totalResponseTime += responseTime
      target.averageResponseTime = target.totalResponseTime / target.requests

      if (isError) {
        target.errors++
      }
    }
  }

  /**
   * Update target connections
   */
  updateConnections(url: string, connections: number): void {
    const target = this.targets.get(url)
    if (target) {
      target.connections = connections
    }
  }

  /**
   * Destroy load balancer and cleanup resources
   */
  destroy(): void {
    this.stopHealthChecks()

    if (this.sessionCleanupInterval) {
      clearInterval(this.sessionCleanupInterval)
      this.sessionCleanupInterval = undefined
    }

    this.targets.clear()
    this.sessions.clear()
  }

  // Private methods for different strategies

  private selectRoundRobin(targets: LoadBalancerTarget[]): LoadBalancerTarget {
    if (targets.length === 0) {
      throw new Error('No targets available for round-robin selection')
    }
    const target = targets[this.currentIndex % targets.length]! // Guaranteed to exist due to length check
    this.currentIndex = (this.currentIndex + 1) % targets.length
    return target
  }

  private selectLeastConnections(
    targets: LoadBalancerTarget[],
  ): LoadBalancerTarget {
    if (targets.length === 0) {
      throw new Error('No targets available for least-connections selection')
    }
    return targets.reduce((least, current) => {
      const leastConnections = least.connections ?? 0
      const currentConnections = current.connections ?? 0
      return currentConnections < leastConnections ? current : least
    })
  }

  private selectWeighted(targets: LoadBalancerTarget[]): LoadBalancerTarget {
    if (targets.length === 0) {
      throw new Error('No targets available for weighted selection')
    }

    const totalWeight = targets.reduce(
      (sum, target) => sum + (target.weight ?? 1),
      0,
    )
    let random = Math.random() * totalWeight

    for (const target of targets) {
      random -= target.weight ?? 1
      if (random <= 0) {
        return target
      }
    }

    return targets[0]! // Fallback - guaranteed to exist due to length check
  }

  private selectRandom(targets: LoadBalancerTarget[]): LoadBalancerTarget {
    if (targets.length === 0) {
      throw new Error('No targets available for random selection')
    }
    const randomIndex = Math.floor(Math.random() * targets.length)
    return targets[randomIndex]! // Guaranteed to exist due to length check
  }

  private selectIpHash(
    request: Request,
    targets: LoadBalancerTarget[],
  ): LoadBalancerTarget {
    if (targets.length === 0) {
      throw new Error('No targets available for IP hash selection')
    }
    // Simple hash based on IP (would need actual IP extraction in real scenario)
    const clientId = this.getClientId(request)
    const hash = this.simpleHash(clientId)
    const index = hash % targets.length
    return targets[index]! // Guaranteed to exist due to length check
  }

  private recordRequest(url: string): void {
    this.totalRequests++
    const target = this.targets.get(url)
    if (target) {
      target.requests++
      target.lastUsed = Date.now()
    }
  }

  private getStickyTarget(request: Request): LoadBalancerTarget | null {
    if (!this.config.stickySession?.enabled) {
      return null
    }

    const sessionId = this.getSessionId(request)
    if (!sessionId) {
      return null
    }

    const session = this.sessions.get(sessionId)
    if (!session || Date.now() > session.expiresAt) {
      return null
    }

    const target = this.targets.get(session.targetUrl)
    return target && target.healthy ? target : null
  }

  private createStickySession(
    request: Request,
    target: LoadBalancerTarget,
  ): void {
    if (!this.config.stickySession?.enabled) {
      return
    }

    const sessionId = this.getSessionId(request) || this.generateSessionId()
    const ttl = this.config.stickySession.ttl ?? 3600000 // 1 hour default

    const session: Session = {
      targetUrl: target.url,
      createdAt: Date.now(),
      expiresAt: Date.now() + ttl,
    }

    this.sessions.set(sessionId, session)
  }

  private getSessionId(request: Request): string | null {
    const cookieName = this.config.stickySession?.cookieName ?? 'lb-session'
    const cookieHeader = request.headers.get('cookie')

    if (!cookieHeader) {
      return null
    }

    const cookies = cookieHeader.split(';').map((c) => c.trim())
    for (const cookie of cookies) {
      const [name, value] = cookie.split('=')
      if (name === cookieName && value !== undefined) {
        return value
      }
    }

    return null
  }

  private generateSessionId(): string {
    const randomPart = crypto.randomBytes(16).toString('hex') // 16 bytes = 32 hex characters
    const timestampPart = Date.now().toString(36)
    return randomPart + timestampPart
  }

  private getClientId(request: Request): string {
    // In real scenario, would extract actual client IP
    // For now, use a combination of headers as identifier
    const userAgent = request.headers.get('user-agent') ?? ''
    const accept = request.headers.get('accept') ?? ''
    return userAgent + accept
  }

  private simpleHash(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash)
  }

  private async performHealthChecks(): Promise<void> {
    const healthCheckConfig = this.config.healthCheck
    if (!healthCheckConfig?.enabled) {
      return
    }

    this.logger.debug('Starting health checks', {
      targetCount: this.targets.size,
      interval: healthCheckConfig.interval,
      timeout: healthCheckConfig.timeout,
    })

    const promises = Array.from(this.targets.values()).map(
      async (target: LoadBalancerTarget) => {
        const startTime = Date.now()
        try {
          const url = new URL(target.url)
          url.pathname = healthCheckConfig.path

          const controller = new AbortController()
          const timeoutId = setTimeout(
            () => controller.abort(),
            healthCheckConfig.timeout,
          )

          const response = await fetch(url.toString(), {
            signal: controller.signal,
            method: 'GET',
          })

          clearTimeout(timeoutId)
          const duration = Date.now() - startTime

          const isHealthy =
            response.status === (healthCheckConfig.expectedStatus ?? 200)

          // Check response body if expected
          if (isHealthy && healthCheckConfig.expectedBody) {
            const body = await response.text()
            const bodyMatches = body.includes(healthCheckConfig.expectedBody)
            this.updateTargetHealth(target.url, bodyMatches)
            this.logger.logHealthCheck(target.url, bodyMatches, duration)
          } else {
            this.updateTargetHealth(target.url, isHealthy)
            this.logger.logHealthCheck(
              target.url,
              isHealthy,
              duration,
              !isHealthy ? new Error(`HTTP ${response.status}`) : undefined,
            )
          }
        } catch (error) {
          const duration = Date.now() - startTime
          this.updateTargetHealth(target.url, false)
          this.logger.logHealthCheck(
            target.url,
            false,
            duration,
            error as Error,
          )
        }
      },
    )

    await Promise.allSettled(promises)
  }

  private startSessionCleanup(): void {
    if (this.sessionCleanupInterval) {
      return
    }

    // Clean up expired sessions every 5 minutes
    this.sessionCleanupInterval = setInterval(() => {
      const now = Date.now()
      for (const [sessionId, session] of this.sessions.entries()) {
        if (now > session.expiresAt) {
          this.sessions.delete(sessionId)
        }
      }
    }, 300000)
  }
}

/**
 * Factory function to create load balancer
 */
export function createLoadBalancer(
  config: LoadBalancerConfig,
): HttpLoadBalancer {
  return new HttpLoadBalancer(config)
}
