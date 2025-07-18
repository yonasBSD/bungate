import type {
  Logger as PinoLogger,
  LoggerOptions as PinoLoggerOptions,
} from 'pino'

/**
 * Structured log entry interface for consistent logging across the gateway
 */
export interface LogEntry {
  /**
   * Log severity level
   * - info: General information and normal operation
   * - debug: Detailed information for debugging
   * - warn: Warning messages for potential issues
   * - error: Error messages for failures and exceptions
   */
  level: 'info' | 'debug' | 'warn' | 'error'

  /**
   * Human-readable log message
   * @example 'Request processed successfully' or 'Failed to connect to target service'
   */
  message: string

  /**
   * Unix timestamp in milliseconds when the log entry was created
   */
  timestamp: number

  /**
   * Unique request identifier for distributed tracing
   * Helps correlate logs across multiple services
   * @example 'req-123e4567-e89b-12d3-a456-426614174000'
   */
  requestId?: string

  /**
   * Additional structured data related to the log entry
   * @example { userId: '123', action: 'login', duration: 150 }
   */
  data?: Record<string, any>

  /**
   * HTTP request information for request-related logs
   */
  request?: {
    /** HTTP method (GET, POST, etc.) */
    method: string
    /** Full request URL */
    url: string
    /** Request headers (may be filtered for security) */
    headers?: Record<string, string>
    /** User agent string */
    userAgent?: string
    /** Client IP address */
    ip?: string
  }

  /**
   * HTTP response information for response-related logs
   */
  response?: {
    /** HTTP status code */
    status: number
    /** Response headers */
    headers?: Record<string, string>
    /** Request processing duration in milliseconds */
    duration: number
    /** Response body size in bytes */
    size?: number
  }

  /**
   * Error information for exception logs
   */
  error?: {
    /** Error class name */
    name: string
    /** Error message */
    message: string
    /** Stack trace (may be omitted in production) */
    stack?: string
  }
}

/**
 * Logger configuration extending Pino logger options
 * Provides gateway-specific logging features and customization
 */
export interface LoggerConfig extends Partial<PinoLoggerOptions> {
  /**
   * Minimum log level to output
   * Messages below this level will be ignored
   * @default 'info'
   */
  level?: 'info' | 'debug' | 'warn' | 'error'

  /**
   * Log output format
   * - json: Structured JSON format for production
   * - pretty: Human-readable format for development
   * @default 'json'
   */
  format?: 'json' | 'pretty'

  /**
   * Include HTTP headers in request/response logs
   * May be disabled for security or performance reasons
   * @default false
   */
  includeHeaders?: boolean

  /**
   * Include request/response body content in logs
   * Should be disabled in production for security and performance
   * @default false
   */
  includeBody?: boolean

  /**
   * Custom formatter function for log entries
   * Allows complete control over log output format
   */
  formatter?: (entry: LogEntry) => string

  /**
   * Log output destination
   * @default 'console'
   */
  output?: 'console' | 'file' | 'custom'

  /**
   * File path for file-based logging
   * Required when output is 'file'
   */
  filePath?: string

  /**
   * Custom log handler for advanced log processing
   * Called for each log entry when output is 'custom'
   */
  handler?: (entry: LogEntry) => void | Promise<void>

  /**
   * Enable automatic request/response logging
   * Logs all HTTP requests and responses passing through the gateway
   * @default true
   */
  enableRequestLogging?: boolean

  /**
   * Enable performance metrics logging
   * Logs timing and performance information
   * @default false
   */
  enableMetrics?: boolean
}

/**
 * Gateway logger interface with enhanced functionality
 * Provides structured logging with request tracing and performance monitoring
 */
export interface Logger {
  /**
   * Access to the underlying Pino logger instance
   * For advanced usage and direct Pino feature access
   */
  readonly pino: PinoLogger

  /**
   * Log informational messages
   * @param message - Log message
   * @param data - Additional structured data
   */
  info(message: string, data?: Record<string, any>): void
  /**
   * Log informational messages with object data
   * @param obj - Structured log data
   * @param message - Optional message
   */
  info(obj: object, message?: string): void

  /**
   * Log debug messages for troubleshooting
   * @param message - Debug message
   * @param data - Additional debug data
   */
  debug(message: string, data?: Record<string, any>): void
  /**
   * Log debug messages with object data
   * @param obj - Structured debug data
   * @param message - Optional message
   */
  debug(obj: object, message?: string): void

  /**
   * Log warning messages for potential issues
   * @param message - Warning message
   * @param data - Additional context data
   */
  warn(message: string, data?: Record<string, any>): void
  /**
   * Log warning messages with object data
   * @param obj - Structured warning data
   * @param message - Optional message
   */
  warn(obj: object, message?: string): void

  /**
   * Log error messages for failures and exceptions
   * @param message - Error message
   * @param error - Error object with stack trace
   * @param data - Additional error context
   */
  error(message: string, error?: Error, data?: Record<string, any>): void
  /**
   * Log error messages with object data
   * @param obj - Structured error data
   * @param message - Optional message
   */
  error(obj: object, message?: string): void

  /**
   * Log HTTP request and response information
   * Automatically called for all gateway requests when request logging is enabled
   * @param request - HTTP request object
   * @param response - HTTP response object (optional for request-only logging)
   * @param duration - Request processing time in milliseconds
   */
  logRequest(request: Request, response?: Response, duration?: number): void

  /**
   * Create a child logger with additional context
   * Child loggers inherit parent configuration but add extra context to all logs
   * @param context - Additional context to include in all child logger messages
   * @returns New logger instance with added context
   * @example
   * ```ts
   * const routeLogger = logger.child({ route: '/api/users', version: 'v1' })
   * routeLogger.info('Processing request') // Includes route and version context
   * ```
   */
  child(context: Record<string, any>): Logger

  /**
   * Change the minimum log level at runtime
   * @param level - New minimum log level
   */
  setLevel(level: LoggerConfig['level']): void

  /**
   * Get the current minimum log level
   * @returns Current log level
   */
  getLevel(): LoggerConfig['level']

  /**
   * Log performance metrics for monitoring and optimization
   * @param component - Component or service name
   * @param operation - Operation being measured
   * @param duration - Operation duration in milliseconds
   * @param metadata - Additional performance context
   * @example
   * ```ts
   * logger.logMetrics('proxy', 'forward_request', 150, { target: 'user-service' })
   * ```
   */
  logMetrics(
    component: string,
    operation: string,
    duration: number,
    metadata?: Record<string, any>,
  ): void

  /**
   * Log health check events
   */
  logHealthCheck(
    target: string,
    healthy: boolean,
    duration: number,
    error?: Error,
  ): void

  /**
   * Log load balancer events
   */
  logLoadBalancing(
    strategy: string,
    targetUrl: string,
    metadata?: Record<string, any>,
  ): void

  /**
   * Get Pino logger options
   */
  getSerializers(): PinoLoggerOptions['serializers'] | undefined
}
