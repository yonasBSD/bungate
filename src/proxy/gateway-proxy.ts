/**
 * Gateway Proxy Implementation
 *
 * A high-performance HTTP proxy built on fetch-gate with enhanced gateway features.
 * Provides intelligent request forwarding, circuit breaker pattern, connection pooling,
 * and comprehensive monitoring for reliable microservices communication.
 *
 * Features:
 * - Circuit breaker protection against cascading failures
 * - Connection pooling and keep-alive for performance
 * - Request/response transformation capabilities
 * - Comprehensive error handling and retry logic
 * - Real-time health monitoring and metrics
 * - Support for ZeroRequest enhanced context
 *
 * @example
 * ```ts
 * const proxy = createGatewayProxy({
 *   timeout: 5000,
 *   circuitBreaker: {
 *     errorThreshold: 50,
 *     resetTimeout: 30000
 *   },
 *   hooks: {
 *     beforeRequest: (req) => {
 *       req.headers.set('X-Gateway', 'bungate')
 *     }
 *   }
 * })
 *
 * const response = await proxy.proxy(request, 'http://backend-service:3000')
 * ```
 */

import type { ProxyHandler, ProxyInstance } from '../interfaces/proxy'
import type {
  ProxyOptions,
  ProxyRequestOptions,
  CircuitState,
} from 'fetch-gate'
import { FetchProxy } from 'fetch-gate/lib/proxy'
import type { ZeroRequest } from '../interfaces/middleware'

/**
 * Gateway-enhanced proxy handler with ZeroRequest support
 *
 * Wraps fetch-gate's FetchProxy to provide seamless integration with the gateway's
 * enhanced request context and middleware pipeline while maintaining full compatibility
 * with fetch-gate's advanced features.
 */
export class GatewayProxy implements ProxyHandler {
  /** Underlying fetch-gate proxy instance for core functionality */
  private fetchProxy: FetchProxy

  /**
   * Initialize the gateway proxy with fetch-gate options
   *
   * @param options - Proxy configuration including timeouts, circuit breaker, and hooks
   */
  constructor(options: ProxyOptions) {
    this.fetchProxy = new FetchProxy(options)
  }

  /**
   * Proxy a request to the target service with gateway enhancements
   *
   * @param req - Enhanced ZeroRequest with gateway context
   * @param source - Target service URL or identifier
   * @param opts - Request-specific proxy options
   * @returns Promise resolving to the proxied response
   */
  async proxy(
    req: ZeroRequest,
    source?: string,
    opts?: ProxyRequestOptions,
  ): Promise<Response> {
    // Cast ZeroRequest to standard Request for fetch-gate compatibility
    return this.fetchProxy.proxy(req as Request, source, opts)
  }

  /**
   * Gracefully close the proxy and clean up resources
   * Closes connection pools and cancels pending requests
   */
  close(): void {
    this.fetchProxy.close()
  }

  /**
   * Get current circuit breaker state for monitoring
   *
   * @returns Current circuit state (CLOSED, OPEN, HALF_OPEN)
   */
  getCircuitBreakerState(): CircuitState {
    return this.fetchProxy.getCircuitBreakerState()
  }

  /**
   * Get number of consecutive failures in circuit breaker
   *
   * @returns Failure count contributing to circuit state
   */
  getCircuitBreakerFailures(): number {
    return this.fetchProxy.getCircuitBreakerFailures()
  }

  /**
   * Clear internal URL cache for DNS and connection pooling
   * Useful for forcing reconnection after service updates
   */
  clearURLCache(): void {
    this.fetchProxy.clearURLCache()
  }
}

/**
 * Factory function to create a ProxyInstance for gateway integration
 *
 * Creates a simplified proxy interface optimized for gateway usage patterns.
 * Provides all essential proxy methods in a convenient, injectable format.
 *
 * @param options - Proxy configuration options
 * @returns ProxyInstance with proxy methods for gateway integration
 *
 * @example
 * ```ts
 * const proxy = createGatewayProxy({
 *   timeout: 10000,
 *   circuitBreaker: { errorThreshold: 5, resetTimeout: 60000 }
 * })
 *
 * // Use in route handler
 * const response = await proxy.proxy(req, 'http://api.service.com')
 * ```
 */
export function createGatewayProxy(options: ProxyOptions): ProxyInstance {
  const handler = new GatewayProxy(options)
  return {
    proxy: handler.proxy.bind(handler),
    close: handler.close.bind(handler),
    getCircuitBreakerState: handler.getCircuitBreakerState.bind(handler),
    getCircuitBreakerFailures: handler.getCircuitBreakerFailures.bind(handler),
    clearURLCache: handler.clearURLCache.bind(handler),
  }
}
