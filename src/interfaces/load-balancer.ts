import type { Logger } from "./logger.ts";

export interface LoadBalancerTarget {
  /**
   * Target URL
   */
  url: string;

  /**
   * Target weight for weighted strategies
   */
  weight?: number;

  /**
   * Whether target is healthy
   */
  healthy?: boolean;

  /**
   * Number of active connections
   */
  connections?: number;

  /**
   * Average response time in milliseconds
   */
  averageResponseTime?: number;

  /**
   * Last health check timestamp
   */
  lastHealthCheck?: number;

  /**
   * Target metadata
   */
  metadata?: Record<string, any>;
}

export interface LoadBalancerConfig {
  /**
   * Load balancing strategy
   */
  strategy: "round-robin" | "least-connections" | "random" | "weighted" | "ip-hash";

  /**
   * List of targets
   */
  targets: Omit<LoadBalancerTarget, "healthy" | "lastHealthCheck" | "connections" | "averageResponseTime">[];

  /**
   * Health check configuration
   */
  healthCheck?: {
    enabled: boolean;
    interval: number;
    timeout: number;
    path: string;
    expectedStatus?: number;
    expectedBody?: string;
  };

  /**
   * Sticky session configuration
   */
  stickySession?: {
    enabled: boolean;
    cookieName?: string;
    ttl?: number;
  };

  /**
   * Logger instance for load balancer operations
   */
  logger?: Logger;
}

export interface LoadBalancerStats {
  /**
   * Total number of requests
   */
  totalRequests: number;

  /**
   * Requests per target
   */
  targetStats: Record<
    string,
    {
      requests: number;
      errors: number;
      averageResponseTime: number;
      lastUsed: number;
    }
  >;

  /**
   * Current strategy
   */
  strategy: string;

  /**
   * Number of healthy targets
   */
  healthyTargets: number;

  /**
   * Number of total targets
   */
  totalTargets: number;
}

export interface LoadBalancer {
  /**
   * Select next target based on strategy
   */
  selectTarget(request: Request): LoadBalancerTarget | null;

  /**
   * Add a target to the load balancer
   */
  addTarget(target: LoadBalancerTarget): void;

  /**
   * Remove a target from the load balancer
   */
  removeTarget(url: string): void;

  /**
   * Update target health status
   */
  updateTargetHealth(url: string, healthy: boolean): void;

  /**
   * Get all targets
   */
  getTargets(): LoadBalancerTarget[];

  /**
   * Get healthy targets only
   */
  getHealthyTargets(): LoadBalancerTarget[];

  /**
   * Get load balancer statistics
   */
  getStats(): LoadBalancerStats;

  /**
   * Start health checks
   */
  startHealthChecks(): void;

  /**
   * Stop health checks
   */
  stopHealthChecks(): void;
}
