import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { BunGateway } from '../../src/gateway/gateway'
import type { Server } from 'bun'

describe('BunGateway Security Features', () => {
  let gateway: BunGateway

  afterEach(async () => {
    if (gateway) {
      await gateway.close()
    }
  })

  describe('Security Headers', () => {
    test('should apply default security headers', async () => {
      gateway = new BunGateway({
        security: {
          securityHeaders: {
            enabled: true,
          },
        },
      })

      gateway.get('/test', async () => new Response('OK'))

      const request = new Request('http://localhost/test', { method: 'GET' })
      const response = await gateway.fetch(request)

      expect(response.headers.get('X-Frame-Options')).toBe('DENY')
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
      expect(response.headers.get('Referrer-Policy')).toBe(
        'strict-origin-when-cross-origin',
      )
    })

    test('should apply custom security headers', async () => {
      gateway = new BunGateway({
        security: {
          securityHeaders: {
            enabled: true,
            xFrameOptions: 'SAMEORIGIN',
            customHeaders: {
              'X-Custom-Header': 'custom-value',
            },
          },
        },
      })

      gateway.get('/test', async () => new Response('OK'))

      const request = new Request('http://localhost/test', { method: 'GET' })
      const response = await gateway.fetch(request)

      expect(response.headers.get('X-Frame-Options')).toBe('SAMEORIGIN')
      expect(response.headers.get('X-Custom-Header')).toBe('custom-value')
    })

    test('should apply CSP headers', async () => {
      gateway = new BunGateway({
        security: {
          securityHeaders: {
            enabled: true,
            contentSecurityPolicy: {
              directives: {
                'default-src': ["'self'"],
                'script-src': ["'self'", "'unsafe-inline'"],
              },
            },
          },
        },
      })

      gateway.get('/test', async () => new Response('OK'))

      const request = new Request('http://localhost/test', { method: 'GET' })
      const response = await gateway.fetch(request)

      const csp = response.headers.get('Content-Security-Policy')
      expect(csp).toContain("default-src 'self'")
      expect(csp).toContain("script-src 'self' 'unsafe-inline'")
    })
  })

  describe('Size Limits', () => {
    test('should reject oversized request body', async () => {
      gateway = new BunGateway({
        security: {
          sizeLimits: {
            maxBodySize: 100, // 100 bytes
          },
        },
      })

      gateway.post('/test', async () => new Response('OK'))

      const largeBody = 'a'.repeat(200) // 200 bytes
      const request = new Request('http://localhost/test', {
        method: 'POST',
        body: largeBody,
        headers: {
          'Content-Type': 'text/plain',
          'Content-Length': largeBody.length.toString(),
        },
      })
      const response = await gateway.fetch(request)

      expect(response.status).toBe(413) // Payload Too Large
      const data = (await response.json()) as any
      expect(data.error.code).toBe('PAYLOAD_TOO_LARGE')
    })

    test('should reject oversized URL', async () => {
      gateway = new BunGateway({
        security: {
          sizeLimits: {
            maxUrlLength: 50,
          },
        },
      })

      gateway.get('/test', async () => new Response('OK'))

      const longPath = '/test?' + 'a'.repeat(100)
      const request = new Request(`http://localhost${longPath}`, {
        method: 'GET',
      })
      const response = await gateway.fetch(request)

      expect(response.status).toBe(414) // URI Too Long
      const data = (await response.json()) as any
      expect(data.error.code).toBe('URI_TOO_LONG')
    })

    test('should accept requests within size limits', async () => {
      gateway = new BunGateway({
        security: {
          sizeLimits: {
            maxBodySize: 1000,
            maxUrlLength: 200,
          },
        },
      })

      gateway.post('/test', async () => new Response('OK'))

      const body = 'test data'
      const request = new Request('http://localhost/test', {
        method: 'POST',
        body,
        headers: {
          'Content-Type': 'text/plain',
          'Content-Length': body.length.toString(),
        },
      })
      const response = await gateway.fetch(request)

      expect(response.status).toBe(200)
      expect(await response.text()).toBe('OK')
    })
  })

  describe('Input Validation', () => {
    test('should block directory traversal patterns in query params', async () => {
      gateway = new BunGateway({
        security: {
          inputValidation: {
            blockedPatterns: [/\.\./],
          },
        },
      })

      gateway.get('/files', async () => new Response('OK'))

      // Test with directory traversal in query parameter
      const request = new Request('http://localhost/files?path=../etc/passwd', {
        method: 'GET',
      })
      const response = await gateway.fetch(request)

      expect(response.status).toBe(400)
      const data = (await response.json()) as any
      expect(data.error).toBeDefined()
    })

    test('should allow valid paths', async () => {
      gateway = new BunGateway({
        security: {
          inputValidation: {
            blockedPatterns: [/\.\./],
          },
        },
      })

      gateway.get('/files/*', async () => new Response('OK'))

      const request = new Request('http://localhost/files/document.pdf', {
        method: 'GET',
      })
      const response = await gateway.fetch(request)

      expect(response.status).toBe(200)
      expect(await response.text()).toBe('OK')
    })
  })

  describe('Combined Security Features', () => {
    test('should apply all security features together', async () => {
      gateway = new BunGateway({
        security: {
          securityHeaders: {
            enabled: true,
            xFrameOptions: 'DENY',
          },
          sizeLimits: {
            maxBodySize: 10000,
            maxUrlLength: 2048,
          },
          inputValidation: {
            blockedPatterns: [/\.\./],
          },
        },
      })

      gateway.get(
        '/api/*',
        async () =>
          new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' },
          }),
      )

      const request = new Request('http://localhost/api/test', {
        method: 'GET',
      })
      const response = await gateway.fetch(request)

      // Check security headers
      expect(response.headers.get('X-Frame-Options')).toBe('DENY')
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')

      // Check response
      expect(response.status).toBe(200)
      const data = (await response.json()) as any
      expect(data.success).toBe(true)
    })
  })
})
