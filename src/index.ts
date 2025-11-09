/**
 * Bungate - Ultra-Fast API Gateway for Modern Applications
 *
 * A production-ready, high-performance API gateway built on Bun runtime with comprehensive
 * enterprise features for microservices architectures, API management, and cloud-native deployments.
 *
 * ## Key Features
 *
 * ### 🚀 **Ultra-High Performance**
 * - Built on Bun's lightning-fast JavaScript runtime
 * - Zero-copy request forwarding with minimal overhead
 * - Optimized routing with 0http-bun for maximum throughput
 * - Connection pooling and keep-alive for backend efficiency
 *
 * ### 🛠 **Enterprise-Grade Features**
 * - Multiple load balancing strategies (round-robin, least-connections, weighted, etc.)
 * - Circuit breaker pattern for fault tolerance and resilience
 * - JWT authentication and comprehensive CORS support
 * - Request/response transformation and validation
 * - Rate limiting and abuse protection mechanisms
 *
 * ### 📊 **Production Monitoring**
 * - Structured logging with request correlation IDs
 * - Prometheus metrics and health check endpoints
 * - Real-time performance monitoring and alerting
 * - Comprehensive error tracking and debugging tools
 *
 * ### 🔧 **Developer Experience**
 * - TypeScript-first with excellent IDE support
 * - Hot reload and development-friendly features
 * - Extensive configuration options with sensible defaults
 * - Rich middleware ecosystem and plugin architecture
 *
 * ### ⚡ **Deployment Flexibility**
 * - Multi-process clustering for horizontal scaling
 * - Docker and Kubernetes ready with health checks
 * - Zero-downtime deployments with graceful shutdown
 * - Cloud-native design with 12-factor app principles
 *
 * ## Quick Start
 *
 * ```typescript
 * import { createGateway } from 'bungate'
 *
 * const gateway = createGateway({
 *   server: { port: 3000 },
 *   routes: [
 *     {
 *       pattern: '/api/users/*',
 *       target: 'http://user-service:3000',
 *       loadBalancer: {
 *         strategy: 'least-connections',
 *         targets: [
 *           { url: 'http://user-service-1:3000' },
 *           { url: 'http://user-service-2:3000' }
 *         ]
 *       }
 *     }
 *   ],
 *   cors: { origin: '*' },
 *   auth: { secret: process.env.JWT_SECRET }
 * })
 *
 * await gateway.listen()
 * console.log('🚀 Bungate API Gateway running on port 3000')
 * ```
 *
 * ## Architecture
 *
 * ```
 * ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
 * │   Client    │────│   Bungate   │────│  Services   │
 * │ Application │    │   Gateway   │    │  Backend    │
 * └─────────────┘    └─────────────┘    └─────────────┘
 *                           │
 *                    ┌─────────────┐
 *                    │ Middleware  │
 *                    │   Stack     │
 *                    └─────────────┘
 * ```
 *
 * @author BackendStack21
 * @license MIT
 * @homepage https://github.com/BackendStack21/bungate
 */
// ==================== CORE CLASSES ====================

/**
 * Primary gateway implementation - the heart of Bungate
 * Provides comprehensive API gateway functionality with routing, middleware, and clustering
 */
export { BunGateway } from './gateway/gateway'

/**
 * High-performance load balancer with multiple strategies
 * Supports round-robin, least-connections, weighted, random, and IP-hash algorithms
 */
export {
  HttpLoadBalancer,
  createLoadBalancer,
} from './load-balancer/http-load-balancer'

/**
 * Intelligent proxy with circuit breaker and connection pooling
 * Built on fetch-gate for reliable backend communication
 */
export { GatewayProxy, createGatewayProxy } from './proxy/gateway-proxy'

/**
 * Production-grade structured logger with request tracing
 * Based on Pino for high-performance logging with minimal overhead
 */
export { BunGateLogger, createLogger } from './logger/pino-logger'

/**
 * Multi-process cluster manager for horizontal scaling
 * Provides automatic worker management and graceful restarts
 */
export { ClusterManager } from './cluster/cluster-manager'
// ==================== CONVENIENCE EXPORTS ====================

/**
 * Complete TypeScript interface definitions for excellent IDE support
 * Includes all configuration options, request/response types, and middleware interfaces
 */
export * from './interfaces/index'

// ==================== SECURITY MODULE ====================

/**
 * Comprehensive security features for production-grade API gateway
 * Includes TLS/HTTPS, input validation, error handling, session management,
 * trusted proxy validation, security headers, CSRF protection, and more
 */
export * from './security/index'

// ==================== DEFAULT EXPORT ====================

/**
 * Default export provides the main BunGateway class for simple imports
 * Use: import Gateway from 'bungate'
 */
export { BunGateway as default } from './gateway/gateway'
// ==================== UTILITIES ====================

import type { GatewayConfig } from './interfaces/gateway'
import { BunGateway } from './gateway/gateway'

/**
 * Factory function to create a new Bungate instance with configuration
 *
 * Provides a convenient way to create and configure a gateway instance
 * with TypeScript support and validation.
 *
 * @param config - Gateway configuration options
 * @returns Configured BunGateway instance ready for use
 *
 * @example
 * ```typescript
 * const gateway = createGateway({
 *   server: { port: 3000, hostname: '0.0.0.0' },
 *   routes: [
 *     {
 *       pattern: '/api/*',
 *       target: 'http://backend:3000',
 *       auth: { secret: 'your-jwt-secret' }
 *     }
 *   ],
 *   cors: { origin: ['https://app.example.com'] },
 *   rateLimit: { max: 100, windowMs: 900000 }
 * })
 *
 * await gateway.listen()
 * ```
 */
export function createGateway(config: GatewayConfig): BunGateway {
  return new BunGateway(config)
}

/**
 * Library metadata and version information
 * Useful for debugging, monitoring, and compatibility checks
 */
export const BUNGATE_INFO = {
  /** Library name */
  name: 'Bungate',
  /** Short description */
  description: 'Ultra-fast API Gateway built on Bun runtime',
  /** Library author */
  author: 'BackendStack21',
  /** Open source license */
  license: 'MIT',
  /** Project homepage and documentation */
  homepage: 'https://github.com/BackendStack21/bungate',
  /** Supported Node.js/Bun versions */
  engines: {
    bun: '>=1.0.0',
    node: '>=18.0.0',
  },
  /** Key features for marketing and documentation */
  features: [
    'Ultra-high performance HTTP routing',
    'Multiple load balancing strategies',
    'Circuit breaker fault tolerance',
    'JWT authentication & CORS support',
    'Prometheus metrics & monitoring',
    'Multi-process clustering',
    'TypeScript-first development',
  ],
} as const
