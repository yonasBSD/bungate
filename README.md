# 🚀 Bungate

> **The Lightning-Fast HTTP Gateway & Load Balancer for the Modern Web**

[![Built with Bun](https://img.shields.io/badge/Built%20with-Bun-f472b6?logo=bun)](https://bun.sh)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Performance](https://img.shields.io/badge/Performance-Blazing%20Fast-orange)](https://github.com/BackendStack21/bungate)
[![License](https://img.shields.io/badge/License-MIT-green)](./LICENSE)

**Bungate** is a next-generation HTTP gateway and load balancer that harnesses the incredible speed of Bun to deliver unparalleled performance for modern web applications. Built from the ground up with TypeScript, it provides enterprise-grade features with zero-config simplicity.

<img src="https://raw.githubusercontent.com/BackendStack21/bungate/main/bungate-logo.png" alt="Bungate Logo" width="200"/>

## ⚡ Why Bungate?

- **🔥 Blazing Fast**: Built on Bun - up to 4x faster than Node.js alternatives
- **🎯 Zero Config**: Works out of the box with sensible defaults
- **🧠 Smart Load Balancing**: 5 load balancing algorithms: `round-robin`, `least-connections`, `random`, `weighted`, `ip-hash`
- **🛡️ Production Ready**: Circuit breakers, health checks, and auto-failover
- **🔐 Built-in Authentication**: JWT, API keys, JWKS, and OAuth2 support out of the box
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

```typescript
gateway.addRoute({
  pattern: '/api/public/*',
  target: 'http://public-api:3000',
  auth: {
    // Static API keys
    apiKeys: ['key1', 'key2', 'key3'],
    apiKeyHeader: 'x-api-key',

    // Dynamic API key validation
    apiKeyValidator: async (key, req) => {
      const user = await validateApiKey(key)
      if (user) {
        // Attach user info to request
        ;(req as any).user = user
        return true
      }
      return false
    },
  },
})
```

#### Mixed Authentication (JWT + API Key)

```typescript
gateway.addRoute({
  pattern: '/api/hybrid/*',
  target: 'http://hybrid-service:3000',
  auth: {
    // JWT authentication
    secret: process.env.JWT_SECRET,
    jwtOptions: {
      algorithms: ['HS256'],
      issuer: 'https://auth.myapp.com',
    },

    // API key fallback
    apiKeys: async (key, req) => {
      return await isValidApiKey(key)
    },
    apiKeyHeader: 'x-api-key',

    // Custom token extraction
    getToken: (req) => {
      return (
        req.headers.get('authorization')?.replace('Bearer ', '') ||
        req.headers.get('x-access-token') ||
        new URL(req.url).searchParams.get('token')
      )
    },

    // Custom error handling
    unauthorizedResponse: {
      status: 401,
      body: { error: 'Authentication required', code: 'AUTH_REQUIRED' },
      headers: { 'Content-Type': 'application/json' },
    },
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

## 📄 License

MIT Licensed - see [LICENSE](LICENSE) for details.

---

<div align="center">

**Built with ❤️ by [21no.de](https://21no.de) for the JavaScript Community**

[🏠 Homepage](https://github.com/BackendStack21/bungate) | [📚 Documentation](https://github.com/BackendStack21/bungate#readme) | [🐛 Issues](https://github.com/BackendStack21/bungate/issues) | [💬 Discussions](https://github.com/BackendStack21/bungate/discussions)

</div>
