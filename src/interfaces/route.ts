import type {
  AfterCircuitBreakerHook,
  BeforeCircuitBreakerHook,
  CircuitBreakerOptions,
} from 'fetch-gate'
import type { LoadBalancerConfig } from './load-balancer'
import type {
  JWTAuthOptions,
  RateLimitOptions,
  RequestHandler,
  ZeroRequest,
} from './middleware'

/**
 * Route configuration interface for defining individual routes in the gateway
 * Each route can handle requests through either direct handlers or by proxying to backend services
 */
export interface RouteConfig {
  /**
   * URL pattern to match incoming requests
   * Supports wildcards (*) and parameters (:param)
   * @example
   * - '/users' - Exact match
   * - '/users/*' - Wildcard match
   * - '/users/:id' - Parameter match
   * - '/api/v1/users/:id/posts/:postId' - Multiple parameters
   */
  pattern: string

  /**
   * Target service URL for proxying requests
   * When specified, requests matching this route will be forwarded to this URL
   * @example 'http://user-service:3000' or 'https://api.example.com'
   */
  target?: string

  /**
   * Direct route handler function (alternative to proxying)
   * Use this for handling requests locally instead of forwarding to another service
   * @example
   * ```ts
   * handler: (req) => new Response('Hello World')
   * ```
   */
  handler?: RequestHandler

  /**
   * HTTP methods allowed for this route
   * @default ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']
   * @example ['GET', 'POST'] - Only allow GET and POST requests
   */
  methods?: string[]

  /**
   * Route-specific middleware functions
   * These middlewares run only for this route, in addition to global middlewares
   * @example [authMiddleware, validationMiddleware]
   */
  middlewares?: RequestHandler[]

  /**
   * Request timeout for this route in milliseconds
   * Overrides global timeout settings
   * @default 30000 (30 seconds)
   */
  timeout?: number

  /**
   * Proxy configuration options (follows fetch-gate pattern)
   * Controls how requests are forwarded to backend services
   */
  proxy?: {
    /**
     * Additional headers to include in proxied requests
     * These headers are merged with the original request headers
     * @example { 'X-Forwarded-For': 'gateway', 'Authorization': 'Bearer token' }
     */
    headers?: Record<string, string>

    /**
     * Request timeout in milliseconds for proxy requests
     * @default 30000 (30 seconds)
     */
    timeout?: number

    /**
     * Whether to automatically follow HTTP redirects
     * @default true
     */
    followRedirects?: boolean

    /**
     * Maximum number of redirects to follow
     * @default 5
     */
    maxRedirects?: number

    /**
     * Path rewriting rules for modifying the request path before forwarding
     * @example
     * - Object: { '^/api/v1': '/v1', '^/old': '/new' }
     * - Function: (path) => path.replace('/api', '')
     */
    pathRewrite?: Record<string, string> | ((path: string) => string)

    /**
     * Additional query parameters to append to proxied requests
     * @example { 'version': '1.0', 'source': 'gateway' } or 'version=1.0&source=gateway'
     */
    queryString?: Record<string, any> | string

    /**
     * Custom fetch options for the proxy request
     * Allows fine-grained control over the request behavior
     */
    request?: RequestInit
  }

  /**
   * Lifecycle hooks for request/response processing (follows fetch-gate pattern)
   * Provides fine-grained control over the proxy request lifecycle
   */
  hooks?: {
    /**
     * Called before the request is sent to the target service
     * Allows modification of request or proxy options
     * @param req - The incoming request object
     * @param opts - The proxy configuration options
     */
    beforeRequest?: (
      req: ZeroRequest,
      opts: RouteConfig['proxy'],
    ) => void | Promise<void>

    /**
     * Called after the response is received from the target service
     * Allows inspection or modification of the response
     * @param req - The original request object
     * @param res - The response from the target service
     * @param body - The response body stream (if available)
     */
    afterResponse?: (
      req: ZeroRequest,
      res: Response,
      body?: ReadableStream | null,
    ) => void | Promise<void>

    /**
     * Called when an error occurs during request processing
     * Can return a custom error response
     * @param req - The original request object
     * @param error - The error that occurred
     * @returns Optional custom error response
     */
    onError?: (
      req: Request,
      error: Error,
    ) => void | Promise<void> | Promise<Response>

    /**
     * Called before the circuit breaker executes the request
     * Allows inspection of circuit breaker state
     */
    beforeCircuitBreakerExecution?: BeforeCircuitBreakerHook

    /**
     * Called after the circuit breaker completes (success or failure)
     * Provides access to execution results and metrics
     */
    afterCircuitBreakerExecution?: AfterCircuitBreakerHook
  }

  /**
   * Circuit breaker configuration for fault tolerance
   * Automatically handles service failures by opening the circuit when error thresholds are exceeded
   */
  circuitBreaker?: CircuitBreakerOptions

  /**
   * Load balancing configuration for distributing requests across multiple targets
   * When multiple targets are specified, requests will be distributed according to the strategy
   */
  loadBalancer?: Omit<LoadBalancerConfig, 'logger'>

  /**
   * JWT authentication configuration for this route
   * Enables token-based authentication for protected endpoints
   */
  auth?: JWTAuthOptions

  /**
   * Rate limiting configuration specific to this route
   * Controls the number of requests allowed per time window
   */
  rateLimit?: RateLimitOptions

  /**
   * Route metadata for documentation and introspection
   * Useful for API documentation generation and monitoring
   */
  meta?: {
    /**
     * Human-readable name for this route
     * @example 'Get User Profile'
     */
    name?: string
    /**
     * Description of what this route does
     * @example 'Retrieves user profile information by user ID'
     */
    description?: string
    /**
     * API version for this route
     * @example 'v1.2.0'
     */
    version?: string
    /**
     * Tags for categorizing routes
     * @example ['users', 'profile', 'public-api']
     */
    tags?: string[]
  }
}
