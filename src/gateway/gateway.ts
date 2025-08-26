/**
 * Bungate API Gateway Implementation
 *
 * A high-performance, production-ready API gateway built on Bun runtime with 0http-bun router.
 * Provides comprehensive routing, middleware support, load balancing, and proxy capabilities
 * for microservices architectures and API management.
 *
 * Key Features:
 * - Ultra-fast HTTP routing with parameter and wildcard support
 * - Built-in load balancing with multiple strategies
 * - Circuit breaker pattern for fault tolerance
 * - JWT authentication and CORS support
 * - Request/response transformation and validation
 * - Comprehensive logging and metrics collection
 * - Multi-process clustering for high availability
 * - Hot reload and graceful shutdown capabilities
 *
 * @example
 * ```ts
 * const gateway = new BunGateway({
 *   server: { port: 3000 },
 *   routes: [
 *     {
 *       pattern: '/api/users/*',
 *       target: 'http://user-service:3000',
 *       loadBalancer: { strategy: 'round-robin' }
 *     }
 *   ],
 *   cors: { origin: '*' },
 *   auth: { secret: 'your-jwt-secret' }
 * })
 *
 * await gateway.listen(3000)
 * ```
 */

import http from '0http-bun'
import type { Server } from 'bun'
import type { Gateway, GatewayConfig } from '../interfaces/gateway'
import type { RouteConfig } from '../interfaces/route'
import type {
  RequestHandler,
  ZeroRequest,
  IRouter,
  IRouterConfig,
} from '../interfaces/middleware'

// Import 0http-bun middlewares
import {
  createLogger,
  createJWTAuth,
  createCORS,
  createBodyParser,
  createPrometheusMiddleware,
  type JWTAuthOptions,
  type CORSOptions,
  type PrometheusMiddlewareOptions,
  createRateLimit,
} from '0http-bun/lib/middleware'

// Import our custom implementations
import { createGatewayProxy } from '../proxy/gateway-proxy'
import { HttpLoadBalancer } from '../load-balancer/http-load-balancer'
import type { ProxyInstance } from '../interfaces/proxy'
import { ClusterManager } from '../cluster/cluster-manager'

/**
 * Production-grade API Gateway implementation
 *
 * Orchestrates request routing, middleware processing, and backend communication
 * with enterprise features for scalability and reliability.
 */
export class BunGateway implements Gateway {
  /** Gateway configuration including routes, middleware, and server settings */
  private config: GatewayConfig
  /** 0http-bun router instance for high-performance request routing */
  private router: IRouter
  /** Bun server instance when using built-in server */
  private server: Server | null = null
  /** Map of route patterns to their proxy instances */
  private proxies: Map<string, ProxyInstance> = new Map()
  /** Map of route patterns to their load balancer instances */
  private loadBalancers: Map<string, HttpLoadBalancer> = new Map()
  /** Cluster manager for multi-process deployments */
  private clusterManager: ClusterManager | null = null
  /** Flag indicating if this process is the cluster master */
  private isClusterMaster: boolean = false

  /**
   * Initialize the API Gateway with comprehensive configuration
   *
   * Sets up routing, middleware chain, clustering, and backend services.
   * Automatically configures load balancers and proxy instances for defined routes.
   *
   * @param config - Gateway configuration object with routes, middleware, and server options
   */
  constructor(config: GatewayConfig = {}) {
    this.config = config
    this.isClusterMaster = !process.env.CLUSTER_WORKER

    // Initialize cluster manager for multi-process deployment
    if (this.config.cluster?.enabled && this.isClusterMaster) {
      this.clusterManager = new ClusterManager(
        this.config.cluster,
        this.config.logger,
        process.argv[1],
      )
    }

    // Create 0http-bun router with configuration
    const routerConfig: IRouterConfig = {
      // Map gateway config to router config
      defaultRoute: config.defaultRoute
        ? (req: ZeroRequest) => config.defaultRoute!(req)
        : undefined,
      errorHandler: config.errorHandler,
      port: config.server?.port,
    }

    const { router } = http(routerConfig)
    this.router = router

    // Create logger middleware if configured
    this.router.use(
      createLogger({
        // @ts-ignore
        logger: config.logger?.pino,
        serializers: config.logger?.getSerializers(),
      }),
    )

    // Add Prometheus metrics middleware if enabled and NOT in development
    if (
      !this.config.server?.development &&
      this.config.metrics?.enabled === true
    ) {
      const prometheusOptions: PrometheusMiddlewareOptions = {
        excludePaths: ['/health', '/metrics', '/favicon.ico'],
        collectDefaultMetrics:
          this.config.metrics?.collectDefaultMetrics ?? true,
      }
      this.router.use(createPrometheusMiddleware(prometheusOptions))
    }

    // Add authentication middleware if configured
    if (config.auth) {
      this.router.use(createJWTAuth(config.auth))
    }

    // Add body parser middleware
    if (config.bodyParser) {
      this.router.use(createBodyParser(config.bodyParser))
    }

    // Register initial routes if provided
    if (config.routes) {
      for (const route of config.routes) {
        if (this.config.proxy) {
          route.proxy = {
            ...this.config.proxy,
            ...route.proxy,
          }
        }
        this.addRoute(route)
      }
    }
  }

  fetch = (req: Request) => {
    // 0http-bun expects a Request, returns a Response
    return this.router.fetch(req)
  }

  use(...args: any[]): this {
    this.router.use(...args)
    return this
  }

  on(method: string, pattern: string, ...handlers: RequestHandler[]): this {
    // Convert string method to Methods type (uppercase)
    const upperMethod = method.toUpperCase() as any
    this.router.on(upperMethod, pattern, ...handlers)
    return this
  }

  get(pattern: string, ...handlers: RequestHandler[]): this {
    return this.on('GET', pattern, ...handlers)
  }
  post(pattern: string, ...handlers: RequestHandler[]): this {
    return this.on('POST', pattern, ...handlers)
  }
  put(pattern: string, ...handlers: RequestHandler[]): this {
    return this.on('PUT', pattern, ...handlers)
  }
  patch(pattern: string, ...handlers: RequestHandler[]): this {
    return this.on('PATCH', pattern, ...handlers)
  }
  delete(pattern: string, ...handlers: RequestHandler[]): this {
    return this.on('DELETE', pattern, ...handlers)
  }
  head(pattern: string, ...handlers: RequestHandler[]): this {
    return this.on('HEAD', pattern, ...handlers)
  }
  options(pattern: string, ...handlers: RequestHandler[]): this {
    return this.on('OPTIONS', pattern, ...handlers)
  }
  all(pattern: string, ...handlers: RequestHandler[]): this {
    // For "all" methods, we need to register for each HTTP method
    const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']
    for (const method of methods) {
      this.router.on(method as any, pattern, ...handlers)
    }
    return this
  }

  addRoute(route: RouteConfig): void {
    const methods =
      route.methods && route.methods.length > 0 ? route.methods : ['GET']

    for (const method of methods) {
      // Build middleware chain for this route
      const middlewares: RequestHandler[] = []

      // Add route-specific middlewares first
      if (route.middlewares) {
        middlewares.push(...route.middlewares)
      }

      // Add CORS middleware if configured
      if (this.config.cors) {
        const corsOptions: CORSOptions = {
          origin: this.config.cors.origin,
          methods: this.config.cors.methods,
          allowedHeaders: this.config.cors.allowedHeaders,
          exposedHeaders: this.config.cors.exposedHeaders,
          credentials: this.config.cors.credentials,
          maxAge: this.config.cors.maxAge,
        }
        middlewares.push(createCORS(corsOptions))
      }

      // Add authentication middleware if configured
      if (route.auth) {
        const jwtOptions: JWTAuthOptions = {
          secret: route.auth.secret,
          jwksUri: route.auth.jwksUri,
          jwtOptions: {
            algorithms: route.auth.algorithms,
            issuer: route.auth.issuer,
            audience: route.auth.audience,
          },
          optional: route.auth.optional,
          excludePaths: route.auth.excludePaths,
        }
        middlewares.push(createJWTAuth(jwtOptions))
      }

      // Add rate limiting middleware if configured
      if (route.rateLimit) {
        middlewares.push(createRateLimit(route.rateLimit))
      }

      // Create load balancer if configured
      let loadBalancer: HttpLoadBalancer | undefined
      if (
        route.loadBalancer?.targets &&
        route.loadBalancer.targets.length > 0
      ) {
        const balancerKey = `${route.pattern}-${method}`
        loadBalancer = new HttpLoadBalancer({
          logger: this.config.logger?.child({ component: 'HttpLoadBalancer' }),
          ...route.loadBalancer,
        })
        this.loadBalancers.set(balancerKey, loadBalancer)
      }

      // Create proxy if target is specified
      let proxy: ProxyInstance | undefined
      const proxyKey = `${route.pattern}-${method}`
      const baseUrl = route.target

      proxy = createGatewayProxy({
        logger: this.config.logger?.pino.child({ component: 'GatewayProxy' }),
        base: baseUrl,
        timeout: route.timeout || route.proxy?.timeout || 30000,
        followRedirects: route.proxy?.followRedirects !== false,
        maxRedirects: route.proxy?.maxRedirects || 5,
        headers: route.proxy?.headers || {},
        circuitBreaker: route.circuitBreaker,
      })
      this.proxies.set(proxyKey, proxy)

      // Create the final handler
      const finalHandler: RequestHandler = async (req: ZeroRequest) => {
        try {
          // Call hooks
          if (route.hooks?.beforeRequest) {
            await route.hooks.beforeRequest(req, route.proxy)
          }

          let response: Response

          // Handle direct handler
          if (route.handler) {
            // Route handlers might not take `next` parameter, so we need to adapt
            response = await (route.handler as any)(req)
          }
          // Handle proxy with load balancer
          else if (loadBalancer && proxy) {
            const target = loadBalancer.selectTarget(req as Request)
            if (!target) {
              throw new Error('No healthy targets available')
            }

            // Apply path rewriting if configured
            let targetPath = new URL(req.url).pathname
            if (route.proxy?.pathRewrite) {
              if (typeof route.proxy.pathRewrite === 'function') {
                targetPath = route.proxy.pathRewrite(targetPath)
              } else {
                for (const [pattern, replacement] of Object.entries(
                  route.proxy.pathRewrite,
                )) {
                  targetPath = targetPath.replace(
                    new RegExp(pattern),
                    replacement,
                  )
                }
              }
            }

            // Measure end-to-end time to update latency metrics in the load balancer
            const startedAt = Date.now()
            increaseTargetConnectionsIfLeastConnections(
              route.loadBalancer?.strategy,
              target,
            )
            response = await proxy.proxy(req, target.url + targetPath, {
              afterCircuitBreakerExecution:
                route.hooks?.afterCircuitBreakerExecution,
              beforeCircuitBreakerExecution:
                route.hooks?.beforeCircuitBreakerExecution,
              afterResponse: (
                req: Request,
                res: Response,
                body?: ReadableStream | null,
              ) => {
                decreaseTargetConnectionsIfLeastConnections(
                  route.loadBalancer?.strategy,
                  target,
                )
                // Update latency stats for strategies like 'latency' and as tie-breakers
                try {
                  const duration = Date.now() - startedAt
                  loadBalancer.recordResponse(target.url, duration, false)
                } catch {}
              },
              onError: (req: Request, error: Error) => {
                decreaseTargetConnectionsIfLeastConnections(
                  route.loadBalancer?.strategy,
                  target,
                )
                // Record error with latency to penalize target appropriately
                try {
                  const duration = Date.now() - startedAt
                  loadBalancer.recordResponse(target.url, duration, true)
                } catch {}
                if (route.hooks?.onError) {
                  route.hooks.onError!(req, error)
                }
              },
            })
          }
          // Handle simple proxy
          else if (route.target && proxy) {
            let targetPath = new URL(req.url).pathname

            // Apply path rewriting if configured
            if (route.proxy?.pathRewrite) {
              if (typeof route.proxy.pathRewrite === 'function') {
                targetPath = route.proxy.pathRewrite(targetPath)
              } else {
                for (const [pattern, replacement] of Object.entries(
                  route.proxy.pathRewrite,
                )) {
                  targetPath = targetPath.replace(
                    new RegExp(pattern),
                    replacement,
                  )
                }
              }
            }

            response = await proxy.proxy(req, targetPath, {
              afterCircuitBreakerExecution:
                route.hooks?.afterCircuitBreakerExecution,
              beforeCircuitBreakerExecution:
                route.hooks?.beforeCircuitBreakerExecution,
              onError: (req: Request, error: Error) => {
                if (route.hooks?.onError) {
                  return route.hooks.onError!(req, error)
                }
              },
            })
          }
          // No handler or proxy configured
          else {
            response = new Response('Not implemented', { status: 501 })
          }

          // Call hooks
          if (route.hooks?.afterResponse) {
            await route.hooks.afterResponse(req, response, response.body)
          }

          return response
        } catch (error) {
          // Call error hook
          if (route.hooks?.onError) {
            await route.hooks.onError(req, error as Error)
          }

          // Re-throw error to be handled by global error handler
          throw error
        }
      }

      // Add all middlewares and final handler to the route
      this.on(method, route.pattern, ...middlewares, finalHandler)
    }
  }

  private getClientIP(req: ZeroRequest): string {
    // Try various headers for client IP
    const headers = req.headers
    return (
      headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      headers.get('x-real-ip') ||
      headers.get('cf-connecting-ip') ||
      headers.get('x-client-ip') ||
      'unknown'
    )
  }

  removeRoute(pattern: string): void {
    // Not implemented in 0http-bun yet
    // Could be a no-op or throw
    throw new Error('removeRoute is not implemented in 0http-bun')
  }

  getConfig(): GatewayConfig {
    return this.config
  }

  async listen(port?: number): Promise<Server> {
    const listenPort = port || this.config.server?.port || 3000

    // If cluster mode is enabled and we're the master, start the cluster
    if (this.clusterManager && this.isClusterMaster) {
      this.config.logger?.info('Starting cluster manager')
      await this.clusterManager.start()

      // Master process doesn't serve requests directly in cluster mode
      // Instead, it manages worker processes
      return new Promise(() => {}) as Promise<Server>
    }

    // Worker process or single process mode
    this.server = Bun.serve({
      port: listenPort,
      fetch: this.fetch,
      // Enable port sharing for cluster mode
      reusePort: !!process.env.CLUSTER_WORKER,
    })

    if (process.env.CLUSTER_WORKER) {
      this.config.logger?.info(
        `Worker ${process.env.CLUSTER_WORKER_ID} listening on port ${listenPort}`,
      )
    } else {
      this.config.logger?.info(`Server listening on port ${listenPort}`)
    }

    return this.server
  }

  async close(): Promise<void> {
    if (this.clusterManager && this.isClusterMaster) {
      // In cluster mode, the cluster manager handles shutdown
      // This will be handled by the cluster manager's signal handlers
      return
    }

    if (this.server) {
      this.server.stop()
      this.server = null
    }
  }
}

function increaseTargetConnectionsIfLeastConnections(
  strategy: string | undefined,
  target: any,
): void {
  if (
    (strategy === 'least-connections' ||
      strategy === 'weighted-least-connections' ||
      strategy === 'p2c' ||
      strategy === 'power-of-two-choices') &&
    target.connections !== undefined
  ) {
    target.connections++
  }
}

function decreaseTargetConnectionsIfLeastConnections(
  strategy: string | undefined,
  target: any,
): void {
  if (
    (strategy === 'least-connections' ||
      strategy === 'weighted-least-connections' ||
      strategy === 'p2c' ||
      strategy === 'power-of-two-choices') &&
    target.connections !== undefined
  ) {
    target.connections--
  }
}
