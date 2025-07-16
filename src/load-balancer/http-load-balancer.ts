/**
 * Load balancer implementation using basic JavaScript structures
 * Supports multiple strategies: round-robin, least-connections, weighted, random, ip-hash
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
 * Internal target with additional tracking data
 */
interface InternalTarget extends LoadBalancerTarget {
  requests: number
  errors: number
  totalResponseTime: number
  lastUsed: number
}

/**
 * Session tracking for sticky sessions
 */
interface Session {
  targetUrl: string
  createdAt: number
  expiresAt: number
}

/**
 * Load balancer implementation
 */
export class HttpLoadBalancer implements LoadBalancer {
  private targets = new Map<string, InternalTarget>()
  private config: LoadBalancerConfig
  private currentIndex = 0 // For round-robin
  private totalRequests = 0
  private healthCheckInterval?: Timer
  private sessions = new Map<string, Session>() // For sticky sessions
  private sessionCleanupInterval?: Timer
  private logger: Logger

  constructor(config: LoadBalancerConfig) {
    this.config = { ...config }
    this.logger = config.logger ?? defaultLogger

    this.logger.info('Load balancer initialized', {
      strategy: config.strategy,
      targetCount: config.targets.length,
      healthCheckEnabled: config.healthCheck?.enabled,
      stickySessionEnabled: config.stickySession?.enabled,
    })

    // Initialize targets
    for (const target of config.targets) {
      this.addTarget(target)
    }

    // Start health checks if enabled
    if (config.healthCheck?.enabled) {
      this.startHealthChecks()
    }

    // Start session cleanup if sticky sessions enabled
    if (config.stickySession?.enabled) {
      this.startSessionCleanup()
    }
  }

  /**
   * Select next target based on strategy
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
   * Add a target to the load balancer
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
   * Remove a target from the load balancer
   */
  removeTarget(url: string): void {
    this.targets.delete(url)
  }

  /**
   * Update target health status
   */
  updateTargetHealth(url: string, healthy: boolean): void {
    const target = this.targets.get(url)
    if (target) {
      target.healthy = healthy
      target.lastHealthCheck = Date.now()
    }
  }

  /**
   * Get all targets
   */
  getTargets(): LoadBalancerTarget[] {
    return Array.from(this.targets.values())
  }

  /**
   * Get healthy targets only
   */
  getHealthyTargets(): LoadBalancerTarget[] {
    return Array.from(this.targets.values()).filter((target) => target.healthy)
  }

  /**
   * Get load balancer statistics
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
