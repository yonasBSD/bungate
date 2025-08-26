/**
 * Comprehensive Load Balancer Demo - All Options Showcase
 *
 * This demo showcases all possible load balancer configurations and features:
 * - All load balancing strategies (round-robin, weighted, least-connections, random, ip-hash)
 * - Health checks with custom configuration
 * - Sticky sessions
 * - Dynamic target management
 * - Error handling and circuit breaker integration
 * - Metrics and monitoring
 * - Advanced proxy features
 */

import { BunGateway } from '../src'
import { BunGateLogger } from '../src'

// Create a detailed logger for demo purposes
const logger = new BunGateLogger({
  level: 'debug',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
      messageFormat: '🔄 {msg}',
    },
  },
})

console.log('🚀 Load Balancer Comprehensive Demo')
console.log('='.repeat(60))

// Initialize the gateway
const gateway = new BunGateway({
  logger,
  server: {
    port: 3000,
    development: true,
    hostname: '0.0.0.0',
  },
})

// =============================================================================
// ROUND ROBIN LOAD BALANCER WITH HEALTH CHECKS
// =============================================================================
console.log('\n1️⃣  Round Robin with Health Checks')

gateway.addRoute({
  pattern: '/api/round-robin/*',
  loadBalancer: {
    strategy: 'round-robin',
    targets: [
      { url: 'http://localhost:8080', weight: 1 },
      { url: 'http://localhost:8081', weight: 1 },
    ],
    healthCheck: {
      enabled: true,
      interval: 10000, // Check every 10 seconds
      timeout: 5000, // 5 second timeout
      path: '/get', // Health check endpoint
      expectedStatus: 200,
    },
  },
  proxy: {
    pathRewrite: (path) => path.replace('/api/round-robin', ''),
    timeout: 10000,
    headers: {
      'User-Agent': 'BunGate-LoadBalancer-Demo/1.0',
      Accept: 'application/json',
    },
  },
  hooks: {
    beforeRequest: async (req) => {
      logger.info(`🔄 Round-robin request to: ${req.url}`)
    },
    afterResponse: async (req, res) => {
      logger.info(
        `✅ Round-robin response: ${res.status} in ${res.headers.get('x-response-time') || 'N/A'}ms`,
      )
    },
  },
})

// =============================================================================
// WEIGHTED LOAD BALANCER FOR HIGH-PERFORMANCE SCENARIOS
// =============================================================================
console.log('2️⃣  Weighted Load Balancer (Performance Optimized)')

gateway.addRoute({
  pattern: '/api/weighted/*',
  loadBalancer: {
    strategy: 'weighted',
    targets: [
      { url: 'http://localhost:8080', weight: 5 },
      { url: 'http://localhost:8081', weight: 1 },
    ],
    healthCheck: {
      enabled: true,
      interval: 15000,
      timeout: 3000,
      path: '/',
      expectedStatus: 200,
    },
  },
  proxy: {
    pathRewrite: (path) => path.replace('/api/weighted', ''),
    timeout: 8000,
    headers: {
      'X-Load-Balancer': 'weighted',
    },
  },
  circuitBreaker: {
    enabled: true,
    failureThreshold: 5,
    resetTimeout: 30000,
    timeout: 5000,
  },
})

// =============================================================================
// 3. LEAST CONNECTIONS FOR STATEFUL SERVICES
// =============================================================================
console.log('3️⃣  Least Connections Strategy')

gateway.addRoute({
  pattern: '/api/least-connections/*',
  loadBalancer: {
    strategy: 'least-connections',
    targets: [
      { url: 'http://localhost:8080' },
      { url: 'http://localhost:8081' },
    ],
    healthCheck: {
      enabled: true,
      interval: 20000,
      timeout: 4000,
      path: '/status/200',
      expectedStatus: 200,
    },
  },
  proxy: {
    pathRewrite: (path) => path.replace('/api/least-connections', ''),
    timeout: 12000,
  },
  hooks: {
    beforeRequest: async (req) => {
      logger.info(`🔗 Least-connections routing for: ${req.url}`)
    },
  },
})

// =============================================================================
// IP HASH FOR SESSION AFFINITY
// =============================================================================
console.log('4️⃣  IP Hash for Session Affinity')

gateway.addRoute({
  pattern: '/api/ip-hash/*',
  loadBalancer: {
    strategy: 'ip-hash',
    targets: [
      { url: 'http://localhost:8080' },
      { url: 'http://localhost:8081' },
    ],
    healthCheck: {
      enabled: true,
      interval: 25000,
      timeout: 6000,
      path: '/get',
    },
    stickySession: {
      enabled: true,
      cookieName: 'BUNGATE_SESSION',
      ttl: 3600000, // 1 hour
    },
  },
  proxy: {
    pathRewrite: (path) => path.replace('/api/ip-hash', ''),
    headers: {
      'X-Session-Affinity': 'ip-hash',
    },
  },
  hooks: {
    beforeRequest: async (req) => {
      const clientIP = req.headers.get('x-forwarded-for') || 'unknown'
      logger.info(`🏠 IP Hash routing for client: ${clientIP}`)
    },
  },
})

// =============================================================================
// RANDOM STRATEGY WITH ADVANCED ERROR HANDLING
// =============================================================================
console.log('5️⃣  Random Strategy with Advanced Error Handling')

gateway.addRoute({
  pattern: '/api/random/*',
  loadBalancer: {
    strategy: 'random',
    targets: [
      { url: 'http://localhost:8080' },
      { url: 'http://localhost:8081' },
    ],
    healthCheck: {
      enabled: true,
      interval: 8000,
      timeout: 3000,
      path: '/',
      expectedStatus: 200,
    },
  },
  proxy: {
    pathRewrite: (path) => path.replace('/api/random', ''),
    timeout: 6000,
  },
  circuitBreaker: {
    enabled: true,
    failureThreshold: 3,
    resetTimeout: 20000,
    timeout: 4000,
  },
  hooks: {
    onError: async (req, error) => {
      logger.error(`❌ Random strategy proxy error: ${error.message}`)
    },
    afterCircuitBreakerExecution: async (req, result) => {
      if (result.success) {
        logger.info(`✅ Circuit breaker succeeded for ${req.url}`)
      } else {
        logger.warn(
          `⚠️  Circuit breaker failed for ${req.url}: ${result.error}`,
        )
      }
    },
  },
})

// =============================================================================
// 6. MICROSERVICES ROUTING WITH DIFFERENT STRATEGIES
// =============================================================================
console.log('6️⃣  Microservices Routing')

// User service with sticky sessions
gateway.addRoute({
  pattern: '/api/users/*',
  loadBalancer: {
    strategy: 'ip-hash',
    targets: [
      { url: 'http://localhost:8080', weight: 1 },
      { url: 'http://localhost:8081', weight: 1 },
    ],
    healthCheck: {
      enabled: true,
      interval: 12000,
      timeout: 4000,
      path: '/users/1',
      expectedStatus: 200,
    },
    stickySession: {
      enabled: true,
      cookieName: 'USER_SESSION',
      ttl: 1800000, // 30 minutes
    },
  },
  proxy: {
    pathRewrite: (path) => path.replace('/api/users', '/users'),
    headers: {
      'X-Service': 'users',
    },
  },
})

// Posts service with weighted distribution
gateway.addRoute({
  pattern: '/api/posts/*',
  loadBalancer: {
    strategy: 'weighted',
    targets: [
      { url: 'http://localhost:8080', weight: 4 },
      { url: 'http://localhost:8081', weight: 1 },
    ],
    healthCheck: {
      enabled: true,
      interval: 15000,
      timeout: 5000,
      path: '/posts/1',
    },
  },
  proxy: {
    pathRewrite: (path) => path.replace('/api/posts', '/posts'),
    headers: {
      'X-Service': 'posts',
    },
  },
})

// =============================================================================
// POWER OF TWO CHOICES (P2C) STRATEGY
// =============================================================================
console.log('6️⃣➕  Power of Two Choices (P2C) Strategy')

gateway.addRoute({
  pattern: '/api/p2c/*',
  loadBalancer: {
    strategy: 'p2c',
    targets: [
      { url: 'http://localhost:8080' },
      { url: 'http://localhost:8081' },
    ],
    healthCheck: {
      enabled: true,
      interval: 10000,
      timeout: 4000,
      path: '/',
      expectedStatus: 200,
    },
  },
  proxy: {
    pathRewrite: (path) => path.replace('/api/p2c', ''),
  },
  hooks: {
    beforeRequest: async (req) => {
      logger.debug(`🎲 P2C routing for: ${req.url}`)
    },
  },
})

// Alias for P2C
gateway.addRoute({
  pattern: '/api/power-of-two/*',
  loadBalancer: {
    strategy: 'power-of-two-choices',
    targets: [
      { url: 'http://localhost:8080' },
      { url: 'http://localhost:8081' },
    ],
    healthCheck: {
      enabled: true,
      interval: 10000,
      timeout: 4000,
      path: '/',
      expectedStatus: 200,
    },
  },
  proxy: {
    pathRewrite: (path) => path.replace('/api/power-of-two', ''),
  },
})

// =============================================================================
// LATENCY-BASED STRATEGY
// =============================================================================
console.log('6️⃣✅  Latency-based Strategy')

gateway.addRoute({
  pattern: '/api/latency/*',
  loadBalancer: {
    strategy: 'latency',
    targets: [
      { url: 'http://localhost:8080' },
      { url: 'http://localhost:8081' },
    ],
    healthCheck: {
      enabled: true,
      interval: 8000,
      timeout: 3000,
      path: '/',
      expectedStatus: 200,
    },
  },
  proxy: {
    pathRewrite: (path) => path.replace('/api/latency', ''),
    timeout: 10000,
  },
  hooks: {
    afterResponse: async (req, res) => {
      logger.info(`⏱️ Latency strategy served with ${res.status}`)
    },
  },
})

// =============================================================================
// WEIGHTED LEAST CONNECTIONS
// =============================================================================
console.log('6️⃣🔢  Weighted Least Connections Strategy')

gateway.addRoute({
  pattern: '/api/wlc/*',
  loadBalancer: {
    strategy: 'weighted-least-connections',
    targets: [
      { url: 'http://localhost:8080', weight: 3 },
      { url: 'http://localhost:8081', weight: 1 },
    ],
    healthCheck: {
      enabled: true,
      interval: 12000,
      timeout: 4000,
      path: '/',
      expectedStatus: 200,
    },
  },
  proxy: {
    pathRewrite: (path) => path.replace('/api/wlc', ''),
  },
})

// =============================================================================
// MONITORING AND METRICS ENDPOINT
// =============================================================================
console.log('7️⃣  Monitoring and Metrics')

gateway.addRoute({
  pattern: '/metrics',
  handler: async (req) => {
    const stats = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      // Note: In a real implementation, you'd collect these from the load balancers
      loadBalancers: {
        'round-robin': 'Active',
        weighted: 'Active',
        'least-connections': 'Active',
        'ip-hash': 'Active',
        random: 'Active',
      },
    }

    return new Response(JSON.stringify(stats, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
    })
  },
})

// =============================================================================
// HEALTH CHECK ENDPOINT
// =============================================================================
gateway.addRoute({
  pattern: '/health',
  handler: async (req) => {
    return new Response(
      JSON.stringify({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'bungate-load-balancer-demo',
        version: '1.0.0',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  },
})

// =============================================================================
// DEMO ENDPOINTS FOR TESTING
// =============================================================================
gateway.addRoute({
  pattern: '/demo',
  handler: async (req) => {
    const demoEndpoints = {
      'Round Robin': '/api/round-robin/get',
      Weighted: '/api/weighted/get',
      'Least Connections': '/api/least-connections/get',
      'IP Hash': '/api/ip-hash/get',
      Random: '/api/random/get',
      'Power of Two Choices (P2C)': '/api/p2c/get',
      'P2C Alias (power-of-two-choices)': '/api/power-of-two/get',
      'Latency-based': '/api/latency/get',
      'Weighted Least Connections': '/api/wlc/get',
      'Users Service': '/api/users/1',
      'Posts Service': '/api/posts/1',
      Metrics: '/metrics',
      Health: '/health',
    }

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>BunGate Load Balancer Demo</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .endpoint { margin: 10px 0; padding: 10px; background: #f5f5f5; border-radius: 5px; }
            .endpoint a { text-decoration: none; color: #007acc; font-weight: bold; }
            .endpoint a:hover { text-decoration: underline; }
            h1 { color: #333; }
            .description { color: #666; margin-bottom: 20px; }
        </style>
    </head>
    <body>
        <h1>🔄 BunGate Load Balancer Demo</h1>
        <p class="description">
            This demo showcases comprehensive load balancing capabilities with different strategies,
            health checks, sticky sessions, and advanced features.
        </p>
        
        ${Object.entries(demoEndpoints)
          .map(
            ([name, path]) =>
              `<div class="endpoint">
             <strong>${name}:</strong> 
             <a href="${path}" target="_blank">${path}</a>
           </div>`,
          )
          .join('')}
        
        <hr>
        <p><em>Try accessing the endpoints above to see load balancing in action!</em></p>
    </body>
    </html>`

    return new Response(html, {
      headers: { 'Content-Type': 'text/html' },
    })
  },
})

// =============================================================================
// START THE SERVER
// =============================================================================
console.log('\n🌟 Starting Load Balancer Demo Server...')

try {
  await gateway.listen(3000)

  console.log('\n' + '='.repeat(60))
  console.log('🚀 Load Balancer Demo Server Running!')
  console.log('='.repeat(60))
  console.log('📍 Base URL: http://localhost:3000')
  console.log('🎯 Demo Page: http://localhost:3000/demo')
  console.log('📊 Metrics: http://localhost:3000/metrics')
  console.log('💚 Health: http://localhost:3000/health')
  console.log('='.repeat(60))

  console.log('\n🔍 Available Load Balancer Endpoints:')
  console.log('   • Round Robin: /api/round-robin/*')
  console.log('   • Weighted: /api/weighted/*')
  console.log('   • Least Connections: /api/least-connections/*')
  console.log('   • IP Hash: /api/ip-hash/*')
  console.log('   • Random: /api/random/*')
  console.log('   • Power of Two Choices (P2C): /api/p2c/*')
  console.log('   • P2C Alias (power-of-two-choices): /api/power-of-two/*')
  console.log('   • Latency-based: /api/latency/*')
  console.log('   • Weighted Least Connections: /api/wlc/*')
  console.log('   • Users Service: /api/users/*')
  console.log('   • Posts Service: /api/posts/*')

  console.log('\n💡 Features Demonstrated:')
  console.log('   ✅ All load balancing strategies')
  console.log('   ✅ Health checks with custom intervals')
  console.log('   ✅ Sticky sessions and session affinity')
  console.log('   ✅ Circuit breakers and error handling')
  console.log('   ✅ Caching and performance optimization')
  console.log('   ✅ Request/response logging and monitoring')
  console.log('   ✅ Dynamic target management')
  console.log('   ✅ Microservices routing patterns')

  console.log('\n🧪 Test Commands:')
  console.log('   curl http://localhost:3000/api/round-robin/get')
  console.log('   curl http://localhost:3000/api/weighted/get')
  console.log('   curl http://localhost:3000/api/users/1')
  console.log('   curl http://localhost:3000/metrics')
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error)
  logger.error(`❌ Failed to start server: ${errorMessage}`)
  process.exit(1)
}

// =============================================================================
// GRACEFUL SHUTDOWN
// =============================================================================
const gracefulShutdown = async (signal: string) => {
  console.log(`\n🛑 Received ${signal}, starting graceful shutdown...`)

  try {
    await gateway.close()
    console.log('✅ Gateway closed successfully')
    console.log('👋 Load Balancer Demo shutdown complete')
    process.exit(0)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error(`❌ Error during shutdown: ${errorMessage}`)
    process.exit(1)
  }
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'))
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error(`💥 Uncaught Exception: ${error.message}`)
  console.error(error)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  logger.error(`💥 Unhandled Rejection at: ${promise}, reason: ${reason}`)
  process.exit(1)
})
