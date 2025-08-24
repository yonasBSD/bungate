import { test, expect } from 'bun:test'
import { ClusterManager } from '../../src'
import { BunGateLogger } from '../../src'

const logger = new BunGateLogger({
  level: 'error',
  enableRequestLogging: false,
})
const workerScript = `${import.meta.dir}/fixtures/worker.ts`

function makeManager(
  overrides: Partial<import('../../src').ClusterConfig> = {},
) {
  return new ClusterManager(
    {
      enabled: true,
      workers: 2,
      restartWorkers: false,
      shutdownTimeout: 2000,
      exitOnShutdown: false,
      ...overrides,
    },
    logger,
    workerScript,
  )
}

test('ClusterManager > start spawns requested workers and is idempotent', async () => {
  const cm = makeManager({ workers: 2 })
  await cm.start()
  expect(cm.getWorkerCount()).toBe(2)
  await cm.start() // idempotent
  expect(cm.getWorkerCount()).toBe(2)
  await (cm as any).gracefulShutdown()
  expect(cm.getWorkerCount()).toBe(0)
})

test('ClusterManager > scale up and down dynamically', async () => {
  const cm = makeManager({ workers: 1 })
  await cm.start()
  expect(cm.getWorkerCount()).toBe(1)
  await cm.scaleUp(2)
  expect(cm.getWorkerCount()).toBe(3)
  await cm.scaleDown(2)
  // allow SIGTERM to process
  await new Promise((r) => setTimeout(r, 300))
  expect(cm.getWorkerCount()).toBe(1)
  await (cm as any).gracefulShutdown()
})
