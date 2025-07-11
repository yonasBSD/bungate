import type { Logger as PinoLogger, LoggerOptions as PinoLoggerOptions } from "pino";

export interface LogEntry {
  /**
   * Log level
   */
  level: "info" | "debug" | "warn" | "error";

  /**
   * Log message
   */
  message: string;

  /**
   * Timestamp
   */
  timestamp: number;

  /**
   * Request ID for tracing
   */
  requestId?: string;

  /**
   * Additional log data
   */
  data?: Record<string, any>;

  /**
   * Request information
   */
  request?: {
    method: string;
    url: string;
    headers?: Record<string, string>;
    userAgent?: string;
    ip?: string;
  };

  /**
   * Response information
   */
  response?: {
    status: number;
    headers?: Record<string, string>;
    duration: number;
    size?: number;
  };

  /**
   * Error information
   */
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

export interface LoggerConfig extends Partial<PinoLoggerOptions> {
  /**
   * Minimum log level
   */
  level?: "info" | "debug" | "warn" | "error";

  /**
   * Log format
   */
  format?: "json" | "pretty";

  /**
   * Whether to include request headers
   */
  includeHeaders?: boolean;

  /**
   * Whether to include request/response body
   */
  includeBody?: boolean;

  /**
   * Custom log formatter
   */
  formatter?: (entry: LogEntry) => string;

  /**
   * Log output destination
   */
  output?: "console" | "file" | "custom";

  /**
   * File path for file output
   */
  filePath?: string;

  /**
   * Custom log handler
   */
  handler?: (entry: LogEntry) => void | Promise<void>;

  /**
   * Enable request/response logging
   */
  enableRequestLogging?: boolean;

  /**
   * Enable performance metrics logging
   */
  enableMetrics?: boolean;
}

export interface Logger {
  /**
   * Underlying Pino logger instance
   */
  readonly pino: PinoLogger;

  /**
   * Log info message
   */
  info(message: string, data?: Record<string, any>): void;
  info(obj: object, message?: string): void;

  /**
   * Log debug message
   */
  debug(message: string, data?: Record<string, any>): void;
  debug(obj: object, message?: string): void;

  /**
   * Log warning message
   */
  warn(message: string, data?: Record<string, any>): void;
  warn(obj: object, message?: string): void;

  /**
   * Log error message
   */
  error(message: string, error?: Error, data?: Record<string, any>): void;
  error(obj: object, message?: string): void;

  /**
   * Log request/response
   */
  logRequest(request: Request, response?: Response, duration?: number): void;

  /**
   * Create child logger with additional context
   */
  child(context: Record<string, any>): Logger;

  /**
   * Set log level
   */
  setLevel(level: LoggerConfig["level"]): void;

  /**
   * Get current log level
   */
  getLevel(): LoggerConfig["level"];

  /**
   * Log performance metrics
   */
  logMetrics(component: string, operation: string, duration: number, metadata?: Record<string, any>): void;

  /**
   * Log health check events
   */
  logHealthCheck(target: string, healthy: boolean, duration: number, error?: Error): void;

  /**
   * Log load balancer events
   */
  logLoadBalancing(strategy: string, targetUrl: string, metadata?: Record<string, any>): void;

  /**
   * Get Pino logger options
   */
  getSerializers(): PinoLoggerOptions["serializers"] | undefined;
}
