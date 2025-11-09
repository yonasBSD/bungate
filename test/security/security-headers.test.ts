import { describe, test, expect } from 'bun:test'
import {
  SecurityHeadersMiddleware,
  createSecurityHeadersMiddleware,
  createSecurityHeadersMiddlewareFunction,
  securityHeadersMiddleware,
  mergeHeaders,
  hasSecurityHeaders,
  DEFAULT_SECURITY_HEADERS,
} from '../../src/security/security-headers'
import type { SecurityHeadersConfig } from '../../src/security/config'

describe('SecurityHeadersMiddleware', () => {
  describe('constructor and factory', () => {
    test('should create SecurityHeadersMiddleware instance', () => {
      const middleware = new SecurityHeadersMiddleware()
      expect(middleware).toBeDefined()
    })

    test('should create SecurityHeadersMiddleware via factory function', () => {
      const middleware = createSecurityHeadersMiddleware()
      expect(middleware).toBeDefined()
      expect(middleware).toBeInstanceOf(SecurityHeadersMiddleware)
    })

    test('should accept custom configuration', () => {
      const config: Partial<SecurityHeadersConfig> = {
        enabled: true,
        xFrameOptions: 'SAMEORIGIN',
      }
      const middleware = new SecurityHeadersMiddleware(config)
      expect(middleware).toBeDefined()
      const currentConfig = middleware.getConfig()
      expect(currentConfig.xFrameOptions).toBe('SAMEORIGIN')
    })

    test('should use default configuration when not provided', () => {
      const middleware = new SecurityHeadersMiddleware()
      const config = middleware.getConfig()
      expect(config.enabled).toBe(true)
      expect(config.xContentTypeOptions).toBe(true)
      expect(config.xFrameOptions).toBe('DENY')
    })
  })

  describe('HSTS header generation', () => {
    test('should add HSTS header for HTTPS requests', () => {
      const middleware = new SecurityHeadersMiddleware()
      const response = new Response('test')
      const result = middleware.applyHeaders(response, true)

      const hstsHeader = result.headers.get('Strict-Transport-Security')
      expect(hstsHeader).toBeDefined()
      expect(hstsHeader).toContain('max-age=31536000')
      expect(hstsHeader).toContain('includeSubDomains')
    })

    test('should not add HSTS header for HTTP requests', () => {
      const middleware = new SecurityHeadersMiddleware()
      const response = new Response('test')
      const result = middleware.applyHeaders(response, false)

      const hstsHeader = result.headers.get('Strict-Transport-Security')
      expect(hstsHeader).toBeNull()
    })

    test('should include preload directive when configured', () => {
      const middleware = new SecurityHeadersMiddleware({
        hsts: {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true,
        },
      })
      const response = new Response('test')
      const result = middleware.applyHeaders(response, true)

      const hstsHeader = result.headers.get('Strict-Transport-Security')
      expect(hstsHeader).toContain('preload')
    })

    test('should use custom max-age value', () => {
      const middleware = new SecurityHeadersMiddleware({
        hsts: {
          maxAge: 86400, // 1 day
          includeSubDomains: false,
        },
      })
      const response = new Response('test')
      const result = middleware.applyHeaders(response, true)

      const hstsHeader = result.headers.get('Strict-Transport-Security')
      expect(hstsHeader).toBe('max-age=86400')
    })
  })

  describe('X-Content-Type-Options header', () => {
    test('should add X-Content-Type-Options header', () => {
      const middleware = new SecurityHeadersMiddleware()
      const response = new Response('test')
      const result = middleware.applyHeaders(response, false)

      const header = result.headers.get('X-Content-Type-Options')
      expect(header).toBe('nosniff')
    })

    test('should not add X-Content-Type-Options when disabled', () => {
      const middleware = new SecurityHeadersMiddleware({
        xContentTypeOptions: false,
      })
      const response = new Response('test')
      const result = middleware.applyHeaders(response, false)

      const header = result.headers.get('X-Content-Type-Options')
      expect(header).toBeNull()
    })
  })

  describe('X-Frame-Options header', () => {
    test('should add X-Frame-Options header with DENY', () => {
      const middleware = new SecurityHeadersMiddleware({
        xFrameOptions: 'DENY',
      })
      const response = new Response('test')
      const result = middleware.applyHeaders(response, false)

      const header = result.headers.get('X-Frame-Options')
      expect(header).toBe('DENY')
    })

    test('should add X-Frame-Options header with SAMEORIGIN', () => {
      const middleware = new SecurityHeadersMiddleware({
        xFrameOptions: 'SAMEORIGIN',
      })
      const response = new Response('test')
      const result = middleware.applyHeaders(response, false)

      const header = result.headers.get('X-Frame-Options')
      expect(header).toBe('SAMEORIGIN')
    })

    test('should support custom X-Frame-Options value', () => {
      const middleware = new SecurityHeadersMiddleware({
        xFrameOptions: 'ALLOW-FROM https://example.com',
      })
      const response = new Response('test')
      const result = middleware.applyHeaders(response, false)

      const header = result.headers.get('X-Frame-Options')
      expect(header).toBe('ALLOW-FROM https://example.com')
    })
  })

  describe('Referrer-Policy header', () => {
    test('should add Referrer-Policy header with default value', () => {
      const middleware = new SecurityHeadersMiddleware()
      const response = new Response('test')
      const result = middleware.applyHeaders(response, false)

      const header = result.headers.get('Referrer-Policy')
      expect(header).toBe('strict-origin-when-cross-origin')
    })

    test('should use custom Referrer-Policy value', () => {
      const middleware = new SecurityHeadersMiddleware({
        referrerPolicy: 'no-referrer',
      })
      const response = new Response('test')
      const result = middleware.applyHeaders(response, false)

      const header = result.headers.get('Referrer-Policy')
      expect(header).toBe('no-referrer')
    })
  })

  describe('Permissions-Policy header', () => {
    test('should add Permissions-Policy header when configured', () => {
      const middleware = new SecurityHeadersMiddleware({
        permissionsPolicy: {
          geolocation: ['self'],
          camera: [],
          microphone: ['self', 'https://example.com'],
        },
      })
      const response = new Response('test')
      const result = middleware.applyHeaders(response, false)

      const header = result.headers.get('Permissions-Policy')
      expect(header).toBeDefined()
      expect(header).toContain('geolocation=(self)')
      expect(header).toContain('camera=()')
      expect(header).toContain('microphone=(self https://example.com)')
    })

    test('should not add Permissions-Policy when not configured', () => {
      const middleware = new SecurityHeadersMiddleware()
      const response = new Response('test')
      const result = middleware.applyHeaders(response, false)

      const header = result.headers.get('Permissions-Policy')
      expect(header).toBeNull()
    })
  })

  describe('Content-Security-Policy builder', () => {
    test('should add CSP header with default directives', () => {
      const middleware = new SecurityHeadersMiddleware({
        contentSecurityPolicy: {
          directives: {
            'default-src': ["'self'"],
          },
        },
      })
      const response = new Response('test')
      const result = middleware.applyHeaders(response, false)

      const header = result.headers.get('Content-Security-Policy')
      expect(header).toBe("default-src 'self'")
    })

    test('should build CSP with multiple directives', () => {
      const middleware = new SecurityHeadersMiddleware({
        contentSecurityPolicy: {
          directives: {
            'default-src': ["'self'"],
            'script-src': ["'self'", 'https://cdn.example.com'],
            'style-src': ["'self'", "'unsafe-inline'"],
            'img-src': ["'self'", 'data:', 'https:'],
          },
        },
      })
      const response = new Response('test')
      const result = middleware.applyHeaders(response, false)

      const header = result.headers.get('Content-Security-Policy')
      expect(header).toContain("default-src 'self'")
      expect(header).toContain("script-src 'self' https://cdn.example.com")
      expect(header).toContain("style-src 'self' 'unsafe-inline'")
      expect(header).toContain("img-src 'self' data: https:")
    })

    test('should use report-only mode when configured', () => {
      const middleware = new SecurityHeadersMiddleware({
        contentSecurityPolicy: {
          directives: {
            'default-src': ["'self'"],
          },
          reportOnly: true,
        },
      })
      const response = new Response('test')
      const result = middleware.applyHeaders(response, false)

      const header = result.headers.get('Content-Security-Policy-Report-Only')
      expect(header).toBeDefined()
      expect(result.headers.get('Content-Security-Policy')).toBeNull()
    })

    test('should handle empty directive values', () => {
      const middleware = new SecurityHeadersMiddleware({
        contentSecurityPolicy: {
          directives: {
            'default-src': ["'self'"],
            'script-src': [],
          },
        },
      })
      const response = new Response('test')
      const result = middleware.applyHeaders(response, false)

      const header = result.headers.get('Content-Security-Policy')
      expect(header).toBe("default-src 'self'")
    })
  })

  describe('CSP validation', () => {
    test('should validate CSP configuration successfully', () => {
      const middleware = new SecurityHeadersMiddleware({
        contentSecurityPolicy: {
          directives: {
            'default-src': ["'self'"],
            'script-src': ["'self'", 'https://cdn.example.com'],
          },
        },
      })

      const result = middleware.validateCSPConfig()
      expect(result.valid).toBe(true)
      expect(result.errors).toBeUndefined()
    })

    test('should warn about unsafe-inline', () => {
      const middleware = new SecurityHeadersMiddleware({
        contentSecurityPolicy: {
          directives: {
            'default-src': ["'self'"],
            'script-src': ["'self'", "'unsafe-inline'"],
          },
        },
      })

      const result = middleware.validateCSPConfig()
      expect(result.valid).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors?.some((e) => e.includes('unsafe-inline'))).toBe(true)
    })

    test('should warn about unsafe-eval', () => {
      const middleware = new SecurityHeadersMiddleware({
        contentSecurityPolicy: {
          directives: {
            'default-src': ["'self'"],
            'script-src': ["'self'", "'unsafe-eval'"],
          },
        },
      })

      const result = middleware.validateCSPConfig()
      expect(result.valid).toBe(false)
      expect(result.errors?.some((e) => e.includes('unsafe-eval'))).toBe(true)
    })

    test('should warn about wildcard sources', () => {
      const middleware = new SecurityHeadersMiddleware({
        contentSecurityPolicy: {
          directives: {
            'default-src': ["'self'"],
            'img-src': ['*'],
          },
        },
      })

      const result = middleware.validateCSPConfig()
      expect(result.valid).toBe(false)
      expect(result.errors?.some((e) => e.includes('wildcard'))).toBe(true)
    })

    test('should warn about missing default-src', () => {
      const middleware = new SecurityHeadersMiddleware({
        contentSecurityPolicy: {
          directives: {
            'script-src': ["'self'"],
          },
        },
      })

      const result = middleware.validateCSPConfig()
      expect(result.valid).toBe(false)
      expect(result.errors?.some((e) => e.includes('default-src'))).toBe(true)
    })

    test('should detect invalid directive names', () => {
      const middleware = new SecurityHeadersMiddleware({
        contentSecurityPolicy: {
          directives: {
            'default-src': ["'self'"],
            'invalid-directive': ["'self'"],
          },
        },
      })

      const result = middleware.validateCSPConfig()
      expect(result.valid).toBe(false)
      expect(
        result.errors?.some((e) => e.includes('Unknown CSP directive')),
      ).toBe(true)
    })

    test('should validate CSP source values', () => {
      const middleware = new SecurityHeadersMiddleware({
        contentSecurityPolicy: {
          directives: {
            'default-src': ["'self'"],
            'script-src': [
              "'self'",
              'https://example.com',
              'invalid source!!!',
            ],
          },
        },
      })

      const result = middleware.validateCSPConfig()
      expect(result.valid).toBe(false)
      expect(result.errors?.some((e) => e.includes('Invalid CSP source'))).toBe(
        true,
      )
    })
  })

  describe('custom headers', () => {
    test('should add custom headers', () => {
      const middleware = new SecurityHeadersMiddleware({
        customHeaders: {
          'X-Custom-Header': 'custom-value',
          'X-Another-Header': 'another-value',
        },
      })
      const response = new Response('test')
      const result = middleware.applyHeaders(response, false)

      expect(result.headers.get('X-Custom-Header')).toBe('custom-value')
      expect(result.headers.get('X-Another-Header')).toBe('another-value')
    })

    test('should merge custom headers with security headers', () => {
      const middleware = new SecurityHeadersMiddleware({
        customHeaders: {
          'X-Custom': 'value',
        },
      })
      const response = new Response('test')
      const result = middleware.applyHeaders(response, false)

      expect(result.headers.get('X-Custom')).toBe('value')
      expect(result.headers.get('X-Content-Type-Options')).toBe('nosniff')
      expect(result.headers.get('X-Frame-Options')).toBe('DENY')
    })

    test('should allow custom headers to override security headers', () => {
      const middleware = new SecurityHeadersMiddleware({
        xFrameOptions: 'DENY',
        customHeaders: {
          'X-Frame-Options': 'SAMEORIGIN',
        },
      })
      const response = new Response('test')
      const result = middleware.applyHeaders(response, false)

      expect(result.headers.get('X-Frame-Options')).toBe('SAMEORIGIN')
    })
  })

  describe('middleware disabled', () => {
    test('should not add headers when disabled', () => {
      const middleware = new SecurityHeadersMiddleware({
        enabled: false,
      })
      const response = new Response('test')
      const result = middleware.applyHeaders(response, true)

      expect(result.headers.get('Strict-Transport-Security')).toBeNull()
      expect(result.headers.get('X-Content-Type-Options')).toBeNull()
      expect(result.headers.get('X-Frame-Options')).toBeNull()
    })
  })

  describe('middleware function', () => {
    test('should create middleware function', () => {
      const middlewareFn = createSecurityHeadersMiddlewareFunction()
      expect(typeof middlewareFn).toBe('function')
    })

    test('should apply headers via middleware function', () => {
      const middlewareFn = createSecurityHeadersMiddlewareFunction()
      const req = new Request('https://example.com/test')
      const res = new Response('test')
      const result = middlewareFn(req, res)

      expect(result.headers.get('X-Content-Type-Options')).toBe('nosniff')
      expect(result.headers.get('X-Frame-Options')).toBe('DENY')
    })

    test('should detect HTTPS from request URL', () => {
      const middlewareFn = createSecurityHeadersMiddlewareFunction()
      const req = new Request('https://example.com/test')
      const res = new Response('test')
      const result = middlewareFn(req, res)

      expect(result.headers.get('Strict-Transport-Security')).toBeDefined()
    })

    test('should not add HSTS for HTTP requests', () => {
      const middlewareFn = createSecurityHeadersMiddlewareFunction()
      const req = new Request('http://example.com/test')
      const res = new Response('test')
      const result = middlewareFn(req, res)

      expect(result.headers.get('Strict-Transport-Security')).toBeNull()
    })

    test('should use custom HTTPS detection function', () => {
      const middlewareFn = createSecurityHeadersMiddlewareFunction({
        detectHttps: () => true, // Always treat as HTTPS
      })
      const req = new Request('http://example.com/test')
      const res = new Response('test')
      const result = middlewareFn(req, res)

      expect(result.headers.get('Strict-Transport-Security')).toBeDefined()
    })
  })

  describe('pre-configured middleware', () => {
    test('should export pre-configured middleware', () => {
      expect(typeof securityHeadersMiddleware).toBe('function')
    })

    test('should apply default headers', () => {
      const req = new Request('https://example.com/test')
      const res = new Response('test')
      const result = securityHeadersMiddleware(req, res)

      expect(result.headers.get('X-Content-Type-Options')).toBe('nosniff')
      expect(result.headers.get('X-Frame-Options')).toBe('DENY')
    })
  })

  describe('helper functions', () => {
    test('mergeHeaders should merge custom headers', () => {
      const response = new Response('test', {
        headers: { 'Content-Type': 'text/plain' },
      })
      const result = mergeHeaders(response, {
        'X-Custom': 'value',
        'X-Another': 'another',
      })

      expect(result.headers.get('Content-Type')).toBe('text/plain')
      expect(result.headers.get('X-Custom')).toBe('value')
      expect(result.headers.get('X-Another')).toBe('another')
    })

    test('hasSecurityHeaders should detect present headers', () => {
      const response = new Response('test', {
        headers: {
          'Strict-Transport-Security': 'max-age=31536000',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
        },
      })

      const result = hasSecurityHeaders(response)
      expect(result.hsts).toBe(true)
      expect(result.xContentTypeOptions).toBe(true)
      expect(result.xFrameOptions).toBe(true)
      expect(result.csp).toBe(false)
      expect(result.permissionsPolicy).toBe(false)
    })

    test('hasSecurityHeaders should detect CSP report-only', () => {
      const response = new Response('test', {
        headers: {
          'Content-Security-Policy-Report-Only': "default-src 'self'",
        },
      })

      const result = hasSecurityHeaders(response)
      expect(result.csp).toBe(true)
    })
  })

  describe('DEFAULT_SECURITY_HEADERS', () => {
    test('should export default configuration', () => {
      expect(DEFAULT_SECURITY_HEADERS).toBeDefined()
      expect(DEFAULT_SECURITY_HEADERS.enabled).toBe(true)
      expect(DEFAULT_SECURITY_HEADERS.xFrameOptions).toBe('DENY')
      expect(DEFAULT_SECURITY_HEADERS.xContentTypeOptions).toBe(true)
    })
  })
})
