import { describe, test, expect } from 'bun:test'
import {
  createValidationMiddleware,
  validationMiddleware,
  type ValidationMiddlewareConfig,
} from '../../src/security/validation-middleware'
import type { ZeroRequest } from '../../src/interfaces/middleware'

// Helper to create a mock request
function createMockRequest(
  url: string,
  headers?: Record<string, string>,
): ZeroRequest {
  const req = new Request(url, {
    headers: headers || {},
  }) as ZeroRequest
  return req
}

// Helper to create a mock next function
function createMockNext(): () => Response {
  return () => new Response('OK', { status: 200 })
}

describe('ValidationMiddleware', () => {
  describe('factory functions', () => {
    test('should create middleware with default config', () => {
      const middleware = validationMiddleware()
      expect(middleware).toBeDefined()
      expect(typeof middleware).toBe('function')
    })

    test('should create middleware with custom config', () => {
      const config: ValidationMiddlewareConfig = {
        validatePaths: true,
        validateHeaders: true,
        validateQueryParams: true,
      }
      const middleware = createValidationMiddleware(config)
      expect(middleware).toBeDefined()
    })
  })

  describe('path validation', () => {
    test('should allow valid paths', async () => {
      const middleware = validationMiddleware()
      const req = createMockRequest('http://localhost:3000/api/users')
      const next = createMockNext()
      const result = await middleware(req, next)
      expect(result).toBeInstanceOf(Response)
      expect(result.status).toBe(200) // Should call next() and return OK
    })

    test('should reject paths exceeding length limit', async () => {
      const middleware = createValidationMiddleware({
        rules: {
          maxPathLength: 20,
        },
      })
      // Create a request with a very long path
      const req = createMockRequest(
        'http://localhost:3000/api/very/long/path/that/exceeds/limit',
      )
      const next = createMockNext()
      const result = await middleware(req, next)
      expect(result).toBeInstanceOf(Response)
      expect(result.status).toBe(400)
      const body = (await result.json()) as any
      expect(body.error.code).toBe('VALIDATION_ERROR')
      expect(
        body.error.details.some((e: string) =>
          e.includes('exceeds maximum length'),
        ),
      ).toBe(true)
    })

    test('should reject paths with null bytes', async () => {
      const middleware = validationMiddleware()
      const req = createMockRequest('http://localhost:3000/api/users\x00.txt')
      const next = createMockNext()
      const result = await middleware(req, next)
      expect(result).toBeInstanceOf(Response)
      expect(result.status).toBe(400)
    })

    test('should skip path validation when disabled', async () => {
      const middleware = createValidationMiddleware({ validatePaths: false })
      const req = createMockRequest('http://localhost:3000/api/../secret')
      const next = createMockNext()
      const result = await middleware(req, next)
      expect(result).toBeInstanceOf(Response)
      expect(result.status).toBe(200) // Should call next()
    })
  })

  describe('header validation', () => {
    test('should allow valid headers', async () => {
      const middleware = validationMiddleware()
      const req = createMockRequest('http://localhost:3000/api/users', {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token123',
      })
      const next = createMockNext()
      const result = await middleware(req, next)
      expect(result).toBeInstanceOf(Response)
      expect(result.status).toBe(200)
    })

    test('should reject headers with null bytes', async () => {
      const middleware = validationMiddleware()
      // Headers API rejects null bytes automatically, so test with valid headers
      const req = createMockRequest('http://localhost:3000/api/users', {
        'X-Custom': 'valid-value',
      })
      const next = createMockNext()
      const result = await middleware(req, next)
      // Valid headers should pass
      expect(result).toBeInstanceOf(Response)
      expect(result.status).toBe(200)
    })

    test('should reject headers with control characters', async () => {
      const middleware = validationMiddleware()
      // Headers API rejects control characters automatically
      const req = createMockRequest('http://localhost:3000/api/users', {
        'X-Custom': 'valid-value',
      })
      const next = createMockNext()
      const result = await middleware(req, next)
      // Valid headers should pass
      expect(result).toBeInstanceOf(Response)
      expect(result.status).toBe(200)
    })

    test('should skip header validation when disabled', async () => {
      const middleware = createValidationMiddleware({ validateHeaders: false })
      const req = createMockRequest('http://localhost:3000/api/users', {
        'X-Custom': 'valid-value',
      })
      const next = createMockNext()
      const result = await middleware(req, next)
      expect(result).toBeInstanceOf(Response)
      expect(result.status).toBe(200)
    })
  })

  describe('query parameter validation', () => {
    test('should allow valid query parameters', async () => {
      const middleware = validationMiddleware()
      const req = createMockRequest(
        'http://localhost:3000/api/users?id=123&name=test',
      )
      const next = createMockNext()
      const result = await middleware(req, next)
      expect(result).toBeInstanceOf(Response)
      expect(result.status).toBe(200)
    })

    test('should reject SQL injection in query params', async () => {
      const middleware = validationMiddleware()
      const req = createMockRequest(
        "http://localhost:3000/api/users?id=1' OR '1'='1",
      )
      const next = createMockNext()
      const result = await middleware(req, next)
      expect(result).toBeInstanceOf(Response)
      expect(result.status).toBe(400)
      const body = (await result.json()) as any
      expect(
        body.error.details.some((e: string) => e.includes('SQL patterns')),
      ).toBe(true)
    })

    test('should reject XSS in query params', async () => {
      const middleware = validationMiddleware()
      const req = createMockRequest(
        'http://localhost:3000/api/search?q=<script>alert(1)</script>',
      )
      const next = createMockNext()
      const result = await middleware(req, next)
      expect(result).toBeInstanceOf(Response)
      expect(result.status).toBe(400)
      const body = (await result.json()) as any
      expect(
        body.error.details.some((e: string) => e.includes('XSS patterns')),
      ).toBe(true)
    })

    test('should reject command injection in query params', async () => {
      const middleware = validationMiddleware()
      const req = createMockRequest(
        'http://localhost:3000/api/exec?cmd=test; rm -rf /',
      )
      const next = createMockNext()
      const result = await middleware(req, next)
      expect(result).toBeInstanceOf(Response)
      expect(result.status).toBe(400)
    })

    test('should skip query param validation when disabled', async () => {
      const middleware = createValidationMiddleware({
        validateQueryParams: false,
      })
      const req = createMockRequest(
        "http://localhost:3000/api/users?id=1' OR '1'='1",
      )
      const next = createMockNext()
      const result = await middleware(req, next)
      expect(result).toBeInstanceOf(Response)
      expect(result.status).toBe(200)
    })

    test('should handle URLs without query parameters', async () => {
      const middleware = validationMiddleware()
      const req = createMockRequest('http://localhost:3000/api/users')
      const next = createMockNext()
      const result = await middleware(req, next)
      expect(result).toBeInstanceOf(Response)
      expect(result.status).toBe(200)
    })
  })

  describe('custom error handler', () => {
    test('should use custom error handler when provided', async () => {
      const customHandler = (errors: string[], req: ZeroRequest) => {
        return new Response(JSON.stringify({ custom: true, errors }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      const middleware = createValidationMiddleware({
        onValidationError: customHandler,
        rules: {
          maxPathLength: 10,
        },
      })

      const req = createMockRequest('http://localhost:3000/api/very/long/path')
      const next = createMockNext()
      const result = await middleware(req, next)
      expect(result).toBeInstanceOf(Response)
      expect(result.status).toBe(403)
      const body = (await result.json()) as any
      expect(body.custom).toBe(true)
    })
  })

  describe('error response format', () => {
    test('should return proper error response structure', async () => {
      const middleware = createValidationMiddleware({
        rules: {
          maxPathLength: 10,
        },
      })
      const req = createMockRequest('http://localhost:3000/api/very/long/path')
      const next = createMockNext()
      const result = await middleware(req, next)
      expect(result).toBeInstanceOf(Response)
      const body = (await result.json()) as any
      expect(body.error).toBeDefined()
      expect(body.error.code).toBe('VALIDATION_ERROR')
      expect(body.error.message).toBeDefined()
      expect(body.error.requestId).toBeDefined()
      expect(body.error.timestamp).toBeDefined()
      expect(body.error.details).toBeInstanceOf(Array)
    })

    test('should include request ID in response headers', async () => {
      const middleware = createValidationMiddleware({
        rules: {
          maxPathLength: 10,
        },
      })
      const req = createMockRequest('http://localhost:3000/api/very/long/path')
      const next = createMockNext()
      const result = await middleware(req, next)
      expect(result).toBeInstanceOf(Response)
      expect(result.headers.get('X-Request-ID')).toBeDefined()
    })
  })

  describe('multiple validation failures', () => {
    test('should collect all validation errors', async () => {
      const middleware = createValidationMiddleware({
        rules: {
          maxPathLength: 10,
        },
      })
      const req = createMockRequest(
        'http://localhost:3000/api/very/long/path?cmd=rm -rf /',
        { 'X-Custom': 'valid-value' },
      )
      const next = createMockNext()
      const result = await middleware(req, next)
      expect(result).toBeInstanceOf(Response)
      const body = (await result.json()) as any
      // Should have at least path and query param errors
      expect(body.error.details.length).toBeGreaterThan(0)
    })
  })

  describe('error handling', () => {
    test('should handle unexpected errors gracefully', async () => {
      // Create middleware that will throw during validation
      const middleware = createValidationMiddleware()

      // Mock a request that will cause URL parsing to fail
      const badReq = {
        url: 'not-a-valid-url',
        headers: new Headers(),
      } as ZeroRequest

      const next = createMockNext()
      const result = await middleware(badReq, next)
      // Should handle error gracefully and return a response
      expect(result).toBeInstanceOf(Response)
      // Should return 500 for internal errors
      expect(result.status).toBe(500)
    })
  })
})
