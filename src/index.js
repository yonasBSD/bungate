/**
 * BunGate - High-performance API Gateway built on Bun.js
 *
 * Main entry point for the BunGate library.
 * Exports all core classes, interfaces, and utilities.
 */
// ==================== CORE CLASSES ====================
// Gateway
export { BunGateway } from './gateway/gateway.ts';
// Load Balancer
export { HttpLoadBalancer, createLoadBalancer, } from './load-balancer/http-load-balancer.ts';
// Proxy
export { GatewayProxy, createGatewayProxy } from './proxy/gateway-proxy.ts';
// Logger
export { BunGateLogger, createLogger } from './logger/pino-logger.ts';
// ==================== CONVENIENCE EXPORTS ====================
// Re-export all interfaces from the main interfaces index
export * from './interfaces/index.ts';
// ==================== DEFAULT EXPORT ====================
// Default export for the main gateway class
export { BunGateway as default } from './gateway/gateway.ts';
// ==================== UTILITIES ====================
// Import for internal use in utility functions
import { BunGateway } from './gateway/gateway.ts';
/**
 * Create a new BunGate instance with default configuration
 * @param config Gateway configuration options
 * @returns BunGateway instance
 */
export function createGateway(config) {
    return new BunGateway(config);
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
};
//# sourceMappingURL=index.js.map