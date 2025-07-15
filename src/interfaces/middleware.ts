/**
 * Import and re-export core 0http-bun types directly from the package
 * This ensures 100% compatibility and eliminates duplication
 */
import type {
  ZeroRequest,
  StepFunction,
  RequestHandler,
  IRouter,
  IRouterConfig,
  ParsedFile,
} from '0http-bun'

// Import all middleware types from 0http-bun
import type {
  // Logger middleware
  LoggerOptions,

  // JWT/Auth middleware
  JWTAuthOptions,
  APIKeyAuthOptions,
  JWKSLike,
  TokenExtractionOptions,

  // Rate limiting middleware
  RateLimitOptions,
  RateLimitStore,
  MemoryStore,

  // CORS middleware
  CORSOptions,

  // Body parser middleware
  BodyParserOptions,
  JSONParserOptions,
  TextParserOptions,
  URLEncodedParserOptions,
  MultipartParserOptions,

  // Prometheus middleware
  PrometheusMetrics,
  PrometheusMiddlewareOptions,
  MetricsHandlerOptions,
  PrometheusIntegration,
} from '0http-bun/lib/middleware'

// Import trouter types used by 0http-bun
export type { Trouter } from 'trouter'

// Pattern and Methods are type aliases, we need to define them based on trouter source
export type Pattern = RegExp | string
export type Methods =
  | 'ACL'
  | 'BIND'
  | 'CHECKOUT'
  | 'CONNECT'
  | 'COPY'
  | 'DELETE'
  | 'GET'
  | 'HEAD'
  | 'LINK'
  | 'LOCK'
  | 'M-SEARCH'
  | 'MERGE'
  | 'MKACTIVITY'
  | 'MKCALENDAR'
  | 'MKCOL'
  | 'MOVE'
  | 'NOTIFY'
  | 'OPTIONS'
  | 'PATCH'
  | 'POST'
  | 'PRI'
  | 'PROPFIND'
  | 'PROPPATCH'
  | 'PURGE'
  | 'PUT'
  | 'REBIND'
  | 'REPORT'
  | 'SEARCH'
  | 'SOURCE'
  | 'SUBSCRIBE'
  | 'TRACE'
  | 'UNBIND'
  | 'UNLINK'
  | 'UNLOCK'
  | 'UNSUBSCRIBE'

// Re-export core types
export type {
  ZeroRequest,
  StepFunction,
  RequestHandler,
  IRouter,
  IRouterConfig,
  ParsedFile,
}

// Re-export all middleware types
export type {
  // Logger middleware
  LoggerOptions,

  // JWT/Auth middleware
  JWTAuthOptions,
  APIKeyAuthOptions,
  JWKSLike,
  TokenExtractionOptions,

  // Rate limiting middleware
  RateLimitOptions,
  RateLimitStore,
  MemoryStore,

  // CORS middleware
  CORSOptions,

  // Body parser middleware
  BodyParserOptions,
  JSONParserOptions,
  TextParserOptions,
  URLEncodedParserOptions,
  MultipartParserOptions,

  // Prometheus middleware
  PrometheusMetrics,
  PrometheusMiddlewareOptions,
  MetricsHandlerOptions,
  PrometheusIntegration,
}

/**
 * Middleware manager for organizing middleware execution
 * Uses imported types from 0http-bun
 */
export interface MiddlewareManager {
  /**
   * Register a middleware
   */
  use(middleware: RequestHandler): void

  /**
   * Register middleware for specific path
   */
  use(pattern: string, middleware: RequestHandler): void

  /**
   * Execute middleware chain
   */
  execute(req: ZeroRequest): Promise<Response>
}
