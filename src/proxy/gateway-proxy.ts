import type { ProxyHandler, ProxyInstance } from "../interfaces/proxy.ts";
import type { ProxyOptions, ProxyRequestOptions, CircuitState } from "fetch-gate";
import { FetchProxy } from "fetch-gate/lib/proxy";
import type { ZeroRequest } from "../interfaces/middleware.ts";

/**
 * GatewayProxy wraps fetch-gate's FetchProxy to support ZeroRequest and gateway-specific features
 */
export class GatewayProxy implements ProxyHandler {
  private fetchProxy: FetchProxy;

  constructor(options: ProxyOptions) {
    this.fetchProxy = new FetchProxy(options);
  }

  async proxy(req: ZeroRequest, source?: string, opts?: ProxyRequestOptions): Promise<Response> {
    return this.fetchProxy.proxy(req as Request, source, opts);
  }

  close(): void {
    this.fetchProxy.close();
  }

  getCircuitBreakerState(): CircuitState {
    return this.fetchProxy.getCircuitBreakerState();
  }

  getCircuitBreakerFailures(): number {
    return this.fetchProxy.getCircuitBreakerFailures();
  }

  clearURLCache(): void {
    this.fetchProxy.clearURLCache();
  }
}

/**
 * Factory function to create a ProxyInstance for gateway use
 */
export function createGatewayProxy(options: ProxyOptions): ProxyInstance {
  const handler = new GatewayProxy(options);
  return {
    proxy: handler.proxy.bind(handler),
    close: handler.close.bind(handler),
    getCircuitBreakerState: handler.getCircuitBreakerState.bind(handler),
    getCircuitBreakerFailures: handler.getCircuitBreakerFailures.bind(handler),
    clearURLCache: handler.clearURLCache.bind(handler),
  };
}
