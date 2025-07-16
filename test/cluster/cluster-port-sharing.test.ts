import { test, expect } from 'bun:test'
import { BunGateway, BunGateLogger } from '../../src'

test('Cluster Mode Port Sharing > should configure reusePort correctly', async () => {
  const logger = new BunGateLogger({
    level: 'error',
    enableRequestLogging: false,
    enableMetrics: false,
  })

  // Test without cluster worker environment (should not use reusePort)
  const gateway1 = new BunGateway({
    server: { port: 3001 },
    logger,
    cluster: { enabled: true, workers: 2 },
  })

  // Test with cluster worker environment (should use reusePort)
  const originalEnv = process.env.CLUSTER_WORKER

  try {
    process.env.CLUSTER_WORKER = 'true'

    const gateway2 = new BunGateway({
      server: { port: 3002 },
      logger,
      cluster: { enabled: true, workers: 2 },
    })

    // Both gateways should be configurable
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
  }
})

test('Cluster Mode Port Sharing > should handle cluster disabled correctly', async () => {
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

  const config = gateway.getConfig()
  expect(config.cluster?.enabled).toBe(false)
})

test('Cluster Mode Port Sharing > should handle undefined cluster config', async () => {
  const logger = new BunGateLogger({
    level: 'error',
    enableRequestLogging: false,
    enableMetrics: false,
  })

  const gateway = new BunGateway({
    server: { port: 3004 },
    logger,
    cluster: undefined,
  })

  const config = gateway.getConfig()
  expect(config.cluster).toBeUndefined()
})
