import type { Server } from "bun";
import type { RouteConfig } from "./route.ts";
import type { RequestHandler, ZeroRequest } from "./middleware.ts";
import type { ProxyOptions } from "./proxy.ts";
import type { Logger } from "./logger.ts";

/**
 * Gateway configuration interface
 */
export interface GatewayConfig {
  /**
   * Server configuration
   */
  server?: {
    port?: number;
    hostname?: string;
    development?: boolean;
  };

  /**
   * Default route handler (404 handler)
   */
  defaultRoute?: (req: ZeroRequest) => Response | Promise<Response>;

  /**
   * Global error handler
   */
  errorHandler?: (err: Error) => Response | Promise<Response>;

  /**
   * Routes configuration
   */
  routes?: RouteConfig[];

  /**
   * Global proxy configuration
   */
  proxy?: ProxyOptions;

  /**
   * CORS configuration
   */
  cors?: {
    origin?: string | string[] | boolean | ((origin: string, req: ZeroRequest) => boolean | string);
    methods?: string[];
    allowedHeaders?: string[];
    exposedHeaders?: string[];
    credentials?: boolean;
    maxAge?: number;
  };

  /**
   * Rate limiting configuration
   */
  rateLimit?: {
    windowMs?: number;
    max?: number;
    keyGenerator?: (req: ZeroRequest) => string;
    standardHeaders?: boolean;
  };

  /**
   * JWT Authentication configuration
   */
  auth?: {
    secret?: string;
    jwksUri?: string;
    algorithms?: string[];
    issuer?: string;
    audience?: string;
    optional?: boolean;
    excludePaths?: string[];
  };

  /**
   * Body parser configuration
   */
  bodyParser?: {
    json?: { limit?: string };
    text?: { limit?: string };
    urlencoded?: { limit?: string };
    multipart?: { limit?: string };
  };

  /**
   * Logging configuration
   */
  logger?: Logger;

  /**
   * Health check configuration
   */
  healthCheck?: {
    path?: string;
    enabled?: boolean;
  };

  /**
   * Metrics configuration
   */
  metrics?: {
    enabled?: boolean;
    endpoint?: string;
    collectDefaultMetrics?: boolean;
  };
}

/**
 * Gateway interface - follows 0http-bun router pattern
 */
export interface Gateway {
  /**
   * Main fetch handler for Bun.serve
   */
  fetch: (req: Request) => Response | Promise<Response>;

  /**
   * Register middleware (global)
   */
  use(middleware: RequestHandler): this;

  /**
   * Register middleware for specific path
   */
  use(pattern: string, middleware: RequestHandler): this;

  /**
   * Register multiple middlewares
   */
  use(...middlewares: RequestHandler[]): this;

  /**
   * Register route handler for specific HTTP method and pattern
   */
  on(method: string, pattern: string, ...handlers: RequestHandler[]): this;

  /**
   * HTTP method shortcuts
   */
  get(pattern: string, ...handlers: RequestHandler[]): this;
  post(pattern: string, ...handlers: RequestHandler[]): this;
  put(pattern: string, ...handlers: RequestHandler[]): this;
  patch(pattern: string, ...handlers: RequestHandler[]): this;
  delete(pattern: string, ...handlers: RequestHandler[]): this;
  head(pattern: string, ...handlers: RequestHandler[]): this;
  options(pattern: string, ...handlers: RequestHandler[]): this;
  all(pattern: string, ...handlers: RequestHandler[]): this;

  /**
   * Add a route configuration dynamically
   */
  addRoute(route: RouteConfig): void;

  /**
   * Remove a route dynamically.
   *
   * @todo: NOT IMPLEMENTED IN 0http-bun YET
   */
  removeRoute(pattern: string): void;

  /**
   * Get current gateway configuration
   */
  getConfig(): GatewayConfig;

  /**
   * Start the gateway server (if not using Bun.serve directly)
   */
  listen(port?: number): Promise<Server>;

  /**
   * Stop the gateway server
   */
  close(): Promise<void>;
}

/**
 * Gateway factory configuration
 */
export interface IGatewayConfig {
  /**
   * Port number (for reference)
   */
  port?: number;

  /**
   * Default route handler (404 handler)
   */
  defaultRoute?: (req: ZeroRequest) => Response | Promise<Response>;

  /**
   * Global error handler
   */
  errorHandler?: (err: Error, req: ZeroRequest) => Response | Promise<Response>;
}
