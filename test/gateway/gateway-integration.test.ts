import { describe, test, expect, beforeAll, afterAll } from 'bun:test'
import { BunGateway } from '../../src/gateway/gateway.ts'
import type {
  ZeroRequest,
  StepFunction,
} from '../../src/interfaces/middleware.ts'

describe('BunGateway Integration', () => {
  let gateway: BunGateway
  let server: any
  let baseUrl: string

  beforeAll(async () => {
    gateway = new BunGateway()

    // Add some test routes
    gateway.get('/health', () => {
      return Response.json({ status: 'ok', timestamp: Date.now() })
    })

    gateway.get('/users/:id', (req: ZeroRequest) => {
      return Response.json({
        id: req.params.id,
        name: `User ${req.params.id}`,
        query: req.query,
      })
    })

    gateway.post('/api/data', async (req: ZeroRequest) => {
      const body = await req.json()
      return Response.json(
        {
          received: body,
          method: req.method,
          timestamp: Date.now(),
        },
        { status: 201 },
      )
    })

    // Add middleware
    gateway.use((req: ZeroRequest, next: StepFunction) => {
      req.ctx = { ...req.ctx, requestId: Math.random().toString(36).slice(2) }
      return next()
    })

    gateway.get('/middleware-test', (req: ZeroRequest) => {
      return Response.json({ requestId: req.ctx?.requestId })
    })

    // Start server on a random port
    server = await gateway.listen(0)
    baseUrl = `http://localhost:${server.port}`
  })

  afterAll(async () => {
    if (gateway) {
      await gateway.close()
    }
  })

  test('should respond to health check', async () => {
    const response = await fetch(`${baseUrl}/health`)
    expect(response.status).toBe(200)

    const data = (await response.json()) as {
      status: string
      timestamp: number
    }
    expect(data.status).toBe('ok')
    expect(data.timestamp).toBeGreaterThan(0)
  })

  test('should handle path parameters', async () => {
    const response = await fetch(`${baseUrl}/users/123?role=admin`)
    expect(response.status).toBe(200)

    const data = (await response.json()) as {
      id: string
      name: string
      query: any
    }
    expect(data.id).toBe('123')
    expect(data.name).toBe('User 123')
    expect(data.query.role).toBe('admin')
  })

  test('should handle POST requests with JSON body', async () => {
    const payload = { message: 'Hello, World!', count: 42 }
    const response = await fetch(`${baseUrl}/api/data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    expect(response.status).toBe(201)

    const data = (await response.json()) as {
      received: any
      method: string
      timestamp: number
    }
    expect(data.method).toBe('POST')
    expect(data.received).toEqual(payload)
    expect(data.timestamp).toBeGreaterThan(0)
  })

  test('should execute middleware correctly', async () => {
    const response = await fetch(`${baseUrl}/middleware-test`)
    expect(response.status).toBe(200)

    const data = (await response.json()) as { requestId: string }
    expect(data.requestId).toBeDefined()
    expect(typeof data.requestId).toBe('string')
    expect(data.requestId.length).toBeGreaterThan(0)
  })

  test('should return 404 for unknown routes', async () => {
    const response = await fetch(`${baseUrl}/unknown-route`)
    expect(response.status).toBe(404)
  })

  test('should handle concurrent requests', async () => {
    const promises = Array.from({ length: 10 }, (_, i) =>
      fetch(`${baseUrl}/health`).then((r) => r.json()),
    )

    const results = await Promise.all(promises)
    expect(results).toHaveLength(10)

    for (const result of results) {
      expect((result as any).status).toBe('ok')
    }
  })
})
