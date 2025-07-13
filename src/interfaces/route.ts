import type { AfterCircuitBreakerHook, BeforeCircuitBreakerHook, CircuitBreakerOptions } from "fetch-gate";
import type { LoadBalancerConfig } from "./load-balancer.ts";
import type { JWTAuthOptions, RateLimitOptions, RequestHandler, ZeroRequest } from "./middleware.ts";

export interface RouteConfig {
  /**
   * Route path pattern
   */
  pattern: string;

  /**
   * Target service URL for proxying
   */
  target?: string;

  /**
   * Direct route handler (alternative to proxy)
   */
  handler?: RequestHandler;

  /**
   * HTTP methods allowed for this route
   */
  methods?: string[];

  /**
   * Route-specific middlewares
   */
  middlewares?: RequestHandler[];

  /**
   * Route-specific timeout in milliseconds
   */
  timeout?: number;

  /**
   * Proxy configuration (following fetch-gate pattern)
   */
  proxy?: {
    /**
     * Custom headers to add to proxied requests
     */
    headers?: Record<string, string>;

    /**
     * Request timeout in milliseconds
     */
    timeout?: number;

    /**
     * Whether to follow redirects
     */
    followRedirects?: boolean;

    /**
     * Maximum number of redirects to follow
     */
    maxRedirects?: number;

    /**
     * Path rewriting rules
     */
    pathRewrite?: Record<string, string> | ((path: string) => string);

    /**
     * Query parameters to add
     */
    queryString?: Record<string, any> | string;

    /**
     * Custom fetch options
     */
    request?: RequestInit;
  };

  /**
   * Hooks (following fetch-gate pattern)
   */
  hooks?: {
    /**
     * Called before request is sent to target
     */
    beforeRequest?: (req: ZeroRequest, opts: RouteConfig["proxy"]) => void | Promise<void>;

    /**
     * Called after response is received
     */
    afterResponse?: (req: ZeroRequest, res: Response, body?: ReadableStream | null) => void | Promise<void>;

    /**
     * Called when an error occurs
     */
    onError?: (req: Request, error: Error) => void | Promise<void> | Promise<Response>;

    /** Hook called before the circuit breaker executes the request */
    beforeCircuitBreakerExecution?: BeforeCircuitBreakerHook;

    /** Hook called after the circuit breaker completes (success or failure) */
    afterCircuitBreakerExecution?: AfterCircuitBreakerHook;
  };

  /**
   * Circuit breaker configuration
   */
  circuitBreaker?: CircuitBreakerOptions;

  /**
   * Load balancing configuration
   */
  loadBalancer?: Omit<LoadBalancerConfig, "logger">;

  /**
   * JWT Authentication configuration
   */
  auth?: JWTAuthOptions;

  /**
   * Rate limiting configuration (using 0http-bun's rate limiter)
   */
  rateLimit?: RateLimitOptions;

  /**
   * Route metadata
   */
  meta?: {
    name?: string;
    description?: string;
    version?: string;
    tags?: string[];
  };
}
