/**
 * BunGate - High-performance API Gateway built on Bun.js
 *
 * Main entry point for the BunGate library.
 * Exports all core classes, interfaces, and utilities.
 */

// ==================== CORE CLASSES ====================

// Gateway
export { BunGateway } from "./src/gateway/gateway.ts";

// Load Balancer
export { HttpLoadBalancer, createLoadBalancer } from "./src/load-balancer/http-load-balancer.ts";

// Proxy
export { GatewayProxy, createGatewayProxy } from "./src/proxy/gateway-proxy.ts";

// Logger
export { BunGateLogger, createLogger } from "./src/logger/pino-logger.ts";

// ==================== INTERFACES & TYPES ====================

// Core Gateway Interface
export type { Gateway, GatewayConfig } from "./src/interfaces/gateway.ts";

// Route Management
export type { RouteConfig } from "./src/interfaces/route.ts";

// Middleware System
export type {
  ZeroRequest,
  StepFunction,
  RequestHandler,
  ParsedFile,
  IRouter,
  IRouterConfig,
  MiddlewareManager,
  // All 0http-bun middleware types
  LoggerOptions,
  JWTAuthOptions,
  APIKeyAuthOptions,
  JWKSLike,
  TokenExtractionOptions,
  RateLimitOptions,
  MemoryStore,
  CORSOptions,
  BodyParserOptions,
  JSONParserOptions,
  TextParserOptions,
  URLEncodedParserOptions,
  MultipartParserOptions,
  PrometheusMetrics,
  PrometheusMiddlewareOptions,
  MetricsHandlerOptions,
  PrometheusIntegration,
  // Trouter types
  Trouter,
  Pattern,
  Methods,
} from "./src/interfaces/middleware.ts";

// Proxy Functionality
export type {
  ProxyOptions,
  ProxyHandler,
  ProxyInstance,
  ProxyRequestOptions,
  CircuitBreakerOptions,
  CircuitBreakerResult,
  BeforeRequestHook,
  AfterResponseHook,
  BeforeCircuitBreakerHook,
  AfterCircuitBreakerHook,
  ErrorHook,
  FetchProxy,
  FetchGateCircuitBreaker,
  ProxyLogger,
  LogContext,
  CircuitState,
} from "./src/interfaces/proxy.ts";

// Load Balancing
export type {
  LoadBalancer,
  LoadBalancerConfig,
  LoadBalancerTarget,
  LoadBalancerStats,
} from "./src/interfaces/load-balancer.ts";

// Logging
export type { Logger, LoggerConfig, LogEntry } from "./src/interfaces/logger.ts";

// ==================== CONVENIENCE EXPORTS ====================

// Re-export all interfaces from the main interfaces index
export * from "./src/interfaces/index.ts";

// ==================== DEFAULT EXPORT ====================

// Default export for the main gateway class
export { BunGateway as default } from "./src/gateway/gateway.ts";

// ==================== UTILITIES ====================

// Import for internal use in utility functions
import { BunGateway } from "./src/gateway/gateway.ts";
import type { GatewayConfig } from "./src/interfaces/gateway.ts";

/**
 * Create a new BunGate instance with default configuration
 * @param config Gateway configuration options
 * @returns BunGateway instance
 */
export function createGateway(config?: GatewayConfig): BunGateway {
  return new BunGateway(config);
}

/**
 * Library metadata
 */
export const BUNGATE_INFO = {
  name: "BunGate",
  description: "High-performance API Gateway built on Bun.js",
  author: "21no.de",
  license: "MIT",
  homepage: "https://github.com/BackendStack21/bungate",
} as const;
