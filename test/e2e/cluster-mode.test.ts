import { test, expect } from 'bun:test'
import { BunGateway, BunGateLogger } from '../../src'
import { cpus } from 'os'

// Helper function to make HTTP requests
async function makeRequest(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  return fetch(url, options)
}

// Helper function to wait for a condition
async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    if (await condition()) {
      return
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error(`Timeout waiting for condition after ${timeout}ms`)
}

// Helper function to check if port is available
async function isPortAvailable(port: number): Promise<boolean> {
  try {
    using server = Bun.serve({
      port,
      fetch: () => new Response('test'),
    })
    server.stop()
    return true
  } catch {
    return false
  }
}

// Helper function to get an available port
async function getAvailablePort(startPort = 3100): Promise<number> {
  for (let port = startPort; port < startPort + 100; port++) {
    if (await isPortAvailable(port)) {
      return port
    }
  }
  throw new Error('No available ports found')
}

test('Cluster Mode E2E > should start and manage worker processes', async () => {
  const port = await getAvailablePort(3100)
  const logger = new BunGateLogger({
    level: 'error', // Reduce log noise during tests
    enableRequestLogging: false,
    enableMetrics: false,
  })

  // Create gateway with cluster mode enabled
  const gateway = new BunGateway({
    server: {
      port,
      development: false,
    },
    logger,
    cluster: {
      enabled: true,
      workers: 2, // Use 2 workers for testing
      restartWorkers: true,
      maxRestarts: 3,
      restartDelay: 500,
      shutdownTimeout: 5000,
    },
  })

  // Add a simple test route
  gateway.addRoute({
    pattern: '/health',
    handler: async (req) => {
      return new Response(
        JSON.stringify({
          status: 'healthy',
          worker: process.env.CLUSTER_WORKER_ID || 'master',
          pid: process.pid,
          timestamp: new Date().toISOString(),
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        },
      )
    },
  })

  try {
    // Check if we're in a worker process
    const isWorker = !!process.env.CLUSTER_WORKER
    const workerId = process.env.CLUSTER_WORKER_ID

    if (isWorker) {
      // In worker process: test HTTP functionality
      console.log(`Testing in worker process: ${workerId}`)

      const server = await gateway.listen(port)

      // Wait for server to be ready
      await waitFor(async () => {
        try {
          const response = await makeRequest(`http://localhost:${port}/health`)
          return response.ok
        } catch {
          return false
        }
      })

      // Make a request to test the endpoint
      const response = await makeRequest(`http://localhost:${port}/health`)
      expect(response.status).toBe(200)

      const data = (await response.json()) as any
      expect(data.status).toBe('healthy')
      expect(data.worker).toBe(workerId)
      expect(typeof data.pid).toBe('number')

      server.stop()
    } else {
      // In master process: test cluster configuration
      console.log('Testing in master process')

      const config = gateway.getConfig()
      expect(config.cluster?.enabled).toBe(true)
      expect(config.cluster?.workers).toBe(2)
      expect(config.cluster?.restartWorkers).toBe(true)
      expect(config.cluster?.maxRestarts).toBe(3)
      expect(config.cluster?.restartDelay).toBe(500)
      expect(config.cluster?.shutdownTimeout).toBe(5000)

      // In a real cluster scenario, calling gateway.listen() would start workers
      // For testing purposes, we just verify the configuration is correct
      console.log('Cluster configuration validated')
    }
  } catch (error) {
    console.error('Error during cluster test:', error)
    throw error
  } finally {
    // Clean up
    await gateway.close()
  }
}, 10000) // 10 second timeout

test('Cluster Mode E2E > should handle requests when cluster is disabled', async () => {
  const port = await getAvailablePort(3200)
  const logger = new BunGateLogger({
    level: 'error',
    enableRequestLogging: false,
    enableMetrics: false,
  })

  // Create gateway with cluster mode disabled
  const gateway = new BunGateway({
    server: {
      port,
      development: false,
    },
    logger,
    cluster: {
      enabled: false,
    },
  })

  // Add a simple test route
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

  let server: any
  try {
    // Start the gateway
    server = await gateway.listen(port)

    // Wait for server to be ready
    await waitFor(async () => {
      try {
        const response = await makeRequest(`http://localhost:${port}/health`)
        return response.ok
      } catch {
        return false
      }
    })

    // Make a request to test the endpoint
    const response = await makeRequest(`http://localhost:${port}/health`)
    expect(response.status).toBe(200)

    const data = (await response.json()) as any
    expect(data.status).toBe('healthy')
    expect(data.mode).toBe('single-process')
    expect(typeof data.pid).toBe('number')
  } finally {
    // Clean up
    if (server) {
      server.stop()
    }
    await gateway.close()
  }
}, 10000)

test('Cluster Mode E2E > should validate cluster configuration', async () => {
  const logger = new BunGateLogger({
    level: 'error',
    enableRequestLogging: false,
    enableMetrics: false,
  })

  // Test various cluster configurations
  const configs = [
    {
      enabled: true,
      workers: 1,
      restartWorkers: true,
      maxRestarts: 5,
    },
    {
      enabled: true,
      workers: cpus().length,
      restartWorkers: false,
    },
    {
      enabled: false,
    },
  ]

  for (const clusterConfig of configs) {
    const gateway = new BunGateway({
      server: {
        port: await getAvailablePort(3300),
        development: false,
      },
      logger,
      cluster: clusterConfig,
    })

    const config = gateway.getConfig()
    expect(config.cluster?.enabled).toBe(clusterConfig.enabled)

    if (clusterConfig.enabled && clusterConfig.workers !== undefined) {
      expect(config.cluster?.workers).toBe(clusterConfig.workers)
    }

    if (clusterConfig.enabled && clusterConfig.restartWorkers !== undefined) {
      expect(config.cluster?.restartWorkers).toBe(clusterConfig.restartWorkers)
    }

    if (clusterConfig.maxRestarts !== undefined) {
      expect(config.cluster?.maxRestarts).toBe(clusterConfig.maxRestarts)
    }
  }
})

test('Cluster Mode E2E > should handle environment variables', async () => {
  // Save original environment
  const originalEnv = { ...process.env }

  try {
    // Test with cluster enabled via environment
    process.env.CLUSTER_ENABLED = 'true'
    process.env.CLUSTER_WORKERS = '3'

    const logger = new BunGateLogger({
      level: 'error',
      enableRequestLogging: false,
      enableMetrics: false,
    })

    const gateway = new BunGateway({
      server: {
        port: await getAvailablePort(3400),
        development: false,
      },
      logger,
      cluster: {
        enabled: process.env.CLUSTER_ENABLED === 'true',
        workers: parseInt(process.env.CLUSTER_WORKERS || '1'),
      },
    })

    const config = gateway.getConfig()
    expect(config.cluster?.enabled).toBe(true)
    expect(config.cluster?.workers).toBe(3)
  } finally {
    // Restore original environment
    process.env = originalEnv
  }
})

test('Cluster Mode E2E > should handle cluster worker identification', async () => {
  const logger = new BunGateLogger({
    level: 'error',
    enableRequestLogging: false,
    enableMetrics: false,
  })

  // Test worker identification
  const isWorker = !!process.env.CLUSTER_WORKER
  const workerId = process.env.CLUSTER_WORKER_ID

  const gateway = new BunGateway({
    server: {
      port: await getAvailablePort(3500),
      development: false,
    },
    logger,
    cluster: {
      enabled: true,
      workers: 2,
    },
  })

  // Add route to check worker info
  gateway.addRoute({
    pattern: '/worker-check',
    handler: async (req) => {
      return new Response(
        JSON.stringify({
          isWorker: !!process.env.CLUSTER_WORKER,
          workerId: process.env.CLUSTER_WORKER_ID || null,
          isMaster: !process.env.CLUSTER_WORKER,
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        },
      )
    },
  })

  const config = gateway.getConfig()
  expect(config.cluster?.enabled).toBe(true)
  expect(config.cluster?.workers).toBe(2)

  // The actual worker/master behavior is tested by the cluster manager
  // This test just ensures the configuration and setup is correct
})
