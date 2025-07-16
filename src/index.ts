/**
 * BunGate - High-performance API Gateway built on Bun.js
 *
 * Main entry point for the BunGate library.
 * Exports all core classes, interfaces, and utilities.
 */
// ==================== CORE CLASSES ====================
// Gateway
export { BunGateway } from './gateway/gateway'
// Load Balancer
export {
  HttpLoadBalancer,
  createLoadBalancer,
} from './load-balancer/http-load-balancer'
// Proxy
export { GatewayProxy, createGatewayProxy } from './proxy/gateway-proxy'
// Logger
export { BunGateLogger, createLogger } from './logger/pino-logger'
// Cluster Manager
export { ClusterManager } from './cluster/cluster-manager'
// ==================== CONVENIENCE EXPORTS ====================
// Re-export all interfaces from the main interfaces index
export * from './interfaces/index'
// ==================== DEFAULT EXPORT ====================
// Default export for the main gateway class
export { BunGateway as default } from './gateway/gateway'
import type { GatewayConfig } from './interfaces/gateway'
// ==================== UTILITIES ====================
// Import for internal use in utility functions
import { BunGateway } from './gateway/gateway'
/**
 * Create a new BunGate instance with default configuration
 * @param config Gateway configuration options
 * @returns BunGateway instance
 */
export function createGateway(config: GatewayConfig): BunGateway {
  return new BunGateway(config)
}
/**
 * Library metadata
 */
export const BUNGATE_INFO = {
  name: 'BunGate',
  description: 'High-performance API Gateway built on Bun.js',
  author: '21no.de',
  license: 'MIT',
  homepage: 'https://github.com/BackendStack21/bungate',
}
