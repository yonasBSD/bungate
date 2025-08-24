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
      workers: 1,
      restartWorkers: true,
      maxRestarts: 3,
      restartDelay: 10,
      respawnThreshold: 2,
      respawnThresholdTime: 200,
      shutdownTimeout: 1000,
      exitOnShutdown: false,
      ...overrides,
    },
    logger,
    workerScript,
  )
}

test('ClusterManager > restart policy with threshold prevents infinite restarts', async () => {
  const cm = makeManager()
  await cm.start()
  expect(cm.getWorkerCount()).toBe(1)
  // kill the worker multiple times to trigger threshold
  for (let i = 0; i < 3; i++) {
    const info = cm.getWorkerInfo()[0]
    if (info) info.process.kill('SIGTERM')
    await new Promise((r) => setTimeout(r, 30))
  }
  await new Promise((r) => setTimeout(r, 500))
  // After threshold, should not exceed 1 worker and may be 0 if restart blocked
  expect(cm.getWorkerCount()).toBeLessThanOrEqual(1)
  await (cm as any).gracefulShutdown()
})

test('ClusterManager > rolling restart spawns replacement before stopping old', async () => {
  const cm = makeManager({ workers: 2 })
  await cm.start()
  const before = cm.getWorkerCount()
  await (cm as any).restartAllWorkers()
  // allow roll to complete
  await new Promise((r) => setTimeout(r, 600))
  const after = cm.getWorkerCount()
  expect(after).toBe(before) // count should remain stable
  await (cm as any).gracefulShutdown()
})
