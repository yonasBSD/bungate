// Core Gateway Interface
export type { Gateway, GatewayConfig } from './gateway'

// Route Management
export type { RouteConfig } from './route'

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
} from './middleware'

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
} from './proxy'
export type { CircuitState } from './proxy'

// Rate Limiting
// Rate limiting - now using 0http-bun's built-in rate limiter

// Load Balancing
export type {
  LoadBalancer,
  LoadBalancerConfig,
  LoadBalancerTarget,
  LoadBalancerStats,
} from './load-balancer'

// Logging
export type { Logger, LoggerConfig, LogEntry } from './logger'
