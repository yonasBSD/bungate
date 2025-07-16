import { test, expect } from 'bun:test'
import { BunGateway, BunGateLogger } from '../../src'

// Simple integration test for cluster mode configuration
test('Cluster Mode Integration > should configure cluster properly', async () => {
  const logger = new BunGateLogger({
    level: 'error',
    enableRequestLogging: false,
    enableMetrics: false,
  })

  const gateway = new BunGateway({
    server: {
      port: 3000,
      development: false,
    },
    logger,
    cluster: {
      enabled: true,
      workers: 4,
      restartWorkers: true,
      maxRestarts: 10,
      restartDelay: 1000,
      shutdownTimeout: 30000,
    },
  })

  // Add a test route
  gateway.addRoute({
    pattern: '/health',
    handler: async (req) => {
      return new Response(
        JSON.stringify({
          status: 'healthy',
          worker: process.env.CLUSTER_WORKER_ID || 'master',
          pid: process.pid,
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        },
      )
    },
  })

  // Verify configuration
  const config = gateway.getConfig()
  expect(config.cluster?.enabled).toBe(true)
  expect(config.cluster?.workers).toBe(4)
  expect(config.cluster?.restartWorkers).toBe(true)
  expect(config.cluster?.maxRestarts).toBe(10)
  expect(config.cluster?.restartDelay).toBe(1000)
  expect(config.cluster?.shutdownTimeout).toBe(30000)
})

test('Cluster Mode Integration > should handle worker environment detection', async () => {
  const logger = new BunGateLogger({
    level: 'error',
    enableRequestLogging: false,
    enableMetrics: false,
  })

  // Test without cluster worker environment
  const gateway1 = new BunGateway({
    server: { port: 3001 },
    logger,
    cluster: { enabled: true, workers: 2 },
  })

  // Test with simulated cluster worker environment
  const originalEnv = process.env.CLUSTER_WORKER
  const originalId = process.env.CLUSTER_WORKER_ID

  try {
    process.env.CLUSTER_WORKER = 'true'
    process.env.CLUSTER_WORKER_ID = '1'

    const gateway2 = new BunGateway({
      server: { port: 3002 },
      logger,
      cluster: { enabled: true, workers: 2 },
    })

    // Add route to test worker identification
    gateway2.addRoute({
      pattern: '/worker-info',
      handler: async (req) => {
        return new Response(
          JSON.stringify({
            isWorker: !!process.env.CLUSTER_WORKER,
            workerId: process.env.CLUSTER_WORKER_ID,
            pid: process.pid,
          }),
          {
            headers: { 'Content-Type': 'application/json' },
          },
        )
      },
    })

    // Test configuration
    const config1 = gateway1.getConfig()
    const config2 = gateway2.getConfig()

    expect(config1.cluster?.enabled).toBe(true)
    expect(config2.cluster?.enabled).toBe(true)
    expect(config1.cluster?.workers).toBe(2)
    expect(config2.cluster?.workers).toBe(2)
  } finally {
    // Restore environment
    if (originalEnv) {
      process.env.CLUSTER_WORKER = originalEnv
    } else {
      delete process.env.CLUSTER_WORKER
    }

    if (originalId) {
      process.env.CLUSTER_WORKER_ID = originalId
    } else {
      delete process.env.CLUSTER_WORKER_ID
    }
  }
})

test('Cluster Mode Integration > should handle cluster disabled', async () => {
  const logger = new BunGateLogger({
    level: 'error',
    enableRequestLogging: false,
    enableMetrics: false,
  })

  const gateway = new BunGateway({
    server: { port: 3003 },
    logger,
    cluster: { enabled: false },
  })

  gateway.addRoute({
    pattern: '/health',
    handler: async (req) => {
      return new Response(
        JSON.stringify({
          status: 'healthy',
          mode: 'single-process',
          pid: process.pid,
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        },
      )
    },
  })

  const config = gateway.getConfig()
  expect(config.cluster?.enabled).toBe(false)
})

test('Cluster Mode Integration > should handle default configuration', async () => {
  const logger = new BunGateLogger({
    level: 'error',
    enableRequestLogging: false,
    enableMetrics: false,
  })

  // Test with no cluster configuration
  const gateway1 = new BunGateway({
    server: { port: 3004 },
    logger,
  })

  // Test with empty cluster configuration
  const gateway2 = new BunGateway({
    server: { port: 3005 },
    logger,
    cluster: {},
  })

  const config1 = gateway1.getConfig()
  const config2 = gateway2.getConfig()

  expect(config1.cluster).toBeUndefined()
  expect(config2.cluster).toBeDefined()
  expect(config2.cluster?.enabled).toBeUndefined()
})
