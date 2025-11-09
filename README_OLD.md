# 🚀 Bungate

> **The Lightning-Fast HTTP Gateway & Load Balancer for the Modern Web**

[![Built with Bun](https://img.shields.io/badge/Built%20with-Bun-f472b6?logo=bun)](https://bun.sh)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Performance](https://img.shields.io/badge/Performance-Blazing%20Fast-orange)](https://github.com/BackendStack21/bungate)
[![License](https://img.shields.io/badge/License-MIT-green)](./LICENSE)

**Bungate** is a next-generation HTTP gateway and load balancer that harnesses the incredible speed of Bun to deliver unparalleled performance for modern web applications. Built from the ground up with TypeScript, it provides enterprise-grade features with zero-config simplicity.

<img src="https://raw.githubusercontent.com/BackendStack21/bungate/main/bungate-logo.png" alt="Bungate Logo" width="200"/>

> Landing page: [https://bungate.21no.de](https://bungate.21no.de)

## ⚡ Why Bungate?

- **🔥 Blazing Fast**: Built on Bun - up to 4x faster than Node.js alternatives
- **🎯 Zero Config**: Works out of the box with sensible defaults
- **🧠 Smart Load Balancing**: Multiple algorithms: `round-robin`, `least-connections`, `random`, `weighted`, `ip-hash`, `p2c` (power-of-two-choices), `latency`, `weighted-least-connections`
- **🛡️ Production Ready**: Circuit breakers, health checks, and auto-failover
- **🔐 Built-in Authentication**: JWT, API keys, JWKS, and OAuth2 support out of the box
- **🔒 Enterprise Security**: TLS/HTTPS, input validation, security headers, and comprehensive hardening
- **🎨 Developer Friendly**: Full TypeScript support with intuitive APIs
- **📊 Observable**: Built-in metrics, logging, and monitoring
- **🔧 Extensible**: Powerful middleware system for custom logic

> See benchmarks comparing Bungate with Nginx and Envoy in the [benchmark directory](./benchmark).

## 🚀 Quick Start

Get up and running in less than 60 seconds:

```bash
# Install Bungate
bun add bungate

# Create your gateway
touch gateway.ts
```

```typescript
import { BunGateway } from 'bungate'

// Create a production-ready gateway with zero config
const gateway = new BunGateway({
  server: { port: 3000 },
  metrics: { enabled: true }, // Enable Prometheus metrics
})

// Add intelligent load balancing
gateway.addRoute({
  pattern: '/api/*',
  loadBalancer: {
    strategy: 'least-connections',
    targets: [
      { url: 'http://api1.example.com' },
      { url: 'http://api2.example.com' },
      { url: 'http://api3.example.com' },
    ],
    healthCheck: {
      enabled: true,
      interval: 30000,
      timeout: 5000,
      path: '/health',
    },
  },
})

// Add rate limiting and single target for public routes
gateway.addRoute({
  pattern: '/public/*',
  target: 'http://backend.example.com',
  rateLimit: {
    max: 1000,
    windowMs: 60000,
    keyGenerator: (req) => req.headers.get('x-forwarded-for') || 'unknown',
  },
})

// Start the gateway
await gateway.listen()
console.log('🚀 Bungate running on http://localhost:3000')
```

**That's it!** Your high-performance gateway is now handling traffic with:

- ✅ Automatic load balancing
- ✅ Health monitoring
- ✅ Rate limiting
- ✅ Circuit breaker protection
- ✅ Prometheus metrics
- ✅ Cluster mode support
- ✅ Structured logging

### 🔒 Quick Start with TLS/HTTPS

For production deployments with HTTPS:

```typescript
import { BunGateway } from 'bungate'

const gateway = new BunGateway({
  server: { port: 443 },
  security: {
    tls: {
      enabled: true,
      cert: './cert.pem',
      key: './key.pem',
      minVersion: 'TLSv1.3',
      redirectHTTP: true,
      redirectPort: 80,
    },
  },
})

gateway.addRoute({
  pattern: '/api/*',
  target: 'http://backend:3000',
  auth: {
    secret: process.env.JWT_SECRET,
    jwtOptions: {
      algorithms: ['HS256'],
      issuer: 'https://auth.example.com',
    },
  },
})

await gateway.listen()
console.log('🔒 Secure gateway running on https://localhost')
```

## 🌟 Key Features

### 🚀 **Performance & Scalability**

- **High Throughput**: Handle thousands of requests per second
- **Low Latency**: Minimal overhead routing with optimized request processing
- **Memory Efficient**: Optimized for high-concurrent workloads
- **Auto-scaling**: Dynamic target management and health monitoring
- **Cluster Mode**: Multi-process clustering for maximum CPU utilization

### 🎯 **Load Balancing Strategies**

- **Round Robin**: Equal distribution across all targets
- **Weighted**: Distribute based on server capacity and weights
- **Least Connections**: Route to the least busy server
- **IP Hash**: Consistent routing based on client IP for session affinity
- **Random**: Randomized distribution for even load
- **Power of Two Choices (p2c)**: Pick the better of two random targets by load/latency
- **Latency**: Prefer the target with the lowest average response time
- **Weighted Least Connections**: Prefer targets with fewer connections normalized by weight
- **Sticky Sessions**: Session affinity with cookie-based persistence

### 🛡️ **Reliability & Resilience**

- **Circuit Breaker Pattern**: Automatic failure detection and recovery
- **Health Checks**: Active monitoring with custom validation
- **Timeout Management**: Route-level and global timeout controls
- **Auto-failover**: Automatic traffic rerouting on service failures
- **Graceful Degradation**: Fallback responses and cached data support

### 🔧 **Advanced Features**

- **Authentication & Authorization**: JWT, API keys, JWKS, OAuth2/OIDC support
- **Middleware System**: Custom request/response processing pipeline
- **Path Rewriting**: URL transformation and routing rules
- **Rate Limiting**: Flexible rate limiting with custom key generation
- **CORS Support**: Full cross-origin resource sharing configuration
- **Request/Response Hooks**: Comprehensive lifecycle event handling

### 🔒 **Enterprise Security**

- **TLS/HTTPS**: Full TLS 1.3 support with automatic HTTP redirect
- **Input Validation**: Comprehensive validation and sanitization
- **Security Headers**: HSTS, CSP, X-Frame-Options, and more
- **Session Management**: Cryptographically secure session IDs
- **Trusted Proxies**: IP validation and forwarded header verification
- **Secure Error Handling**: Safe error responses without information disclosure
- **Request Size Limits**: Protection against DoS attacks
- **JWT Key Rotation**: Zero-downtime key rotation support

### 📊 **Monitoring & Observability**

- **Prometheus Metrics**: Out-of-the-box performance metrics
- **Structured Logging**: JSON logging with request tracing
- **Health Endpoints**: Built-in health check APIs
- **Real-time Statistics**: Live performance monitoring
- **Custom Metrics**: Application-specific metric collection

### 🎨 **Developer Experience**

- **TypeScript First**: Full type safety and IntelliSense support
- **Zero Dependencies**: Minimal footprint with essential features only
- **Hot Reload**: Development mode with automatic restarts
- **Rich Documentation**: Comprehensive examples and API documentation
- **Testing Support**: Built-in utilities for testing and development

## 🏗️ Real-World Examples

### 🌐 **Microservices Gateway**

Perfect for microservices architectures with intelligent routing:

```typescript
import { BunGateway } from 'bungate'

const gateway = new BunGateway({
  server: { port: 8080 },
  cors: {
    origin: ['https://myapp.com', 'https://admin.myapp.com'],
    credentials: true,
  },
})

// User service with JWT authentication
gateway.addRoute({
  pattern: '/users/*',
  target: 'http://user-service:3001',
  auth: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    jwtOptions: {
      algorithms: ['HS256'],
      issuer: 'https://auth.myapp.com',
      audience: 'https://api.myapp.com',
    },
    optional: false,
    excludePaths: ['/users/register', '/users/login'],
  },
  rateLimit: {
    max: 100,
    windowMs: 60000,
    keyGenerator: (req) =>
      (req as any).user?.id || req.headers.get('x-forwarded-for') || 'unknown',
  },
})

// Payment service with circuit breaker
gateway.addRoute({
  pattern: '/payments/*',
  target: 'http://payment-service:3002',
  circuitBreaker: {
    enabled: true,
    failureThreshold: 3,
    timeout: 5000,
    resetTimeout: 5000,
  },
  hooks: {
    onError(req, error): Promise<Response> {
      // Fallback to cached payment status
      return getCachedPaymentStatus(req.url)
    },
  },
})
```

### 🔄 **High-Performance Cluster Mode**

Scale horizontally with multi-process clustering:

```typescript
import { BunGateway } from 'bungate'

const gateway = new BunGateway({
  server: { port: 3000 },
  cluster: {
    enabled: true,
    workers: 4, // Number of worker processes
    restartWorkers: true,
    maxRestarts: 10,
    shutdownTimeout: 30000,
  },
})

// High-traffic API endpoints
gateway.addRoute({
  pattern: '/api/v1/*',
  loadBalancer: {
    targets: [
      { url: 'http://api-server-1:8080', weight: 2 },
      { url: 'http://api-server-2:8080', weight: 2 },
      { url: 'http://api-server-3:8080', weight: 1 },
    ],
    strategy: 'least-connections',
    healthCheck: {
      enabled: true,
      interval: 5000,
      timeout: 2000,
      path: '/health',
    },
  },
})

// Start cluster
await gateway.listen(3000)
console.log('Cluster started with 4 workers')
```

#### Advanced usage: Cluster lifecycle and operations

Bungate’s cluster manager powers zero-downtime restarts, dynamic scaling, and safe shutdowns in production. You can control it via signals or programmatically.

- Zero-downtime rolling restart: send `SIGUSR2` to the master process
  - The manager spawns a replacement worker first, then gracefully stops the old one
- Graceful shutdown: send `SIGTERM` or `SIGINT`
  - Workers receive `SIGTERM` and are given up to `shutdownTimeout` to exit before being force-killed

Programmatic controls (available when using the `ClusterManager` directly):

```ts
import { ClusterManager, BunGateLogger } from 'bungate'

const logger = new BunGateLogger({ level: 'info' })

const cluster = new ClusterManager(
  {
    enabled: true,
    workers: 4,
    restartWorkers: true,
    restartDelay: 1000, // base delay used for exponential backoff with jitter
    maxRestarts: 10, // lifetime cap per worker
    respawnThreshold: 5, // sliding window cap
    respawnThresholdTime: 60_000, // within this time window
    shutdownTimeout: 30_000,
    // Set to false when embedding in tests to avoid process.exit(0)
    exitOnShutdown: true,
  },
  logger,
  './gateway.ts', // worker entry (executed with Bun)
)

await cluster.start()

// Dynamic scaling
await cluster.scaleUp(2) // add 2 workers
await cluster.scaleDown(1) // remove 1 worker
await cluster.scaleTo(6) // set exact worker count

// Operational visibility
console.log(cluster.getWorkerCount())
console.log(cluster.getWorkerInfo()) // includes id, restarts, pid, etc.

// Broadcast a POSIX signal to all workers (e.g., for log-level reloads)
cluster.broadcastSignal('SIGHUP')

// Target a single worker
cluster.sendSignalToWorker(1, 'SIGHUP')

// Graceful shutdown (will exit process if exitOnShutdown !== false)
// await (cluster as any).gracefulShutdown() // internal in gateway use; prefer SIGTERM
```

Notes:

- Each worker receives `CLUSTER_WORKER=true` and `CLUSTER_WORKER_ID=<n>` environment variables.
- Restart policy uses exponential backoff with jitter and a sliding window threshold to prevent flapping.
- Defaults: `shutdownTimeout` 30s, `respawnThreshold` 5 within 60s, `restartDelay` 1s, `maxRestarts` 10.

Configuration reference (cluster):

- `enabled` (boolean): enable multi-process mode
- `workers` (number): worker process count (defaults to CPU cores)
- `restartWorkers` (boolean): auto-respawn crashed workers
- `restartDelay` (ms): base delay for backoff
- `maxRestarts` (number): lifetime restarts per worker
- `respawnThreshold` (number): max restarts within time window
- `respawnThresholdTime` (ms): sliding window size
- `shutdownTimeout` (ms): grace period before force-kill
- `exitOnShutdown` (boolean): if true (default), master exits after shutdown; set false in tests/embedded

### 🔄 **Advanced Load Balancing**

Distribute traffic intelligently across multiple backends:

```typescript
// E-commerce platform with weighted distribution
gateway.addRoute({
  pattern: '/products/*',
  loadBalancer: {
    strategy: 'weighted',
    targets: [
      { url: 'http://products-primary:3000', weight: 70 },
      { url: 'http://products-secondary:3001', weight: 20 },
      { url: 'http://products-cache:3002', weight: 10 },
    ],
    healthCheck: {
      enabled: true,
      path: '/health',
      interval: 15000,
      timeout: 5000,
      expectedStatus: 200,
    },
  },
})

// Session-sticky load balancing for stateful apps
gateway.addRoute({
  pattern: '/app/*',
  loadBalancer: {
    strategy: 'ip-hash',
    targets: [
      { url: 'http://app-server-1:3000' },
      { url: 'http://app-server-2:3000' },
      { url: 'http://app-server-3:3000' },
    ],
    stickySession: {
      enabled: true,
      cookieName: 'app-session',
      ttl: 3600000, // 1 hour
    },
  },
})
```

### 🛡️ **Enterprise Security**

Production-grade security with multiple layers:

```typescript
// API Gateway with comprehensive security
gateway.addRoute({
  pattern: '/api/v1/*',
  target: 'http://api-backend:3000',
  auth: {
    // JWT authentication
    secret: process.env.JWT_SECRET,
    jwtOptions: {
      algorithms: ['HS256', 'RS256'],
      issuer: 'https://auth.myapp.com',
      audience: 'https://api.myapp.com',
    },
    // API key authentication (fallback)
    apiKeys: async (key, req) => {
      const validKeys = await getValidApiKeys()
      return validKeys.includes(key)
    },
    apiKeyHeader: 'x-api-key',
    optional: false,
    excludePaths: ['/api/v1/health', '/api/v1/public/*'],
  },
  middlewares: [
    // Request validation
    async (req, next) => {
      if (req.method === 'POST' || req.method === 'PUT') {
        const body = await req.json()
        const validation = validateRequestBody(body)
        if (!validation.valid) {
          return new Response(JSON.stringify(validation.errors), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          })
        }
      }
      return next()
    },
  ],
  rateLimit: {
    max: 1000,
    windowMs: 60000,
    keyGenerator: (req) =>
      (req as any).user?.id ||
      req.headers.get('x-api-key') ||
      req.headers.get('x-forwarded-for') ||
      'unknown',
    message: 'API rate limit exceeded',
  },
  proxy: {
    headers: {
      'X-Gateway-Version': '1.0.0',
      'X-Request-ID': () => crypto.randomUUID(),
    },
  },
})
```

## 🔐 **Built-in Authentication**

Bungate provides comprehensive authentication support out of the box:

#### JWT Authentication

```typescript
// Gateway-level JWT authentication (applies to all routes)
const gateway = new BunGateway({
  server: { port: 3000 },
  auth: {
    secret: process.env.JWT_SECRET,
    jwtOptions: {
      algorithms: ['HS256', 'RS256'],
      issuer: 'https://auth.myapp.com',
      audience: 'https://api.myapp.com',
    },
    excludePaths: ['/health', '/metrics', '/auth/login', '/auth/register'],
  },
})

// Route-level JWT authentication (overrides gateway settings)
gateway.addRoute({
  pattern: '/admin/*',
  target: 'http://admin-service:3000',
  auth: {
    secret: process.env.ADMIN_JWT_SECRET,
    jwtOptions: {
      algorithms: ['RS256'],
      issuer: 'https://auth.myapp.com',
      audience: 'https://admin.myapp.com',
    },
    optional: false,
  },
})
```

#### JWKS (JSON Web Key Set) Authentication

```typescript
gateway.addRoute({
  pattern: '/secure/*',
  target: 'http://secure-service:3000',
  auth: {
    jwksUri: 'https://auth.myapp.com/.well-known/jwks.json',
    jwtOptions: {
      algorithms: ['RS256'],
      issuer: 'https://auth.myapp.com',
      audience: 'https://api.myapp.com',
    },
  },
})
```

#### API Key Authentication

API key authentication is perfect for service-to-service communication and public APIs:

```typescript
// Basic API key authentication
gateway.addRoute({
  pattern: '/api/public/*',
  target: 'http://public-api:3000',
  auth: {
    // Static API keys
    apiKeys: ['key1', 'key2', 'key3'],
    apiKeyHeader: 'X-API-Key', // Custom header name
  },
})

// Advanced: Dynamic API key validation with custom logic
gateway.addRoute({
  pattern: '/api/partners/*',
  target: 'http://partner-api:3000',
  auth: {
    apiKeys: ['partner-key-1', 'partner-key-2'],
    apiKeyHeader: 'X-API-Key',

    // Custom validator for additional checks
    apiKeyValidator: async (key: string) => {
      // Example: Check if key is in allowed format
      if (!key.startsWith('partner-')) {
        return false
      }

      // Example: Validate against database
      const isValid = await db.validateApiKey(key)
      return isValid
    },
  },
})

// Multiple API keys with different access levels
gateway.addRoute({
  pattern: '/api/admin/*',
  target: 'http://admin-api:3000',
  auth: {
    apiKeys: ['admin-master-key', 'admin-readonly-key', 'service-account-key'],
    apiKeyHeader: 'X-Admin-Key',
  },
})
```

**Testing API Key Authentication:**

```bash
# Valid request with API key
curl -H "X-API-Key: key1" http://localhost:3000/api/public/data

# Invalid request (missing API key)
curl http://localhost:3000/api/public/data
# Returns: 401 Unauthorized

# Invalid request (wrong API key)
curl -H "X-API-Key: wrong-key" http://localhost:3000/api/public/data
# Returns: 401 Unauthorized
```

#### Hybrid Authentication (JWT + API Key)

> ⚠️ **Important Note**: When both `secret` (JWT) and `apiKeys` are configured on a route, the API key becomes **required**. JWT authentication alone will not work. This is the current behavior of the underlying middleware.

For routes that support multiple authentication methods:

```typescript
gateway.addRoute({
  pattern: '/api/hybrid/*',
  target: 'http://hybrid-service:3000',
  auth: {
    // JWT configuration
    secret: process.env.JWT_SECRET,
    jwtOptions: {
      algorithms: ['HS256'],
      issuer: 'https://auth.myapp.com',
    },

    // API key configuration
    // When apiKeys are present, API key is REQUIRED
    apiKeys: ['service-key-1', 'service-key-2'],
    apiKeyHeader: 'X-API-Key',

    // Custom token extraction
    getToken: (req) => {
      return (
        req.headers.get('authorization')?.replace('Bearer ', '') ||
        req.headers.get('x-access-token') ||
        new URL(req.url).searchParams.get('token')
      )
    },
  },
})
```

**Best Practice for Multiple Auth Methods:**

To support **either** JWT **or** API key authentication, create separate routes:

```typescript
// Option 1: JWT-only route (⚠️ see known limitations below)
gateway.addRoute({
  pattern: '/api/users/*',
  target: 'http://user-service:3000',
  auth: {
    secret: process.env.JWT_SECRET,
    jwtOptions: { algorithms: ['HS256'] },
  },
})

// Option 2: API key-only route (✅ works reliably)
gateway.addRoute({
  pattern: '/api/services/*',
  target: 'http://service-api:3000',
  auth: {
    apiKeys: process.env.SERVICE_API_KEYS?.split(',') || [],
    apiKeyHeader: 'X-Service-Key',
  },
})
```

#### OAuth2 / OpenID Connect

```typescript
gateway.addRoute({
  pattern: '/oauth/*',
  target: 'http://oauth-service:3000',
  auth: {
    jwksUri: 'https://accounts.google.com/.well-known/jwks.json',
    jwtOptions: {
      algorithms: ['RS256'],
      issuer: 'https://accounts.google.com',
      audience: 'your-google-client-id',
    },

    // Custom validation
    onError: (error, req) => {
      console.error('OAuth validation failed:', error)
      return new Response('OAuth authentication failed', { status: 401 })
    },
  },
})
```

### 🎯 Authentication Best Practices

#### 1. **Use Environment Variables for Secrets**

```typescript
// ❌ DON'T hardcode secrets
auth: {
  apiKeys: ['hardcoded-key-123'],
  secret: 'hardcoded-jwt-secret',
}

// ✅ DO use environment variables
auth: {
  apiKeys: process.env.API_KEYS?.split(',') || [],
  secret: process.env.JWT_SECRET,
}
```

#### 2. **Implement API Key Rotation**

```typescript
// Store API keys with metadata
interface ApiKeyConfig {
  key: string
  name: string
  createdAt: Date
  expiresAt?: Date
}

const apiKeys: ApiKeyConfig[] = [
  { key: 'current-key', name: 'prod-v2', createdAt: new Date('2024-01-01') },
  {
    key: 'old-key',
    name: 'prod-v1',
    createdAt: new Date('2023-01-01'),
    expiresAt: new Date('2024-12-31'),
  },
]

gateway.addRoute({
  pattern: '/api/*',
  target: 'http://api:3000',
  auth: {
    apiKeys: apiKeys.map((k) => k.key),
    apiKeyValidator: async (key: string) => {
      const keyConfig = apiKeys.find((k) => k.key === key)
      if (!keyConfig) return false

      // Check expiration
      if (keyConfig.expiresAt && keyConfig.expiresAt < new Date()) {
        console.warn(`Expired API key used: ${keyConfig.name}`)
        return false
      }

      return true
    },
  },
})
```

#### 3. **Rate Limit by Authentication**

```typescript
gateway.addRoute({
  pattern: '/api/*',
  target: 'http://api:3000',
  auth: {
    apiKeys: ['key1', 'key2'],
    apiKeyHeader: 'X-API-Key',
  },
  rateLimit: {
    max: 1000,
    windowMs: 60000,
    // Rate limit per API key
    keyGenerator: (req) => {
      return req.headers.get('x-api-key') || 'anonymous'
    },
  },
})
```

#### 4. **Monitor Authentication Failures**

```typescript
import { PinoLogger } from 'bungate'

const logger = new PinoLogger({ level: 'info' })

gateway.addRoute({
  pattern: '/api/*',
  target: 'http://api:3000',
  auth: {
    apiKeys: ['key1'],
    apiKeyHeader: 'X-API-Key',
    apiKeyValidator: async (key: string, req) => {
      const isValid = key === 'key1'

      if (!isValid) {
        logger.warn({
          event: 'auth_failure',
          path: new URL(req.url).pathname,
          ip: req.headers.get('x-forwarded-for'),
          timestamp: new Date().toISOString(),
        })
      }

      return isValid
    },
  },
})
```

#### 5. **Separate Authentication for Different Environments**

```typescript
const isProd = process.env.NODE_ENV === 'production'

gateway.addRoute({
  pattern: '/api/*',
  target: 'http://api:3000',
  auth: isProd
    ? {
        // Production: Strict authentication
        apiKeys: process.env.PROD_API_KEYS?.split(',') || [],
        apiKeyHeader: 'X-API-Key',
      }
    : {
        // Development: Relaxed for testing
        apiKeys: ['dev-key-1', 'dev-key-2'],
        apiKeyHeader: 'X-API-Key',
      },
})
```

#### 6. **Validate API Key Format**

```typescript
gateway.addRoute({
  pattern: '/api/*',
  target: 'http://api:3000',
  auth: {
    apiKeys: ['prod-key-abc123', 'prod-key-xyz789'],
    apiKeyHeader: 'X-API-Key',
    apiKeyValidator: async (key: string) => {
      // Enforce key format (e.g., must start with 'prod-key-')
      if (!key.startsWith('prod-key-')) {
        return false
      }

      // Enforce minimum length
      if (key.length < 16) {
        return false
      }

      // Check against allowed keys
      return ['prod-key-abc123', 'prod-key-xyz789'].includes(key)
    },
  },
})
```

#### 7. **Public vs Protected Routes**

```typescript
// Public routes - no authentication
gateway.addRoute({
  pattern: '/public/*',
  target: 'http://public-api:3000',
})

gateway.addRoute({
  pattern: '/health',
  handler: async () => new Response(JSON.stringify({ status: 'ok' })),
})

// Protected routes - require authentication
gateway.addRoute({
  pattern: '/api/users/*',
  target: 'http://user-service:3000',
  auth: {
    apiKeys: process.env.API_KEYS?.split(',') || [],
    apiKeyHeader: 'X-API-Key',
  },
})

gateway.addRoute({
  pattern: '/api/admin/*',
  target: 'http://admin-service:3000',
  auth: {
    // Admin endpoints use different, more restricted keys
    apiKeys: process.env.ADMIN_API_KEYS?.split(',') || [],
    apiKeyHeader: 'X-Admin-Key',
  },
})
```

#### 8. **Secure API Key Storage**

```bash
# Use a secrets manager in production
export API_KEYS=$(aws secretsmanager get-secret-value --secret-id prod/api-keys --query SecretString --output text)

# Or use encrypted environment files
# .env.production.encrypted
API_KEYS=key1,key2,key3

# Decrypt at runtime
export $(sops -d .env.production.encrypted | xargs)
```

#### 9. **Log Authentication Events**

```typescript
const logger = new PinoLogger({ level: 'info' })

gateway.addRoute({
  pattern: '/api/*',
  target: 'http://api:3000',
  middlewares: [
    // Log all authenticated requests
    async (req, next) => {
      const apiKey = req.headers.get('x-api-key')
      const startTime = Date.now()

      logger.info({
        event: 'api_request',
        path: new URL(req.url).pathname,
        hasApiKey: !!apiKey,
        timestamp: new Date().toISOString(),
      })

      const response = await next()

      logger.info({
        event: 'api_response',
        path: new URL(req.url).pathname,
        status: response.status,
        duration: Date.now() - startTime,
      })

      return response
    },
  ],
  auth: {
    apiKeys: ['key1', 'key2'],
    apiKeyHeader: 'X-API-Key',
  },
})
```

#### 10. **Test Authentication**

```typescript
// Create a test file: test-auth.ts
import { test, expect } from 'bun:test'

test('API key authentication', async () => {
  // Valid API key
  const validResponse = await fetch('http://localhost:3000/api/data', {
    headers: { 'X-API-Key': 'valid-key' },
  })
  expect(validResponse.status).toBe(200)

  // Invalid API key
  const invalidResponse = await fetch('http://localhost:3000/api/data', {
    headers: { 'X-API-Key': 'invalid-key' },
  })
  expect(invalidResponse.status).toBe(401)

  // Missing API key
  const missingResponse = await fetch('http://localhost:3000/api/data')
  expect(missingResponse.status).toBe(401)
})
```

**Run tests:**

```bash
bun test test-auth.ts
```

---

## 📦 Installation & Setup

### Prerequisites

- **Bun** >= 1.2.18 ([Install Bun](https://bun.sh/docs/installation))

### Installation

```bash
# Using Bun (recommended)
bun add bungate

# Using npm
npm install bungate

# Using yarn
yarn add bungate
```

## 🚀 Getting Started

### Basic Setup

```bash
# Create a new project
mkdir my-gateway && cd my-gateway
bun init

# Install BunGate
bun add bungate

# Create your gateway
touch gateway.ts
```

### Configuration Examples

#### Simple Gateway with Auth

```typescript
import { BunGateway, BunGateLogger } from 'bungate'

const logger = new BunGateLogger({
  level: 'info',
  format: 'pretty',
  enableRequestLogging: true,
})

const gateway = new BunGateway({
  server: { port: 3000 },

  // Global authentication
  auth: {
    secret: process.env.JWT_SECRET,
    jwtOptions: {
      algorithms: ['HS256'],
      issuer: 'https://auth.myapp.com',
    },
    excludePaths: ['/health', '/metrics', '/auth/*'],
  },

  // Enable metrics
  metrics: { enabled: true },
  // Enable logging
  logger,
})

// Add authenticated routes
gateway.addRoute({
  pattern: '/api/users/*',
  target: 'http://user-service:3001',
  rateLimit: {
    max: 100,
    windowMs: 60000,
  },
})

// Add public routes with API key authentication
gateway.addRoute({
  pattern: '/api/public/*',
  target: 'http://public-service:3002',
  auth: {
    apiKeys: ['public-key-1', 'public-key-2'],
    apiKeyHeader: 'x-api-key',
  },
})

await gateway.listen()
console.log('🚀 Bungate running on http://localhost:3000')
```

## 🔒 Security

Bungate provides enterprise-grade security features for production deployments:

### TLS/HTTPS Support

```typescript
const gateway = new BunGateway({
  server: { port: 443 },
  security: {
    tls: {
      enabled: true,
      cert: './cert.pem',
      key: './key.pem',
      minVersion: 'TLSv1.3',
      cipherSuites: ['TLS_AES_256_GCM_SHA384', 'TLS_CHACHA20_POLY1305_SHA256'],
      redirectHTTP: true,
      redirectPort: 80,
    },
  },
})
```

### Security Headers

Automatically add security headers to all responses:

```typescript
security: {
  securityHeaders: {
    enabled: true,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    contentSecurityPolicy: {
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'"],
        'frame-ancestors': ["'none'"],
      },
    },
    xFrameOptions: 'DENY',
    xContentTypeOptions: true,
  },
}
```

### Input Validation

Protect against injection attacks:

```typescript
security: {
  inputValidation: {
    maxPathLength: 2048,
    maxHeaderSize: 16384,
    allowedPathChars: /^[a-zA-Z0-9\/_\-\.~%]+$/,
    sanitizeHeaders: true,
  },
}
```

### Request Size Limits

Prevent DoS attacks with size limits:

```typescript
security: {
  sizeLimits: {
    maxBodySize: 10 * 1024 * 1024,  // 10 MB
    maxHeaderSize: 16 * 1024,        // 16 KB
    maxUrlLength: 2048,
  },
}
```

### Trusted Proxy Configuration

Secure client IP extraction:

```typescript
security: {
  trustedProxies: {
    enabled: true,
    trustedNetworks: ['cloudflare', 'aws'],
    maxForwardedDepth: 2,
  },
}
```

### JWT Key Rotation

Zero-downtime key rotation:

```typescript
security: {
  jwtKeyRotation: {
    secrets: [
      { key: 'new-secret', algorithm: 'HS256', primary: true },
      { key: 'old-secret', algorithm: 'HS256', deprecated: true },
    ],
    jwksUri: 'https://auth.example.com/.well-known/jwks.json',
  },
}
```

### Comprehensive Security Guide

For detailed security configuration, best practices, and compliance information, see the [Security Guide](./docs/SECURITY.md).

**Security Features:**

- ✅ TLS 1.3 with strong cipher suites
- ✅ Input validation and sanitization
- ✅ Security headers (HSTS, CSP, X-Frame-Options)
- ✅ Cryptographically secure sessions
- ✅ Trusted proxy validation
- ✅ Secure error handling
- ✅ Request size limits
- ✅ JWT key rotation
- ✅ OWASP Top 10 protection

---

## 🔧 Troubleshooting

### Authentication Issues

#### API Key Authentication

**Problem**: "401 Unauthorized" when API key is provided

**Solutions**:

```typescript
// ✅ Check 1: Verify API key is in the configured list
auth: {
  apiKeys: ['your-api-key-here'], // Make sure key matches exactly
  apiKeyHeader: 'X-API-Key', // Check header name matches your request
}

// ✅ Check 2: Verify header name is correct (case-insensitive in HTTP)
// Both work:
curl -H "X-API-Key: key1" http://localhost:3000/api
curl -H "x-api-key: key1" http://localhost:3000/api

// ✅ Check 3: Check for extra spaces or hidden characters
const apiKey = process.env.API_KEY?.trim()

// ✅ Check 4: Use custom validator for debugging
auth: {
  apiKeys: ['key1'],
  apiKeyHeader: 'X-API-Key',
  apiKeyValidator: async (key: string) => {
    console.log('Received API key:', key)
    console.log('Expected keys:', ['key1'])
    return ['key1'].includes(key)
  },
}
```

#### JWT Authentication

**Known Limitation**: JWT-only authentication (without `apiKeys` configured) currently has issues with token validation. Tokens may be rejected with "Invalid token" even when correctly signed.

**Workaround**:

```typescript
// ❌ JWT-only (currently has issues)
auth: {
  secret: 'my-secret',
  jwtOptions: { algorithms: ['HS256'] },
}

// ✅ Use API key authentication instead (reliable)
auth: {
  apiKeys: ['service-key-1', 'service-key-2'],
  apiKeyHeader: 'X-API-Key',
}

// ⚠️ Hybrid mode requires API key to be present
auth: {
  secret: 'my-secret',
  jwtOptions: { algorithms: ['HS256'] },
  apiKeys: ['key1'], // API key is REQUIRED when both are configured
  apiKeyHeader: 'X-API-Key',
}
```

**Issue Tracking**: JWT-only authentication issue is being investigated. See [test/gateway/gateway-auth.test.ts](./test/gateway/gateway-auth.test.ts) for details.

#### Mixed Authentication Not Working as Expected

**Problem**: Want to accept EITHER JWT OR API key, but both are required

**Solution**: Create separate routes for different auth methods:

```typescript
// JWT route
gateway.addRoute({
  pattern: '/api/jwt/*',
  target: 'http://backend:3000',
  auth: {
    // Note: JWT-only has known limitations
    secret: process.env.JWT_SECRET,
    jwtOptions: { algorithms: ['HS256'] },
  },
})

// API key route
gateway.addRoute({
  pattern: '/api/key/*',
  target: 'http://backend:3000',
  auth: {
    apiKeys: ['key1', 'key2'],
    apiKeyHeader: 'X-API-Key',
  },
})
```

### Performance Issues

**Problem**: Gateway is slow or timing out

**Solutions**:

```typescript
// ✅ Increase timeouts
gateway.addRoute({
  pattern: '/api/*',
  target: 'http://slow-service:3000',
  timeout: 60000, // 60 seconds
  proxy: {
    timeout: 60000,
  },
})

// ✅ Adjust circuit breaker thresholds
circuitBreaker: {
  enabled: true,
  threshold: 10, // Increase if service has occasional failures
  timeout: 30000,
  resetTimeout: 30000,
}

// ✅ Enable connection pooling and keep-alive
// (enabled by default in Bun)

// ✅ Check backend service health
healthCheck: {
  enabled: true,
  interval: 10000, // Check more frequently
  timeout: 3000,
  path: '/health',
}
```

### Load Balancing Issues

**Problem**: Requests not distributed evenly

**Solutions**:

```typescript
// ✅ Try different strategies based on your use case
loadBalancer: {
  strategy: 'least-connections', // Best for varying request durations
  // strategy: 'round-robin',    // Simple, predictable
  // strategy: 'weighted',        // Control distribution manually
  // strategy: 'ip-hash',         // Session affinity
  targets: [/* ... */],
}

// ✅ Check target health
healthCheck: {
  enabled: true,
  interval: 30000,
}

// ✅ Monitor target status
const status = gateway.getTargetStatus()
console.log('Healthy targets:', status.filter(t => t.healthy))
```

### Common Errors

**Error**: `JWT middleware requires either secret or jwksUri`

**Cause**: Auth configuration is missing `secret` or `jwksUri`

**Solution**:

```typescript
// ✅ Provide secret
auth: {
  secret: process.env.JWT_SECRET || 'fallback-secret',
  jwtOptions: { algorithms: ['HS256'] },
}

// OR provide jwksUri
auth: {
  jwksUri: 'https://auth.example.com/.well-known/jwks.json',
  jwtOptions: { algorithms: ['RS256'] },
}
```

**Error**: `Cannot find module 'bungate'`

**Solution**:

```bash
# Make sure bungate is installed
bun add bungate

# Check package.json
cat package.json | grep bungate
```

**Error**: `Port 3000 is already in use`

**Solution**:

```typescript
// Use a different port
const gateway = new BunGateway({
  server: { port: 3001 }, // Change port
})

// Or find what's using the port
lsof -i :3000
# Kill the process if needed
kill -9 <PID>
```

### Debug Mode

Enable detailed logging for troubleshooting:

```typescript
import { BunGateway } from 'bungate'
import { PinoLogger } from 'bungate'

const logger = new PinoLogger({
  level: 'debug', // Show all logs
  prettyPrint: true, // Human-readable format
})

const gateway = new BunGateway({
  logger,
  server: { port: 3000, development: true }, // Enable dev mode
})
```

### Getting Help

- 📚 [Examples Directory](./examples/) - Working code examples
- 🐛 [GitHub Issues](https://github.com/BackendStack21/bungate/issues) - Report bugs
- 💬 [Discussions](https://github.com/BackendStack21/bungate/discussions) - Ask questions
- 📖 [Documentation](./docs/) - Detailed guides

---

## 📄 License

MIT Licensed - see [LICENSE](LICENSE) for details.

---

<div align="center">

**Built with ❤️ by [21no.de](https://21no.de) for the JavaScript Community**

[🏠 Homepage](https://github.com/BackendStack21/bungate) | [📚 Documentation](https://github.com/BackendStack21/bungate#readme) | [🐛 Issues](https://github.com/BackendStack21/bungate/issues) | [💬 Discussions](https://github.com/BackendStack21/bungate/discussions)

</div>
