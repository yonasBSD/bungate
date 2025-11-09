import { describe, test, expect } from 'bun:test'
import {
  createSizeLimiterMiddleware,
  sizeLimiterMiddleware,
} from '../../src/security/size-limiter-middleware'
import type { ZeroRequest } from '../../src/interfaces/middleware'

describe('SizeLimiterMiddleware', () => {
  describe('factory functions', () => {
    test('should create middleware with default config', () => {
      const middleware = sizeLimiterMiddleware()
      expect(middleware).toBeDefined()
      expect(typeof middleware).toBe('function')
    })

    test('should create middleware with custom limits', () => {
      const middleware = createSizeLimiterMiddleware({
        limits: {
          maxBodySize: 5000,
          maxUrlLength: 1000,
        },
      })
      expect(middleware).toBeDefined()
    })

    test('should create middleware with custom error handler', () => {
      const customHandler = () => new Response('Custom error', { status: 400 })
      const middleware = createSizeLimiterMiddleware({
        onSizeExceeded: customHandler,
      })
      expect(middleware).toBeDefined()
    })
  })

  describe('request validation', () => {
    test('should allow valid request to pass through', async () => {
      const middleware = sizeLimiterMiddleware()
      const req = new Request('http://example.com/api/users', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }) as ZeroRequest

      let nextCalled = false
      const next = async () => {
        nextCalled = true
        return new Response('OK')
      }

      const response = await middleware(req, next)
      expect(nextCalled).toBe(true)
      expect(response.status).toBe(200)
    })

    test('should reject request with oversized body', async () => {
      const middleware = createSizeLimiterMiddleware({
        limits: { maxBodySize: 100 },
      })
      const req = new Request('http://example.com/api/users', {
        method: 'POST',
        headers: { 'Content-Length': '1000' },
      }) as ZeroRequest

      const next = async () => new Response('Should not reach here')
      const response = await middleware(req, next)

      expect(response.status).toBe(413) // Payload Too Large
      const body = (await response.json()) as any
      expect(body.error.code).toBe('PAYLOAD_TOO_LARGE')
      expect(body.error.details).toBeDefined()
    })

    test('should reject request with oversized URL', async () => {
      const middleware = createSizeLimiterMiddleware({
        limits: { maxUrlLength: 50 },
      })
      const longUrl =
        'http://example.com/api/users/with/very/long/path/that/exceeds/limit'
      const req = new Request(longUrl, {
        method: 'GET',
      }) as ZeroRequest

      const next = async () => new Response('Should not reach here')
      const response = await middleware(req, next)

      expect(response.status).toBe(414) // URI Too Long
      const body = (await response.json()) as any
      expect(body.error.code).toBe('URI_TOO_LONG')
    })

    test('should reject request with too many headers', async () => {
      const middleware = createSizeLimiterMiddleware({
        limits: { maxHeaderCount: 2 },
      })
      const req = new Request('http://example.com/api/users', {
        method: 'GET',
        headers: {
          Header1: 'value1',
          Header2: 'value2',
          Header3: 'value3',
        },
      }) as ZeroRequest

      const next = async () => new Response('Should not reach here')
      const response = await middleware(req, next)

      // Should return 431 or 400 depending on error order
      expect([400, 431]).toContain(response.status)
      const body = (await response.json()) as any
      expect(body.error.details).toBeDefined()
      expect(body.error.details[0]).toContain('Header count')
    })

    test('should reject request with oversized headers', async () => {
      const middleware = createSizeLimiterMiddleware({
        limits: { maxHeaderSize: 50 },
      })
      const req = new Request('http://example.com/api/users', {
        method: 'GET',
        headers: {
          'X-Long-Header': 'Very long header value that exceeds the size limit',
        },
      }) as ZeroRequest

      const next = async () => new Response('Should not reach here')
      const response = await middleware(req, next)

      expect(response.status).toBe(431)
      const body = (await response.json()) as any
      expect(body.error.code).toBe('HEADERS_TOO_LARGE')
    })

    test('should reject request with too many query params', async () => {
      const middleware = createSizeLimiterMiddleware({
        limits: { maxQueryParams: 2 },
      })
      const req = new Request('http://example.com/api/users?a=1&b=2&c=3', {
        method: 'GET',
      }) as ZeroRequest

      const next = async () => new Response('Should not reach here')
      const response = await middleware(req, next)

      expect(response.status).toBe(414) // URI Too Long (query params are part of URI)
      const body = (await response.json()) as any
      expect(body.error.code).toBe('URI_TOO_LONG')
    })
  })

  describe('error responses', () => {
    test('should include request ID in error response', async () => {
      const middleware = createSizeLimiterMiddleware({
        limits: { maxBodySize: 10 },
      })
      const req = new Request('http://example.com/api/users', {
        method: 'POST',
        headers: { 'Content-Length': '1000' },
      }) as ZeroRequest

      const next = async () => new Response('Should not reach here')
      const response = await middleware(req, next)

      const body = (await response.json()) as any
      expect(body.error.requestId).toBeDefined()
      expect(typeof body.error.requestId).toBe('string')
    })

    test('should include timestamp in error response', async () => {
      const middleware = createSizeLimiterMiddleware({
        limits: { maxBodySize: 10 },
      })
      const req = new Request('http://example.com/api/users', {
        method: 'POST',
        headers: { 'Content-Length': '1000' },
      }) as ZeroRequest

      const next = async () => new Response('Should not reach here')
      const response = await middleware(req, next)

      const body = (await response.json()) as any
      expect(body.error.timestamp).toBeDefined()
      expect(typeof body.error.timestamp).toBe('number')
    })

    test('should include error details', async () => {
      const middleware = createSizeLimiterMiddleware({
        limits: { maxBodySize: 10 },
      })
      const req = new Request('http://example.com/api/users', {
        method: 'POST',
        headers: { 'Content-Length': '1000' },
      }) as ZeroRequest

      const next = async () => new Response('Should not reach here')
      const response = await middleware(req, next)

      const body = (await response.json()) as any
      expect(body.error.details).toBeDefined()
      expect(Array.isArray(body.error.details)).toBe(true)
      expect(body.error.details.length).toBeGreaterThan(0)
    })

    test('should set Content-Type to application/json', async () => {
      const middleware = createSizeLimiterMiddleware({
        limits: { maxBodySize: 10 },
      })
      const req = new Request('http://example.com/api/users', {
        method: 'POST',
        headers: { 'Content-Length': '1000' },
      }) as ZeroRequest

      const next = async () => new Response('Should not reach here')
      const response = await middleware(req, next)

      expect(response.headers.get('Content-Type')).toBe('application/json')
    })

    test('should include X-Request-ID header', async () => {
      const middleware = createSizeLimiterMiddleware({
        limits: { maxBodySize: 10 },
      })
      const req = new Request('http://example.com/api/users', {
        method: 'POST',
        headers: { 'Content-Length': '1000' },
      }) as ZeroRequest

      const next = async () => new Response('Should not reach here')
      const response = await middleware(req, next)

      expect(response.headers.get('X-Request-ID')).toBeDefined()
    })
  })

  describe('custom error handler', () => {
    test('should use custom error handler when provided', async () => {
      const customHandler = (
        errors: string[],
        req: ZeroRequest,
        statusCode: number,
      ) => {
        return new Response(
          JSON.stringify({
            custom: true,
            errors,
            status: statusCode,
          }),
          { status: statusCode },
        )
      }

      const middleware = createSizeLimiterMiddleware({
        limits: { maxBodySize: 10 },
        onSizeExceeded: customHandler,
      })

      const req = new Request('http://example.com/api/users', {
        method: 'POST',
        headers: { 'Content-Length': '1000' },
      }) as ZeroRequest

      const next = async () => new Response('Should not reach here')
      const response = await middleware(req, next)

      const body = (await response.json()) as any
      expect(body.custom).toBe(true)
      expect(body.errors).toBeDefined()
      expect(body.status).toBe(413)
    })
  })

  describe('multiple violations', () => {
    test('should report first violation with appropriate status code', async () => {
      const middleware = createSizeLimiterMiddleware({
        limits: {
          maxUrlLength: 30,
          maxHeaderCount: 1,
          maxBodySize: 10,
        },
      })

      const req = new Request('http://example.com/api/users/with/long/path', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token',
          'Content-Length': '1000',
        },
      }) as ZeroRequest

      const next = async () => new Response('Should not reach here')
      const response = await middleware(req, next)

      // Should use status code from first error
      expect([414, 431, 413]).toContain(response.status)
      const body = (await response.json()) as any
      expect(body.error.details.length).toBeGreaterThan(1)
    })
  })

  describe('error handling', () => {
    test('should handle unexpected errors gracefully', async () => {
      // Create middleware that will throw during validation
      const middleware = createSizeLimiterMiddleware()

      // Create a malformed request that might cause errors
      const req = {
        url: 'not-a-valid-url',
        method: 'GET',
        headers: new Headers(),
      } as unknown as ZeroRequest

      const next = async () => new Response('Should not reach here')
      const response = await middleware(req, next)

      expect(response.status).toBe(500)
      const body = (await response.json()) as any
      expect(body.error.code).toBe('SIZE_VALIDATION_ERROR')
    })
  })
})
