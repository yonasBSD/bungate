import { describe, test, expect } from 'bun:test'
import { SizeLimiter, createSizeLimiter } from '../../src/security/size-limiter'
import type { SizeLimits } from '../../src/security/config'

describe('SizeLimiter', () => {
  describe('constructor and factory', () => {
    test('should create SizeLimiter instance with defaults', () => {
      const limiter = new SizeLimiter()
      expect(limiter).toBeDefined()
      const limits = limiter.getLimits()
      expect(limits.maxBodySize).toBe(10 * 1024 * 1024) // 10MB
      expect(limits.maxHeaderSize).toBe(16384) // 16KB
      expect(limits.maxHeaderCount).toBe(100)
      expect(limits.maxUrlLength).toBe(2048)
      expect(limits.maxQueryParams).toBe(100)
    })

    test('should create SizeLimiter via factory function', () => {
      const limiter = createSizeLimiter()
      expect(limiter).toBeDefined()
      expect(limiter).toBeInstanceOf(SizeLimiter)
    })

    test('should accept custom size limits', () => {
      const customLimits: Partial<SizeLimits> = {
        maxBodySize: 5 * 1024 * 1024, // 5MB
        maxHeaderCount: 50,
      }
      const limiter = new SizeLimiter(customLimits)
      const limits = limiter.getLimits()
      expect(limits.maxBodySize).toBe(5 * 1024 * 1024)
      expect(limits.maxHeaderCount).toBe(50)
      // Other limits should use defaults
      expect(limits.maxHeaderSize).toBe(16384)
    })
  })

  describe('validateBodySize', () => {
    test('should accept request with body size within limit', async () => {
      const limiter = new SizeLimiter({ maxBodySize: 1000 })
      const req = new Request('http://example.com', {
        method: 'POST',
        headers: { 'Content-Length': '500' },
        body: 'x'.repeat(500),
      })
      const result = await limiter.validateBodySize(req)
      expect(result.valid).toBe(true)
      expect(result.errors).toBeUndefined()
    })

    test('should reject request with body size exceeding limit', async () => {
      const limiter = new SizeLimiter({ maxBodySize: 100 })
      const req = new Request('http://example.com', {
        method: 'POST',
        headers: { 'Content-Length': '500' },
      })
      const result = await limiter.validateBodySize(req)
      expect(result.valid).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors![0]).toContain('exceeds maximum allowed size')
    })

    test('should reject request with invalid Content-Length', async () => {
      const limiter = new SizeLimiter()
      const req = new Request('http://example.com', {
        method: 'POST',
        headers: { 'Content-Length': 'invalid' },
      })
      const result = await limiter.validateBodySize(req)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Invalid Content-Length header')
    })

    test('should accept request without Content-Length header', async () => {
      const limiter = new SizeLimiter()
      const req = new Request('http://example.com', {
        method: 'POST',
      })
      const result = await limiter.validateBodySize(req)
      expect(result.valid).toBe(true)
    })
  })

  describe('validateHeaders', () => {
    test('should accept headers within limits', () => {
      const limiter = new SizeLimiter()
      const headers = new Headers({
        'Content-Type': 'application/json',
        Authorization: 'Bearer token123',
      })
      const result = limiter.validateHeaders(headers)
      expect(result.valid).toBe(true)
      expect(result.errors).toBeUndefined()
    })

    test('should reject when header count exceeds limit', () => {
      const limiter = new SizeLimiter({ maxHeaderCount: 2 })
      const headers = new Headers({
        Header1: 'value1',
        Header2: 'value2',
        Header3: 'value3',
      })
      const result = limiter.validateHeaders(headers)
      expect(result.valid).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors![0]).toContain('Header count')
      expect(result.errors![0]).toContain('exceeds maximum allowed')
    })

    test('should reject when total header size exceeds limit', () => {
      const limiter = new SizeLimiter({ maxHeaderSize: 50 })
      const headers = new Headers({
        'Very-Long-Header': 'Very long value that will exceed the size limit',
      })
      const result = limiter.validateHeaders(headers)
      expect(result.valid).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors![0]).toContain('Total header size')
      expect(result.errors![0]).toContain('exceeds maximum allowed')
    })

    test('should calculate header size correctly', () => {
      const limiter = new SizeLimiter({ maxHeaderSize: 100 })
      const headers = new Headers({
        'X-Test': 'value',
      })
      // Size = "X-Test" (6) + ": " (2) + "value" (5) + "\r\n" (2) = 15 bytes
      const result = limiter.validateHeaders(headers)
      expect(result.valid).toBe(true)
    })

    test('should report both count and size violations', () => {
      const limiter = new SizeLimiter({
        maxHeaderCount: 2,
        maxHeaderSize: 50,
      })
      const headers = new Headers({
        Header1: 'value1',
        Header2: 'value2',
        Header3: 'very-long-value-that-exceeds-size-limit',
      })
      const result = limiter.validateHeaders(headers)
      expect(result.valid).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors!.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('validateUrlLength', () => {
    test('should accept URL within length limit', () => {
      const limiter = new SizeLimiter({ maxUrlLength: 100 })
      const url = 'http://example.com/api/users'
      const result = limiter.validateUrlLength(url)
      expect(result.valid).toBe(true)
      expect(result.errors).toBeUndefined()
    })

    test('should reject URL exceeding length limit', () => {
      const limiter = new SizeLimiter({ maxUrlLength: 50 })
      const url =
        'http://example.com/api/users/with/very/long/path/that/exceeds/limit'
      const result = limiter.validateUrlLength(url)
      expect(result.valid).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors![0]).toContain('URL length')
      expect(result.errors![0]).toContain('exceeds maximum allowed')
    })

    test('should handle very long URLs', () => {
      const limiter = new SizeLimiter({ maxUrlLength: 2048 })
      const longPath = '/api/' + 'x'.repeat(3000)
      const url = `http://example.com${longPath}`
      const result = limiter.validateUrlLength(url)
      expect(result.valid).toBe(false)
    })
  })

  describe('validateQueryParams', () => {
    test('should accept query params within limit', () => {
      const limiter = new SizeLimiter({ maxQueryParams: 10 })
      const params = new URLSearchParams({
        id: '123',
        name: 'test',
        page: '1',
      })
      const result = limiter.validateQueryParams(params)
      expect(result.valid).toBe(true)
      expect(result.errors).toBeUndefined()
    })

    test('should reject when query param count exceeds limit', () => {
      const limiter = new SizeLimiter({ maxQueryParams: 2 })
      const params = new URLSearchParams({
        param1: 'value1',
        param2: 'value2',
        param3: 'value3',
      })
      const result = limiter.validateQueryParams(params)
      expect(result.valid).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors![0]).toContain('Query parameter count')
      expect(result.errors![0]).toContain('exceeds maximum allowed')
    })

    test('should handle empty query params', () => {
      const limiter = new SizeLimiter()
      const params = new URLSearchParams()
      const result = limiter.validateQueryParams(params)
      expect(result.valid).toBe(true)
    })

    test('should count duplicate parameter names', () => {
      const limiter = new SizeLimiter({ maxQueryParams: 2 })
      const params = new URLSearchParams()
      params.append('tag', 'value1')
      params.append('tag', 'value2')
      params.append('tag', 'value3')
      const result = limiter.validateQueryParams(params)
      expect(result.valid).toBe(false)
    })
  })

  describe('validateRequest', () => {
    test('should validate complete request successfully', async () => {
      const limiter = new SizeLimiter()
      const req = new Request('http://example.com/api/users?page=1', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': '100',
        },
      })
      const result = await limiter.validateRequest(req)
      expect(result.valid).toBe(true)
      expect(result.errors).toBeUndefined()
    })

    test('should collect all validation errors', async () => {
      const limiter = new SizeLimiter({
        maxUrlLength: 30,
        maxHeaderCount: 1,
        maxQueryParams: 1,
      })
      const req = new Request('http://example.com/api/users?page=1&limit=10', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token',
        },
      })
      const result = await limiter.validateRequest(req)
      expect(result.valid).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors!.length).toBeGreaterThan(1)
    })

    test('should skip body validation for GET requests', async () => {
      const limiter = new SizeLimiter({ maxBodySize: 10 })
      const req = new Request('http://example.com/api/users', {
        method: 'GET',
        headers: { 'Content-Length': '1000' },
      })
      const result = await limiter.validateRequest(req)
      // Should not fail on body size for GET
      expect(result.valid).toBe(true)
    })

    test('should skip body validation for HEAD requests', async () => {
      const limiter = new SizeLimiter({ maxBodySize: 10 })
      const req = new Request('http://example.com/api/users', {
        method: 'HEAD',
        headers: { 'Content-Length': '1000' },
      })
      const result = await limiter.validateRequest(req)
      expect(result.valid).toBe(true)
    })

    test('should validate body for POST requests', async () => {
      const limiter = new SizeLimiter({ maxBodySize: 100 })
      const req = new Request('http://example.com/api/users', {
        method: 'POST',
        headers: { 'Content-Length': '1000' },
      })
      const result = await limiter.validateRequest(req)
      expect(result.valid).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors![0]).toContain('body size')
    })
  })

  describe('getLimits', () => {
    test('should return current limits configuration', () => {
      const customLimits: Partial<SizeLimits> = {
        maxBodySize: 5000,
        maxUrlLength: 1000,
      }
      const limiter = new SizeLimiter(customLimits)
      const limits = limiter.getLimits()
      expect(limits.maxBodySize).toBe(5000)
      expect(limits.maxUrlLength).toBe(1000)
      expect(limits.maxHeaderSize).toBe(16384) // default
    })

    test('should return a copy of limits', () => {
      const limiter = new SizeLimiter()
      const limits1 = limiter.getLimits()
      const limits2 = limiter.getLimits()
      expect(limits1).not.toBe(limits2) // Different objects
      expect(limits1).toEqual(limits2) // Same values
    })
  })
})
