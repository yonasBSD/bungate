/**
 * Bungate API Gateway - TypeScript Interface Definitions
 *
 * This module exports all the TypeScript interfaces and types used throughout
 * the Bungate API Gateway. These interfaces provide type safety and excellent
 * IDE autocompletion for gateway configuration and development.
 *
 * @example
 * ```ts
 * import { GatewayConfig, RouteConfig } from 'bungate'
 *
 * const config: GatewayConfig = {
 *   server: { port: 3000 },
 *   routes: [...]
 * }
 * ```
 */

// Core Gateway Interface
export type { Gateway, GatewayConfig, ClusterConfig } from './gateway'

// Route Management
export type { RouteConfig } from './route'

// Middleware System - Re-exports from 0http-bun for compatibility
export type {
  ZeroRequest,
  StepFunction,
  RequestHandler,
  ParsedFile,
  IRouter,
  IRouterConfig,
  MiddlewareManager,
  // Authentication & Security
  LoggerOptions,
  JWTAuthOptions,
  APIKeyAuthOptions,
  JWKSLike,
  TokenExtractionOptions,
  // Rate Limiting
  RateLimitOptions,
  MemoryStore,
  // CORS
  CORSOptions,
  // Body Parsing
  BodyParserOptions,
  JSONParserOptions,
  TextParserOptions,
  URLEncodedParserOptions,
  MultipartParserOptions,
  // Metrics & Monitoring
  PrometheusMetrics,
  PrometheusMiddlewareOptions,
  MetricsHandlerOptions,
  PrometheusIntegration,
  // Router Types
  Trouter,
  Pattern,
  Methods,
} from './middleware'

// Proxy Functionality - Re-exports from fetch-gate for compatibility
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
} from './proxy'
export type { CircuitState } from './proxy'

// Load Balancing - High-availability request distribution
export type {
  LoadBalancer,
  LoadBalancerConfig,
  LoadBalancerTarget,
  LoadBalancerStats,
} from './load-balancer'

// Logging - Structured logging with request tracing
export type { Logger, LoggerConfig, LogEntry } from './logger'
