/**
 * Pino-based logger implementation for BunGate
 */
import pino from "pino";
import type { LoggerOptions, Logger as PinoLogger } from "pino";
import type { Logger, LoggerConfig } from "../interfaces/logger.ts";

/**
 * Enhanced logger that wraps Pino with BunGate-specific functionality
 */
export class BunGateLogger implements Logger {
  readonly pino: PinoLogger;
  private config: LoggerConfig;

  constructor(config: LoggerConfig = {}) {
    this.config = {
      level: "info",
      format: "json",
      enableRequestLogging: true,
      enableMetrics: true,
      ...config,
    };

    // Create Pino logger with configuration
    const pinoConfig: any = {
      level: this.config.level,
      ...config,
    };

    // Set up pretty printing if requested
    if (this.config.format === "pretty") {
      pinoConfig.transport = {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
      };
    }

    // Set up file output if requested
    if (this.config.output === "file" && this.config.filePath) {
      pinoConfig.transport = {
        target: "pino/file",
        options: {
          destination: this.config.filePath,
        },
      };
    }

    this.pino = pino(pinoConfig);
  }

  getSerializers(): LoggerOptions["serializers"] | undefined {
    return this.config.serializers;
  }

  info(message: string, data?: Record<string, any>): void;
  info(obj: object, message?: string): void;
  info(msgOrObj: string | object, dataOrMsg?: Record<string, any> | string): void {
    if (typeof msgOrObj === "string") {
      this.pino.info(dataOrMsg || {}, msgOrObj);
    } else {
      this.pino.info(msgOrObj, dataOrMsg as string);
    }
  }

  debug(message: string, data?: Record<string, any>): void;
  debug(obj: object, message?: string): void;
  debug(msgOrObj: string | object, dataOrMsg?: Record<string, any> | string): void {
    if (typeof msgOrObj === "string") {
      this.pino.debug(dataOrMsg || {}, msgOrObj);
    } else {
      this.pino.debug(msgOrObj, dataOrMsg as string);
    }
  }

  warn(message: string, data?: Record<string, any>): void;
  warn(obj: object, message?: string): void;
  warn(msgOrObj: string | object, dataOrMsg?: Record<string, any> | string): void {
    if (typeof msgOrObj === "string") {
      this.pino.warn(dataOrMsg || {}, msgOrObj);
    } else {
      this.pino.warn(msgOrObj, dataOrMsg as string);
    }
  }

  error(message: string, error?: Error, data?: Record<string, any>): void;
  error(obj: object, message?: string): void;
  error(msgOrObj: string | object, errorOrMsg?: Error | string, data?: Record<string, any>): void {
    if (typeof msgOrObj === "string") {
      const errorData = {
        ...data,
        ...(errorOrMsg instanceof Error
          ? {
              error: {
                name: errorOrMsg.name,
                message: errorOrMsg.message,
                stack: errorOrMsg.stack,
              },
            }
          : {}),
      };
      this.pino.error(errorData, msgOrObj);
    } else {
      this.pino.error(msgOrObj, errorOrMsg as string);
    }
  }

  logRequest(request: Request, response?: Response, duration?: number): void {
    if (!this.config.enableRequestLogging) return;

    const url = new URL(request.url);
    const requestData: any = {
      request: {
        method: request.method,
        url: request.url,
        path: url.pathname,
        userAgent: request.headers.get("user-agent"),
        contentLength: request.headers.get("content-length"),
      },
    };

    if (this.config.includeHeaders) {
      requestData.request.headers = Object.fromEntries(request.headers.entries());
    }

    if (response) {
      requestData.response = {
        status: response.status,
        contentLength: response.headers.get("content-length"),
        contentType: response.headers.get("content-type"),
      };

      if (this.config.includeHeaders) {
        requestData.response.headers = Object.fromEntries(response.headers.entries());
      }

      if (duration !== undefined) {
        requestData.response.duration = duration;
      }
    }

    this.pino.info(requestData, `${request.method} ${url.pathname}`);
  }

  child(context: Record<string, any>): Logger {
    const childPino = this.pino.child(context);
    const childLogger = Object.create(this);
    childLogger.pino = childPino;
    return childLogger as Logger;
  }

  setLevel(level: LoggerConfig["level"]): void {
    if (level) {
      this.pino.level = level;
      this.config.level = level;
    }
  }

  getLevel(): LoggerConfig["level"] {
    return this.config.level;
  }

  logMetrics(component: string, operation: string, duration: number, metadata?: Record<string, any>): void {
    if (!this.config.enableMetrics) return;

    this.pino.info(
      {
        metrics: {
          component,
          operation,
          duration,
          ...metadata,
        },
      },
      `${component}.${operation} completed in ${duration}ms`
    );
  }

  logHealthCheck(target: string, healthy: boolean, duration: number, error?: Error): void {
    const logData: any = {
      healthCheck: {
        target,
        healthy,
        duration,
      },
    };

    if (error) {
      logData.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    const message = `Health check for ${target}: ${healthy ? "healthy" : "unhealthy"} (${duration}ms)`;

    if (healthy) {
      this.pino.debug(logData, message);
    } else {
      this.pino.warn(logData, message);
    }
  }

  logLoadBalancing(strategy: string, targetUrl: string, metadata?: Record<string, any>): void {
    this.pino.debug(
      {
        loadBalancer: {
          strategy,
          selectedTarget: targetUrl,
          ...metadata,
        },
      },
      `Load balancer selected target using ${strategy} strategy`
    );
  }
}

/**
 * Factory function to create a logger instance
 */
export function createLogger(config?: LoggerConfig): Logger {
  return new BunGateLogger(config);
}

/**
 * Default logger instance
 */
export const defaultLogger = createLogger({
  level: "info",
  format: "pretty",
});
