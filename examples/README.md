# Bungate Examples

This directory contains working examples demonstrating various Bungate features and configurations.

## 📁 Available Examples

### 🚀 Basic Examples

#### [`basic.ts`](./basic.ts)

A minimal gateway setup demonstrating basic routing and proxying.

**Features:**

- Simple route configuration
- Basic proxying
- Minimal setup

**Run:**

```bash
bun run examples/basic.ts
```

---

### 🔐 Security Examples

#### [`security-hardened.ts`](./security-hardened.ts)

Production-ready security-hardened gateway with comprehensive security features.

**Features:**

- ✅ TLS 1.3 with strong cipher suites
- ✅ API key authentication
- ✅ Rate limiting per user/IP
- ✅ Security headers (HSTS, CSP, X-Frame-Options)
- ✅ Input validation
- ✅ Request size limits
- ✅ CORS configuration
- ✅ WebSocket support
- ✅ Health checks and metrics
- ✅ Graceful shutdown

**Authentication:**

- JWT authentication for user endpoints
- API key authentication for public/metrics endpoints
- Multiple authentication strategies

**Run:**

```bash
# Set required environment variables
export JWT_PRIMARY="your-secret-key"
export TLS_CERT_PATH="./examples/cert.pem"
export TLS_KEY_PATH="./examples/key.pem"

# Run the gateway
bun run examples/security-hardened.ts

# Test with API key
curl -H "X-API-Key: public-api-key-1" https://localhost:3443/api/public/test --insecure
```

**Test Endpoints:**

```bash
# Health check (public, no auth)
curl http://localhost:3080/health

# Metrics (requires API key)
curl -H "X-API-Key: metrics-key" http://localhost:3080/metrics

# User API (requires API key - JWT-only not working)
curl -H "X-API-Key: public-api-key-1" https://localhost:3443/api/users/123 --insecure

# Admin API (requires API key)
curl -H "X-API-Key: admin-key" https://localhost:3443/api/admin/users --insecure
```

---

#### [`tls-example.ts`](./tls-example.ts)

Comprehensive TLS/HTTPS configuration examples.

**Includes 7 different scenarios:**

1. **Basic HTTPS** - Simple TLS setup
2. **HTTP Redirect** - Automatic HTTP→HTTPS redirect
3. **Custom Cipher Suites** - Advanced TLS configuration
4. **Mutual TLS (mTLS)** - Client certificate authentication
5. **Buffer Certificates** - Loading certs from memory
6. **Production TLS** - Production-grade configuration
7. **TLS Proxy** - HTTPS gateway to HTTP backend

**Run an example:**

```bash
# Basic HTTPS
bun run examples/tls-example.ts

# Follow the prompts to select different examples
```

**Test:**

```bash
# Basic HTTPS test
curl https://localhost:4443/test --insecure

# With client certificate (mTLS)
curl --cert client-cert.pem --key client-key.pem https://localhost:4443/test --cacert ca.pem
```

---

### ⚖️ Load Balancing Examples

#### [`lb-example-all-options.ts`](./lb-example-all-options.ts)

Comprehensive load balancing configuration with all available strategies.

**Load Balancing Strategies:**

- `round-robin` - Distribute evenly in sequence
- `least-connections` - Route to server with fewest active connections
- `random` - Random distribution
- `weighted` - Control distribution percentages
- `ip-hash` - Session affinity based on client IP
- `p2c` (power-of-two-choices) - Pick best of two random servers
- `latency` - Route to fastest responding server
- `weighted-least-connections` - Weighted with connection awareness

**Features:**

- Health checks
- Circuit breakers
- Retry logic
- Failover handling

**Run:**

```bash
# Start backend servers first
bun run examples/echo-server-0.ts &
bun run examples/echo-server-1.ts &

# Start the load balancer
bun run examples/lb-example-all-options.ts

# Test
curl http://localhost:3000/api/test
```

---

#### [`cluster-example.ts`](./cluster-example.ts)

Multi-core clustering for maximum performance.

**Features:**

- Automatic worker spawning
- Load distribution across CPU cores
- Worker health monitoring
- Graceful restarts
- Zero-downtime deployments

**Run:**

```bash
bun run examples/cluster-example.ts
```

---

### ✅ Validation Examples

#### [`validation-example.ts`](./validation-example.ts)

Input validation and sanitization examples.

**Features:**

- Request body validation
- Query parameter validation
- Custom validation rules
- Error handling

**Run:**

```bash
bun run examples/validation-example.ts

# Test validation
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"John","email":"john@example.com","age":25}'
```

---

### 🛠️ Supporting Files

- **`echo-server-0.ts`, `echo-server-1.ts`** - Test backend servers for load balancing examples
- **`cert.pem`, `key.pem`** - Self-signed certificates for TLS examples (for development only)

---

## 🔧 Common Setup

### Prerequisites

```bash
# Install Bun (if not already installed)
curl -fsSL https://bun.sh/install | bash

# Install dependencies
bun install
```

### Generate TLS Certificates (for testing)

```bash
# Generate self-signed certificate
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes \
  -subj "/CN=localhost"

# Move to examples directory
mv cert.pem key.pem examples/
```

---

## 🎯 Authentication Examples

### API Key Authentication

```typescript
import { BunGateway } from 'bungate'

const gateway = new BunGateway()

// Basic API key auth
gateway.addRoute({
  pattern: '/api/*',
  target: 'http://backend:3000',
  auth: {
    apiKeys: ['key1', 'key2', 'key3'],
    apiKeyHeader: 'X-API-Key',
  },
})

await gateway.listen(3000)
```

**Test:**

```bash
# Valid request
curl -H "X-API-Key: key1" http://localhost:3000/api/data

# Invalid request
curl -H "X-API-Key: wrong-key" http://localhost:3000/api/data
# Returns: 401 Unauthorized
```

### API Key with Custom Validator

```typescript
gateway.addRoute({
  pattern: '/api/*',
  target: 'http://backend:3000',
  auth: {
    apiKeys: ['service-key-1', 'service-key-2'],
    apiKeyHeader: 'X-API-Key',
    apiKeyValidator: async (key: string) => {
      // Custom validation logic
      console.log('Validating key:', key)

      // Check format
      if (!key.startsWith('service-')) {
        return false
      }

      // Check against database (example)
      const isValid = await checkDatabase(key)
      return isValid
    },
  },
})
```

### Multiple Routes with Different Auth

```typescript
// Public route - no auth
gateway.addRoute({
  pattern: '/public/*',
  target: 'http://backend:3000',
})

// Service API - requires API key
gateway.addRoute({
  pattern: '/api/services/*',
  target: 'http://backend:3000',
  auth: {
    apiKeys: ['service-key-1'],
    apiKeyHeader: 'X-Service-Key',
  },
})

// Admin API - requires different API key
gateway.addRoute({
  pattern: '/api/admin/*',
  target: 'http://backend:3000',
  auth: {
    apiKeys: ['admin-master-key'],
    apiKeyHeader: 'X-Admin-Key',
  },
})
```

---

## 📚 More Resources

- [Main README](../README.md) - Full documentation
- [Security Guide](../docs/SECURITY.md) - Security best practices
- [TLS Configuration](../docs/TLS_CONFIGURATION.md) - Detailed TLS guide
- [API Documentation](../README.md#api) - Complete API reference
- [Troubleshooting](../README.md#troubleshooting) - Common issues and solutions

---

## 🤝 Contributing

Found an issue or want to add an example?

1. Fork the repository
2. Create a new example file
3. Update this README
4. Submit a pull request

---

## 📝 License

MIT Licensed - see [LICENSE](../LICENSE) for details.
