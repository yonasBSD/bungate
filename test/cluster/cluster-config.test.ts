import { test, expect } from 'bun:test'
import { BunGateway, BunGateLogger } from '../../src'

test('Gateway should initialize with cluster configuration', () => {
  const logger = new BunGateLogger({
    level: 'error',
    enableRequestLogging: false,
  })

  const gateway = new BunGateway({
    server: {
      port: 3001,
      development: false,
    },
    logger,
    cluster: {
      enabled: true,
      workers: 2,
      restartWorkers: true,
      maxRestarts: 5,
      restartDelay: 1000,
      shutdownTimeout: 20000,
    },
  })

  const config = gateway.getConfig()
  expect(config.cluster?.enabled).toBe(true)
  expect(config.cluster?.workers).toBe(2)
  expect(config.cluster?.restartWorkers).toBe(true)
  expect(config.cluster?.maxRestarts).toBe(5)
  expect(config.cluster?.restartDelay).toBe(1000)
  expect(config.cluster?.shutdownTimeout).toBe(20000)
})

test('Gateway should work without cluster configuration', () => {
  const logger = new BunGateLogger({
    level: 'error',
    enableRequestLogging: false,
  })

  const gateway = new BunGateway({
    server: {
      port: 3002,
      development: false,
    },
    logger,
  })

  const config = gateway.getConfig()
  expect(config.cluster?.enabled).toBeUndefined()
})

test('Gateway should handle cluster disabled configuration', () => {
  const logger = new BunGateLogger({
    level: 'error',
    enableRequestLogging: false,
  })

  const gateway = new BunGateway({
    server: {
      port: 3003,
      development: false,
    },
    logger,
    cluster: {
      enabled: false,
    },
  })

  const config = gateway.getConfig()
  expect(config.cluster?.enabled).toBe(false)
})
