// Core Gateway Interface
export type { Gateway, GatewayConfig } from "./gateway.ts";

// Route Management
export type { RouteConfig } from "./route.ts";

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
} from "./middleware.ts";

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
} from "./proxy.ts";
export type { CircuitState } from "./proxy.ts";

// Rate Limiting
// Rate limiting - now using 0http-bun's built-in rate limiter

// Load Balancing
export type { LoadBalancer, LoadBalancerConfig, LoadBalancerTarget, LoadBalancerStats } from "./load-balancer.ts";

// Logging
export type { Logger, LoggerConfig, LogEntry } from "./logger.ts";
