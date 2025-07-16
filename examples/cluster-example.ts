import { BunGateway, BunGateLogger } from '../src'
import { cpus } from 'os'

const logger = new BunGateLogger({
  level: 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  },
})

const gateway = new BunGateway({
  server: {
    port: 3000,
    development: false,
  },
  logger,
  cluster: {
    enabled: true,
    workers: cpus().length,
    restartWorkers: true,
    maxRestarts: 10,
    restartDelay: 1000,
    shutdownTimeout: 30000,
  },
})

// Add a simple route for testing
gateway.addRoute({
  pattern: '/health',
  handler: async (req) => {
    return new Response(
      JSON.stringify({
        status: 'healthy',
        worker: process.env.CLUSTER_WORKER_ID || 'master',
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      },
    )
  },
})

// Add a load balancing route
gateway.addRoute({
  pattern: '/api/*',
  loadBalancer: {
    targets: [
      { url: 'http://localhost:8080', weight: 1 },
      { url: 'http://localhost:8081', weight: 1 },
    ],
    strategy: 'round-robin',
    healthCheck: {
      enabled: true,
      interval: 10000,
      timeout: 5000,
      path: '/health',
    },
  },
})

// Start the gateway
await gateway.listen(3000)

console.log('BunGate cluster example started')
console.log(`Master process: ${process.pid}`)
console.log(
  `Cluster mode: ${gateway.getConfig().cluster?.enabled ? 'enabled' : 'disabled'}`,
)
console.log(`Workers: ${gateway.getConfig().cluster?.workers || 1}`)
console.log('Visit http://localhost:3000/health to test')
