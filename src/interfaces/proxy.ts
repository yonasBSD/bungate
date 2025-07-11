/**
 * Import and re-export fetch-gate types directly from the package
 * This ensures 100% compatibility and eliminates duplication
 */
import type {
  ProxyOptions,
  ProxyRequestOptions,
  CircuitBreakerOptions,
  BeforeRequestHook,
  AfterResponseHook,
  BeforeCircuitBreakerHook,
  AfterCircuitBreakerHook,
  ErrorHook,
  CircuitBreakerResult,
  CircuitState,
} from "fetch-gate";

// Import the FetchProxy class for advanced proxy customization
import type { FetchProxy } from "fetch-gate/lib/proxy";

// Import the CircuitBreaker class for advanced circuit breaker customization
import type { CircuitBreaker as FetchGateCircuitBreaker } from "fetch-gate/lib/circuit-breaker";

// Import utility types and logger from fetch-gate
import type { ProxyLogger, LogContext } from "fetch-gate/lib/logger";

export type {
  ProxyOptions,
  ProxyRequestOptions,
  CircuitBreakerOptions,
  BeforeRequestHook,
  AfterResponseHook,
  BeforeCircuitBreakerHook,
  AfterCircuitBreakerHook,
  ErrorHook,
  CircuitBreakerResult,
  CircuitState,
  FetchProxy,
  FetchGateCircuitBreaker,
  ProxyLogger,
  LogContext,
};

// Import ZeroRequest from our middleware types for gateway-specific interfaces
import type { ZeroRequest } from "./middleware.ts";

/**
 * Gateway-specific proxy handler interface
 * Extends fetch-gate functionality with ZeroRequest support
 */
export interface ProxyHandler {
  /**
   * Proxy a request to target (gateway-specific with ZeroRequest)
   */
  proxy(req: ZeroRequest, source?: string, opts?: ProxyRequestOptions): Promise<Response>;

  /**
   * Close proxy instance
   */
  close(): void;

  /**
   * Get circuit breaker state
   */
  getCircuitBreakerState(): CircuitState;

  /**
   * Get circuit breaker failures
   */
  getCircuitBreakerFailures(): number;

  /**
   * Clear URL cache
   */
  clearURLCache(): void;
}

/**
 * Gateway-specific proxy factory function return type
 */
export interface ProxyInstance {
  proxy: ProxyHandler["proxy"];
  close: ProxyHandler["close"];
  getCircuitBreakerState: ProxyHandler["getCircuitBreakerState"];
  getCircuitBreakerFailures: ProxyHandler["getCircuitBreakerFailures"];
  clearURLCache: ProxyHandler["clearURLCache"];
}
