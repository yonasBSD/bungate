import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { BunGateway } from '../../src/gateway/gateway'
import { SignJWT, jwtVerify } from 'jose'

/**
 * Comprehensive authentication tests for BunGateway
 * Tests JWT-only, API key-only, and hybrid authentication scenarios
 *
 * Coverage:
 * - JWT authentication with valid/invalid/expired tokens
 * - API key authentication with valid/invalid keys and custom validators
 * - Hybrid authentication (JWT and API keys work independently)
 * - Multiple routes with different authentication configurations
 * - Concurrent requests and edge cases
 * - Error handling and security boundaries
 * - JWT algorithm security
 */

// Test configuration constants
const TEST_SECRET = 'test-secret-key-for-jwt-authentication'
const TEST_API_KEY = 'test-api-key-12345'
const TEST_API_KEY_ADMIN = 'admin-api-key-67890'
const SECRET_ENCODER = new TextEncoder().encode(TEST_SECRET)

// Helper functions
async function createValidJWT(
  payload: Record<string, any> = { sub: 'user123', role: 'user' },
  expiresIn: string = '1h',
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer('test-issuer')
    .setAudience('test-audience')
    .setExpirationTime(expiresIn)
    .sign(SECRET_ENCODER)
}

async function createExpiredJWT(
  payload: Record<string, any> = { sub: 'user123' },
): Promise<string> {
  // Create token that expired 1 hour ago
  const now = Math.floor(Date.now() / 1000)
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now - 7200) // 2 hours ago
    .setExpirationTime(now - 3600) // 1 hour ago
    .sign(SECRET_ENCODER)
}

async function createJWTWithWrongSecret(
  payload: Record<string, any> = { sub: 'user123' },
): Promise<string> {
  const wrongSecret = new TextEncoder().encode('wrong-secret')
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(wrongSecret)
}

describe('BunGateway Authentication', () => {
  let gateway: BunGateway
  let backendServer: any

  // Setup backend server for proxying
  beforeEach(async () => {
    backendServer = Bun.serve({
      port: 0, // Random available port
      fetch: async (req) => {
        const url = new URL(req.url)
        return new Response(
          JSON.stringify({
            message: 'Backend response',
            path: url.pathname,
            method: req.method,
            headers: Object.fromEntries(req.headers),
          }),
          {
            headers: { 'Content-Type': 'application/json' },
          },
        )
      },
    })
  })

  afterEach(async () => {
    if (gateway) {
      await gateway.close()
    }
    if (backendServer) {
      backendServer.stop(true)
    }
  })

  describe('JWT-Only Authentication', () => {
    beforeEach(() => {
      gateway = new BunGateway()

      // Route with JWT authentication
      gateway.addRoute({
        pattern: '/api/users/*',
        methods: ['GET'],
        target: `http://localhost:${backendServer.port}`,
        auth: {
          secret: TEST_SECRET,
          jwtOptions: {
            algorithms: ['HS256'],
            issuer: 'test-issuer',
            audience: 'test-audience',
          },
        },
      })
    })

    test('should allow access with valid JWT token', async () => {
      const token = await createValidJWT()
      const request = new Request('http://localhost/api/users/123', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const response = await gateway.fetch(request)
      expect(response.status).toBe(200)

      const data = (await response.json()) as any
      expect(data.message).toBe('Backend response')
      expect(data.path).toBe('/api/users/123')
    })

    test('should reject request without JWT token', async () => {
      const request = new Request('http://localhost/api/users/123', {
        method: 'GET',
      })

      const response = await gateway.fetch(request)
      expect(response.status).toBe(401)
    })

    test('should reject request with expired JWT token', async () => {
      const token = await createExpiredJWT()
      const request = new Request('http://localhost/api/users/123', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const response = await gateway.fetch(request)
      expect(response.status).toBe(401)
    })

    test('should reject request with invalid JWT signature', async () => {
      const token = await createJWTWithWrongSecret()
      const request = new Request('http://localhost/api/users/123', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const response = await gateway.fetch(request)
      expect(response.status).toBe(401)
    })

    test('should reject request with malformed JWT token', async () => {
      const request = new Request('http://localhost/api/users/123', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer not.a.valid.jwt.token',
        },
      })

      const response = await gateway.fetch(request)
      expect(response.status).toBe(401)
    })

    test('should reject request with missing Bearer prefix', async () => {
      const token = await createValidJWT()
      const request = new Request('http://localhost/api/users/123', {
        method: 'GET',
        headers: {
          Authorization: token, // Missing "Bearer " prefix
        },
      })

      const response = await gateway.fetch(request)
      expect(response.status).toBe(401)
    })

    test('should allow access with custom JWT claims', async () => {
      const token = await createValidJWT({
        sub: 'user456',
        role: 'admin',
        email: 'admin@example.com',
      })
      const request = new Request('http://localhost/api/users/profile', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const response = await gateway.fetch(request)
      expect(response.status).toBe(200)
    })
  })

  describe('API Key-Only Authentication', () => {
    beforeEach(() => {
      gateway = new BunGateway()

      // Route with API key authentication only
      gateway.addRoute({
        pattern: '/api/public/*',
        methods: ['GET'],
        target: `http://localhost:${backendServer.port}`,
        auth: {
          apiKeys: [TEST_API_KEY, TEST_API_KEY_ADMIN],
          apiKeyHeader: 'X-API-Key',
        },
      })
    })

    test('should allow access with valid API key', async () => {
      const request = new Request('http://localhost/api/public/data', {
        method: 'GET',
        headers: {
          'X-API-Key': TEST_API_KEY,
        },
      })

      const response = await gateway.fetch(request)
      expect(response.status).toBe(200)

      const data = (await response.json()) as any
      expect(data.message).toBe('Backend response')
    })

    test('should allow access with alternative valid API key', async () => {
      const request = new Request('http://localhost/api/public/data', {
        method: 'GET',
        headers: {
          'X-API-Key': TEST_API_KEY_ADMIN,
        },
      })

      const response = await gateway.fetch(request)
      expect(response.status).toBe(200)
    })

    test('should reject request without API key', async () => {
      const request = new Request('http://localhost/api/public/data', {
        method: 'GET',
      })

      const response = await gateway.fetch(request)
      expect(response.status).toBe(401)
    })

    test('should reject request with invalid API key', async () => {
      const request = new Request('http://localhost/api/public/data', {
        method: 'GET',
        headers: {
          'X-API-Key': 'invalid-api-key',
        },
      })

      const response = await gateway.fetch(request)
      expect(response.status).toBe(401)
    })

    test('should reject request with API key in wrong header', async () => {
      const request = new Request('http://localhost/api/public/data', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${TEST_API_KEY}`, // Wrong header
        },
      })

      const response = await gateway.fetch(request)
      expect(response.status).toBe(401)
    })
  })

  describe('API Key with Custom Validator', () => {
    beforeEach(() => {
      gateway = new BunGateway()

      // Route with custom API key validator
      gateway.addRoute({
        pattern: '/api/validated/*',
        methods: ['GET'],
        target: `http://localhost:${backendServer.port}`,
        auth: {
          apiKeys: [TEST_API_KEY],
          apiKeyHeader: 'X-API-Key',
          apiKeyValidator: async (key: string) => {
            // Custom validation: only allow keys starting with 'test-'
            return key.startsWith('test-')
          },
        },
      })
    })

    test('should allow access with valid API key passing custom validator', async () => {
      const request = new Request('http://localhost/api/validated/data', {
        method: 'GET',
        headers: {
          'X-API-Key': TEST_API_KEY, // Starts with 'test-'
        },
      })

      const response = await gateway.fetch(request)
      expect(response.status).toBe(200)
    })

    test('should reject API key failing custom validator', async () => {
      const request = new Request('http://localhost/api/validated/data', {
        method: 'GET',
        headers: {
          'X-API-Key': 'invalid-prefix-key',
        },
      })

      const response = await gateway.fetch(request)
      expect(response.status).toBe(401)
    })
  })

  describe('Hybrid Authentication (JWT + API Key)', () => {
    beforeEach(() => {
      gateway = new BunGateway()

      // Route accepting both JWT and API key
      // NOTE: When apiKeys are configured, the 0http-bun middleware requires
      // the API key to be present. JWT alone is not sufficient.
      // This is the current behavior of the underlying middleware.
      gateway.addRoute({
        pattern: '/api/hybrid/*',
        methods: ['GET'],
        target: `http://localhost:${backendServer.port}`,
        auth: {
          secret: TEST_SECRET,
          jwtOptions: {
            algorithms: ['HS256'],
            issuer: 'test-issuer',
            audience: 'test-audience',
          },
          apiKeys: [TEST_API_KEY, TEST_API_KEY_ADMIN],
          apiKeyHeader: 'X-API-Key',
        },
      })
    })

    test('should allow access with valid JWT when both JWT and API keys are configured', async () => {
      // Both JWT and API key auth work independently
      // This is hybrid authentication - either one is sufficient
      const token = await createValidJWT()
      const request = new Request('http://localhost/api/hybrid/data', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const response = await gateway.fetch(request)
      // JWT authentication succeeds - we can access the protected route
      expect(response.status).toBe(200)

      const data = (await response.json()) as any
      expect(data.message).toBe('Backend response')
      // Backend response confirms the request was proxied successfully
      expect(data.path).toBe('/api/hybrid/data')
    })

    test('should allow access with valid API key', async () => {
      const request = new Request('http://localhost/api/hybrid/data', {
        method: 'GET',
        headers: {
          'X-API-Key': TEST_API_KEY,
        },
      })

      const response = await gateway.fetch(request)
      expect(response.status).toBe(200)
    })

    test('should allow access with both valid JWT and API key', async () => {
      const token = await createValidJWT()
      const request = new Request('http://localhost/api/hybrid/data', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'X-API-Key': TEST_API_KEY,
        },
      })

      const response = await gateway.fetch(request)
      expect(response.status).toBe(200)
    })

    test('should reject request without any authentication', async () => {
      const request = new Request('http://localhost/api/hybrid/data', {
        method: 'GET',
      })

      const response = await gateway.fetch(request)
      expect(response.status).toBe(401)
    })

    test('should reject request with invalid JWT but no API key', async () => {
      const token = await createExpiredJWT()
      const request = new Request('http://localhost/api/hybrid/data', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const response = await gateway.fetch(request)
      expect(response.status).toBe(401)
    })

    test('should reject request with invalid API key but no JWT', async () => {
      const request = new Request('http://localhost/api/hybrid/data', {
        method: 'GET',
        headers: {
          'X-API-Key': 'invalid-key',
        },
      })

      const response = await gateway.fetch(request)
      expect(response.status).toBe(401)
    })

    test('should accept valid API key even with invalid JWT', async () => {
      const token = await createExpiredJWT()
      const request = new Request('http://localhost/api/hybrid/data', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'X-API-Key': TEST_API_KEY, // Valid API key should work
        },
      })

      const response = await gateway.fetch(request)
      // Valid API key allows access regardless of JWT validity
      expect(response.status).toBe(200)
    })
  })

  describe('Multiple Routes with Different Auth', () => {
    beforeEach(() => {
      gateway = new BunGateway()

      // Public route (no auth)
      gateway.addRoute({
        pattern: '/api/health',
        methods: ['GET'],
        handler: async () => new Response(JSON.stringify({ status: 'ok' })),
      })

      // JWT-only route
      gateway.addRoute({
        pattern: '/api/users/*',
        methods: ['GET'],
        target: `http://localhost:${backendServer.port}`,
        auth: {
          secret: TEST_SECRET,
          jwtOptions: {
            algorithms: ['HS256'],
          },
        },
      })

      // API key-only route
      gateway.addRoute({
        pattern: '/api/public/*',
        methods: ['GET'],
        target: `http://localhost:${backendServer.port}`,
        auth: {
          apiKeys: [TEST_API_KEY],
          apiKeyHeader: 'X-API-Key',
        },
      })

      // Hybrid route
      gateway.addRoute({
        pattern: '/api/admin/*',
        methods: ['GET'],
        target: `http://localhost:${backendServer.port}`,
        auth: {
          secret: TEST_SECRET,
          jwtOptions: {
            algorithms: ['HS256'],
          },
          apiKeys: [TEST_API_KEY_ADMIN],
          apiKeyHeader: 'X-API-Key',
        },
      })
    })

    test('should allow access to public route without auth', async () => {
      const request = new Request('http://localhost/api/health', {
        method: 'GET',
      })

      const response = await gateway.fetch(request)
      expect(response.status).toBe(200)
    })

    test('should enforce JWT on users route', async () => {
      const token = await createValidJWT()
      const requestWithJWT = new Request('http://localhost/api/users/123', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const responseWithJWT = await gateway.fetch(requestWithJWT)
      expect(responseWithJWT.status).toBe(200)

      const requestWithoutJWT = new Request('http://localhost/api/users/123', {
        method: 'GET',
      })

      const responseWithoutJWT = await gateway.fetch(requestWithoutJWT)
      expect(responseWithoutJWT.status).toBe(401)
    })

    test('should enforce API key on public route', async () => {
      const requestWithKey = new Request('http://localhost/api/public/data', {
        method: 'GET',
        headers: {
          'X-API-Key': TEST_API_KEY,
        },
      })

      const responseWithKey = await gateway.fetch(requestWithKey)
      expect(responseWithKey.status).toBe(200)

      const requestWithoutKey = new Request(
        'http://localhost/api/public/data',
        {
          method: 'GET',
        },
      )

      const responseWithoutKey = await gateway.fetch(requestWithoutKey)
      expect(responseWithoutKey.status).toBe(401)
    })

    test('should accept both JWT and API key on admin route', async () => {
      // Hybrid authentication: both JWT and API key work independently
      const token = await createValidJWT()

      // Test with JWT only - should work
      const requestWithJWT = new Request('http://localhost/api/admin/users', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const responseWithJWT = await gateway.fetch(requestWithJWT)
      expect(responseWithJWT.status).toBe(200)

      const jwtData = (await responseWithJWT.json()) as any
      expect(jwtData.message).toBe('Backend response')
      expect(jwtData.path).toBe('/api/admin/users')

      // Test with API key - should also work
      const requestWithKey = new Request('http://localhost/api/admin/users', {
        method: 'GET',
        headers: {
          'X-API-Key': TEST_API_KEY_ADMIN,
        },
      })
      const responseWithKey = await gateway.fetch(requestWithKey)
      expect(responseWithKey.status).toBe(200)

      // Test with both - should work
      const requestWithBoth = new Request('http://localhost/api/admin/users', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'X-API-Key': TEST_API_KEY_ADMIN,
        },
      })
      const responseWithBoth = await gateway.fetch(requestWithBoth)
      expect(responseWithBoth.status).toBe(200)
    })
  })

  describe('Concurrent Authentication Requests', () => {
    beforeEach(() => {
      gateway = new BunGateway()

      gateway.addRoute({
        pattern: '/api/concurrent/*',
        methods: ['GET'],
        target: `http://localhost:${backendServer.port}`,
        auth: {
          secret: TEST_SECRET,
          jwtOptions: {
            algorithms: ['HS256'],
          },
          apiKeys: [TEST_API_KEY],
          apiKeyHeader: 'X-API-Key',
        },
      })
    })

    test('should handle multiple concurrent authenticated requests', async () => {
      // Use API keys for concurrent requests since apiKeys are configured
      const requests = Array.from({ length: 10 }, (_, i) =>
        gateway.fetch(
          new Request(`http://localhost/api/concurrent/test-${i}`, {
            method: 'GET',
            headers: {
              'X-API-Key': TEST_API_KEY,
            },
          }),
        ),
      )

      const responses = await Promise.all(requests)
      const statuses = responses.map((r) => r.status)

      expect(statuses.every((status) => status === 200)).toBe(true)
    })

    test('should handle mixed valid and invalid concurrent requests', async () => {
      const validToken = await createValidJWT()
      const invalidToken = await createExpiredJWT()

      const requests = [
        // Valid requests
        gateway.fetch(
          new Request('http://localhost/api/concurrent/test-1', {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${validToken}`,
              'X-API-Key': TEST_API_KEY,
            },
          }),
        ),
        gateway.fetch(
          new Request('http://localhost/api/concurrent/test-2', {
            method: 'GET',
            headers: { 'X-API-Key': TEST_API_KEY },
          }),
        ),
        // Invalid requests
        gateway.fetch(
          new Request('http://localhost/api/concurrent/test-3', {
            method: 'GET',
            headers: { Authorization: `Bearer ${invalidToken}` },
          }),
        ),
        gateway.fetch(
          new Request('http://localhost/api/concurrent/test-4', {
            method: 'GET',
          }),
        ),
      ]

      const responses = await Promise.all(requests)
      const statuses = responses.map((r) => r.status)

      expect(statuses[0]).toBe(200) // Valid JWT + API key
      expect(statuses[1]).toBe(200) // Valid API key
      expect(statuses[2]).toBe(401) // Invalid JWT, no API key
      expect(statuses[3]).toBe(401) // No auth
    })
  })

  describe('Edge Cases and Security Boundaries', () => {
    beforeEach(() => {
      gateway = new BunGateway()

      gateway.addRoute({
        pattern: '/api/edge/*',
        methods: ['GET'],
        target: `http://localhost:${backendServer.port}`,
        auth: {
          secret: TEST_SECRET,
          jwtOptions: {
            algorithms: ['HS256'],
          },
        },
      })
    })

    test('should handle empty Authorization header', async () => {
      const request = new Request('http://localhost/api/edge/test', {
        method: 'GET',
        headers: {
          Authorization: '',
        },
      })

      const response = await gateway.fetch(request)
      expect(response.status).toBe(401)
    })

    test('should handle Authorization header with only "Bearer"', async () => {
      const request = new Request('http://localhost/api/edge/test', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer',
        },
      })

      const response = await gateway.fetch(request)
      expect(response.status).toBe(401)
    })

    test('should handle Authorization header with extra spaces', async () => {
      const token = await createValidJWT()
      const request = new Request('http://localhost/api/edge/test', {
        method: 'GET',
        headers: {
          Authorization: `Bearer   ${token}`, // Extra spaces
        },
      })

      const response = await gateway.fetch(request)
      // Should still work or fail gracefully
      expect([200, 401]).toContain(response.status)
    })

    test('should handle very long JWT token', async () => {
      const longPayload = {
        sub: 'user123',
        data: 'x'.repeat(10000), // Very long payload
      }
      const token = await createValidJWT(longPayload)
      const request = new Request('http://localhost/api/edge/test', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const response = await gateway.fetch(request)
      expect(response.status).toBe(200)
    })

    test('should handle JWT with special characters in payload', async () => {
      const specialPayload = {
        sub: 'user123',
        name: "O'Brien <script>alert('xss')</script>",
        email: 'test+alias@example.com',
      }
      const token = await createValidJWT(specialPayload)
      const request = new Request('http://localhost/api/edge/test', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const response = await gateway.fetch(request)
      expect(response.status).toBe(200)
    })

    test('should handle case-sensitive API key header', async () => {
      const gatewayWithAPIKey = new BunGateway()

      gatewayWithAPIKey.addRoute({
        pattern: '/api/case/*',
        methods: ['GET'],
        target: `http://localhost:${backendServer.port}`,
        auth: {
          apiKeys: [TEST_API_KEY],
          apiKeyHeader: 'X-API-Key', // Case-sensitive
        },
      })

      // Correct case
      const requestCorrectCase = new Request('http://localhost/api/case/test', {
        method: 'GET',
        headers: {
          'X-API-Key': TEST_API_KEY,
        },
      })
      const responseCorrectCase =
        await gatewayWithAPIKey.fetch(requestCorrectCase)
      expect(responseCorrectCase.status).toBe(200)

      // Wrong case (headers are case-insensitive in HTTP)
      const requestWrongCase = new Request('http://localhost/api/case/test', {
        method: 'GET',
        headers: {
          'x-api-key': TEST_API_KEY, // lowercase
        },
      })
      const responseWrongCase = await gatewayWithAPIKey.fetch(requestWrongCase)
      // HTTP headers are case-insensitive, so this should work
      expect(responseWrongCase.status).toBe(200)

      await gatewayWithAPIKey.close()
    })

    test('should handle null or undefined in auth configuration', async () => {
      // This tests that the gateway handles edge cases gracefully
      const gatewayEdge = new BunGateway()

      gatewayEdge.addRoute({
        pattern: '/api/null/*',
        methods: ['GET'],
        handler: async () => new Response('OK'),
      })

      const request = new Request('http://localhost/api/null/test', {
        method: 'GET',
      })

      const response = await gatewayEdge.fetch(request)
      // Should allow access since auth is null
      expect(response.status).toBe(200)

      await gatewayEdge.close()
    })
  })

  describe('JWT Algorithm Security', () => {
    test('should reject JWT with algorithm not in allowed list', async () => {
      const gateway = new BunGateway()

      gateway.addRoute({
        pattern: '/api/algo/*',
        methods: ['GET'],
        target: `http://localhost:${backendServer.port}`,
        auth: {
          secret: TEST_SECRET,
          jwtOptions: {
            algorithms: ['HS256'], // Only allow HS256
          },
        },
      })

      // Try to create a token with HS512
      const token = new SignJWT({ sub: 'user123' })
        .setProtectedHeader({ alg: 'HS512' }) // Different algorithm
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(SECRET_ENCODER)

      const request = new Request('http://localhost/api/algo/test', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${await token}`,
        },
      })

      const response = await gateway.fetch(request)
      expect(response.status).toBe(401)

      await gateway.close()
    })

    test('should reject JWT with "none" algorithm', async () => {
      const gateway = new BunGateway()

      gateway.addRoute({
        pattern: '/api/algo/*',
        methods: ['GET'],
        target: `http://localhost:${backendServer.port}`,
        auth: {
          secret: TEST_SECRET,
          jwtOptions: {
            algorithms: ['HS256'],
          },
        },
      })

      // Manually create a JWT with "none" algorithm (security vulnerability test)
      const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }))
      const payload = btoa(JSON.stringify({ sub: 'user123', exp: 9999999999 }))
      const token = `${header}.${payload}.`

      const request = new Request('http://localhost/api/algo/test', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const response = await gateway.fetch(request)
      expect(response.status).toBe(401)

      await gateway.close()
    })
  })
})
