# 🔧 Troubleshooting Guide

Solutions to common issues and errors in Bungate.

## Table of Contents

- [Authentication Issues](#authentication-issues)
- [Load Balancing Problems](#load-balancing-problems)
- [Performance Issues](#performance-issues)
- [Clustering Issues](#clustering-issues)
- [TLS/HTTPS Problems](#tlshttps-problems)
- [Common Errors](#common-errors)
- [Debug Mode](#debug-mode)
- [Getting Help](#getting-help)

## Authentication Issues

### API Key Authentication Not Working

**Problem**: Receiving `401 Unauthorized` even with valid API key

**Checklist:**

```typescript
// ✅ 1. Verify API key is in configured list
auth: {
  apiKeys: ['your-api-key-here'], // Exact match required
  apiKeyHeader: 'X-API-Key',
}

// ✅ 2. Check header name matches (case-insensitive in HTTP)
// Both work:
curl -H "X-API-Key: key1" http://localhost:3000/api
curl -H "x-api-key: key1" http://localhost:3000/api

// ✅ 3. Check for spaces or hidden characters
const apiKey = process.env.API_KEY?.trim()

// ✅ 4. Enable debug logging
auth: {
  apiKeys: ['key1'],
  apiKeyHeader: 'X-API-Key',
  apiKeyValidator: async (key: string) => {
    console.log('Received key:', key)
    console.log('Expected keys:', ['key1'])
    console.log('Match:', key === 'key1')
    return ['key1'].includes(key)
  },
}
```

**Test manually:**

```bash
# Valid key
curl -v -H "X-API-Key: key1" http://localhost:3000/api/data

# Check response headers for clues
curl -i -H "X-API-Key: key1" http://localhost:3000/api/data

# Test with different header name
curl -v -H "Authorization: Bearer key1" http://localhost:3000/api/data
```

### JWT Validation Fails

### Mixed Authentication

**If you must use JWT**, check:

```bash
# 1. Verify token is valid
# Use jwt.io to decode and verify

# 2. Check expiration
# JWT must not be expired

# 3. Verify issuer/audience
# Must match configuration

# 4. Check algorithm
# Must be in allowed algorithms list
```

### Hybrid Authentication Not Working

**Problem**: Want either JWT or API key, but both are required

**Explanation**: When both `secret` and `apiKeys` are configured, API key becomes required.

**Solution**: Create separate routes:

```typescript
// JWT route
gateway.addRoute({
  pattern: '/api/jwt/*',
  target: 'http://backend:3000',
  auth: {
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

### 401 on Public Routes

**Problem**: Public routes requiring authentication

**Solution**: Check route order and excludePaths:

```typescript
// ❌ Auth applies to all routes
const gateway = new BunGateway({
  auth: {
    secret: process.env.JWT_SECRET,
    jwtOptions: { algorithms: ['HS256'] },
    // Missing excludePaths!
  },
})

// ✅ Exclude public routes
const gateway = new BunGateway({
  auth: {
    secret: process.env.JWT_SECRET,
    jwtOptions: { algorithms: ['HS256'] },
    excludePaths: [
      '/health',
      '/metrics',
      '/public/*', // Wildcard support
      '/auth/login',
      '/auth/register',
    ],
  },
})

// ✅ Or don't set gateway-level auth
const gateway = new BunGateway({
  server: { port: 3000 },
})

// Add auth per route
gateway.addRoute({
  pattern: '/api/protected/*',
  target: 'http://api:3000',
  auth: { apiKeys: ['key1'] },
})

gateway.addRoute({
  pattern: '/public/*',
  target: 'http://api:3000',
  // No auth
})
```

## Load Balancing Problems

### Uneven Distribution

**Problem**: One server receives more traffic than others

**Debug:**

```typescript
// 1. Check target health
const status = gateway.getTargetStatus()
console.log('Healthy targets:', status.filter(t => t.healthy))

status.forEach(target => {
  console.log(`${target.url}: ${target.healthy ? '✓' : '✗'} (${target.connections} connections)`)
})

// 2. Try different strategy
loadBalancer: {
  strategy: 'least-connections', // Instead of round-robin
  targets: [/* ... */],
}

// 3. Verify weights
loadBalancer: {
  strategy: 'weighted',
  targets: [
    { url: 'http://api1:3000', weight: 50 },
    { url: 'http://api2:3000', weight: 50 }, // Equal
  ],
}

// 4. Check health check frequency
healthCheck: {
  enabled: true,
  interval: 10000, // More frequent
  timeout: 5000,
  path: '/health',
}
```

### Servers Marked Unhealthy

**Problem**: Healthy servers marked as unhealthy

**Solutions:**

```typescript
// 1. Increase timeouts
healthCheck: {
  enabled: true,
  timeout: 10000,          // Increase from 5000
  interval: 15000,
  unhealthyThreshold: 5,   // More failures required
  healthyThreshold: 2,     // Less successes required
}

// 2. Check health endpoint
// Test manually:
curl http://backend:3000/health

// Should respond quickly (< 5s)
// Should return 200 OK

// 3. Verify network connectivity
// From gateway container/host:
ping backend-server
telnet backend-server 3000

// 4. Add custom validation
healthCheck: {
  enabled: true,
  path: '/health',
  validator: async (response) => {
    console.log('Health check response:', response.status)
    if (response.status !== 200) return false

    const data = await response.json()
    console.log('Health data:', data)
    return data.status === 'healthy'
  },
}
```

### Circuit Breaker Opens Too Often

**Problem**: Circuit breaker opens frequently

**Solutions:**

```typescript
// 1. Increase failure threshold
circuitBreaker: {
  enabled: true,
  failureThreshold: 10,  // Increase from 5
  timeout: 30000,        // Longer timeout
  resetTimeout: 60000,   // Wait longer before retry
}

// 2. Check backend performance
// Profile backend service
// Add logging to identify slow endpoints

// 3. Add fallback handler
hooks: {
  onError: async (req, error) => {
    console.error('Circuit breaker triggered:', error)

    // Return cached data
    return new Response(
      JSON.stringify({ cached: true, data: getCachedData() }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  },
}
```

### Sticky Sessions Not Working

**Problem**: Users lose session data

**Solutions:**

```typescript
// 1. Enable sticky sessions
loadBalancer: {
  strategy: 'least-connections',
  targets: [/* ... */],
  stickySession: {
    enabled: true,
    cookieName: 'session_id',
    ttl: 3600000, // 1 hour
    secure: true,  // HTTPS only
    httpOnly: true,
    sameSite: 'lax',
  },
}

// 2. Use IP hash strategy
loadBalancer: {
  strategy: 'ip-hash',
  targets: [/* ... */],
}

// 3. Use external session store
// Store sessions in Redis/database:
import { Redis } from 'ioredis'
const redis = new Redis()

// Store session
await redis.set(`session:${userId}`, JSON.stringify(sessionData), 'EX', 3600)

// Get session
const sessionData = await redis.get(`session:${userId}`)
```

## Performance Issues

### High Latency

**Problem**: Slow response times through gateway

**Debug:**

```typescript
// 1. Add request timing
gateway.addRoute({
  pattern: '/api/*',
  target: 'http://backend:3000',
  middlewares: [
    async (req, next) => {
      const start = Date.now()
      const response = await next()
      const duration = Date.now() - start
      console.log(`${req.method} ${req.url}: ${duration}ms`)
      return response
    },
  ],
})

// 2. Check backend performance
// Profile backend service
// Add APM (Application Performance Monitoring)

// 3. Enable metrics
const gateway = new BunGateway({
  metrics: { enabled: true },
})
// Check http://localhost:3000/metrics

// 4. Optimize load balancing
loadBalancer: {
  strategy: 'latency', // Route to fastest server
  targets: [/* ... */],
}
```

**Solutions:**

```typescript
// 1. Increase timeouts (if needed)
gateway.addRoute({
  pattern: '/api/*',
  target: 'http://backend:3000',
  timeout: 60000, // 60 seconds
  proxy: {
    timeout: 60000,
  },
})

// 2. Reduce health check frequency
healthCheck: {
  interval: 30000, // Less frequent (30s)
  timeout: 3000,
}

// 3. Enable clustering
cluster: {
  enabled: true,
  workers: 4,
}

// 4. Use connection pooling (enabled by default)

// 5. Enable caching
middlewares: [
  async (req, next) => {
    const cacheKey = req.url
    const cached = await cache.get(cacheKey)
    if (cached) return new Response(cached)

    const response = await next()
    const body = await response.text()
    await cache.set(cacheKey, body, 60) // Cache 60s

    return new Response(body, response)
  },
]
```

### High Memory Usage

**Problem**: Gateway consuming too much memory

**Solutions:**

```typescript
// 1. Reduce worker count
cluster: {
  enabled: true,
  workers: 2, // Instead of 8
}

// 2. Monitor memory
setInterval(() => {
  const usage = process.memoryUsage()
  console.log({
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024) + 'MB',
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024) + 'MB',
    rss: Math.round(usage.rss / 1024 / 1024) + 'MB',
  })
}, 60000)

// 3. Check for memory leaks
// Use Bun's built-in profiler
// bun --inspect gateway.ts

// 4. Limit request body size
security: {
  sizeLimits: {
    maxBodySize: 10 * 1024 * 1024, // 10 MB
    maxHeaderSize: 16 * 1024,       // 16 KB
  },
}

// 5. Set memory limits (Docker)
// docker run --memory=512m ...
```

### Timeout Errors

**Problem**: Requests timing out

**Solutions:**

```typescript
// 1. Increase timeouts
gateway.addRoute({
  pattern: '/api/*',
  target: 'http://backend:3000',
  timeout: 120000, // 2 minutes
  proxy: {
    timeout: 120000,
  },
})

// 2. Check backend performance
// Backend might be slow
curl -w "@curl-format.txt" -o /dev/null -s http://backend:3000/api/slow

// curl-format.txt:
// time_namelookup: %{time_namelookup}\n
// time_connect: %{time_connect}\n
// time_total: %{time_total}\n

// 3. Add circuit breaker
circuitBreaker: {
  enabled: true,
  failureThreshold: 5,
  timeout: 10000,
  resetTimeout: 30000,
}

// 4. Check network connectivity
ping backend-server
traceroute backend-server
```

## Clustering Issues

### Workers Keep Crashing

**Problem**: Workers restart repeatedly

**Debug:**

```typescript
// 1. Add error handlers
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error)
  // Don't exit immediately in production
})

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason)
})

// 2. Check logs
tail -f bungate.log

// 3. Monitor restarts
const cluster = new ClusterManager(
  {
    enabled: true,
    workers: 4,
    maxRestarts: 10,
  },
  logger,
  './gateway.ts'
)

cluster.on('worker-exit', (workerId, code, signal) => {
  console.error(`Worker ${workerId} crashed (code: ${code}, signal: ${signal})`)
})

// 4. Increase restart thresholds
cluster: {
  enabled: true,
  workers: 4,
  maxRestarts: 20,           // More restarts allowed
  respawnThreshold: 10,      // Higher threshold
  respawnThresholdTime: 120000, // Longer window (2 min)
}
```

### Rolling Restart Not Working

**Problem**: SIGUSR2 doesn't trigger restart

**Debug:**

```bash
# 1. Find master process
ps aux | grep bungate

# Look for master process (not worker)

# 2. Send signal to master
kill -USR2 <MASTER_PID>

# 3. Check logs
tail -f bungate.log
# Should see: "Received SIGUSR2, starting rolling restart..."

# 4. Verify signal handling
# Check that gateway is running in cluster mode
ps aux | grep "bungate"
# Should see multiple processes
```

### Port Already in Use

**Problem**: `Error: listen EADDRINUSE`

**Solutions:**

```bash
# 1. Find process using port
lsof -ti:3000

# 2. Kill process
lsof -ti:3000 | xargs kill -9

# 3. Or use different port
const gateway = new BunGateway({
  server: { port: 3001 },
})

# 4. Check for zombie processes
ps aux | grep bungate
kill -9 <PID>

# 5. Wait a moment and retry
# Port might be in TIME_WAIT state
netstat -an | grep 3000
```

## TLS/HTTPS Problems

### Certificate Errors

**Problem**: SSL/TLS certificate errors

**Solutions:**

```typescript
// 1. Verify certificate files exist
import { existsSync } from 'fs'

if (!existsSync('./cert.pem')) {
  console.error('Certificate file not found')
}
if (!existsSync('./key.pem')) {
  console.error('Key file not found')
}

// 2. Check certificate validity
// openssl x509 -in cert.pem -text -noout

// 3. Verify certificate matches key
// openssl x509 -noout -modulus -in cert.pem | openssl md5
// openssl rsa -noout -modulus -in key.pem | openssl md5
// Should match

// 4. Check certificate chain
security: {
  tls: {
    enabled: true,
    cert: './cert.pem',
    key: './key.pem',
    ca: './ca.pem', // Add CA certificate if needed
  },
}

// 5. Test manually
curl -v https://localhost
openssl s_client -connect localhost:443
```

### HTTP Not Redirecting to HTTPS

**Problem**: HTTP requests not redirecting to HTTPS

**Solution:**

```typescript
// Enable HTTP redirect
security: {
  tls: {
    enabled: true,
    cert: './cert.pem',
    key: './key.pem',
    redirectHTTP: true,    // Enable redirect
    redirectPort: 80,      // HTTP port
  },
}

// Test redirect
curl -v http://localhost
// Should return 301/302 with Location: https://localhost
```

### TLS Handshake Failures

**Problem**: TLS handshake errors

**Solutions:**

```typescript
// 1. Set minimum TLS version
security: {
  tls: {
    enabled: true,
    cert: './cert.pem',
    key: './key.pem',
    minVersion: 'TLSv1.2', // Lower from TLSv1.3 if needed
  },
}

// 2. Add more cipher suites
security: {
  tls: {
    enabled: true,
    cert: './cert.pem',
    key: './key.pem',
    cipherSuites: [
      'TLS_AES_256_GCM_SHA384',
      'TLS_CHACHA20_POLY1305_SHA256',
      'TLS_AES_128_GCM_SHA256',
      // Add more for compatibility
    ],
  },
}

// 3. Test with openssl
openssl s_client -connect localhost:443 -tls1_3
openssl s_client -connect localhost:443 -tls1_2
```

## Common Errors

### Error: `JWT middleware requires either secret or jwksUri`

**Cause**: Auth configuration missing required fields

**Solution:**

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

### Error: `Cannot find module 'bungate'`

**Solution:**

```bash
# Install bungate
bun add bungate

# Verify installation
cat package.json | grep bungate

# Clear cache and reinstall
rm -rf node_modules bun.lockb
bun install
```

### Error: `Target not found` or `No healthy targets`

**Cause**: All load balancer targets are unhealthy

**Debug:**

```typescript
// 1. Check target status
const status = gateway.getTargetStatus()
console.log(status)

// 2. Test targets manually
curl http://api-server-1:3001/health
curl http://api-server-2:3001/health

// 3. Adjust health check settings
healthCheck: {
  enabled: true,
  interval: 15000,
  timeout: 10000,        // Longer timeout
  path: '/health',
  unhealthyThreshold: 5, // More failures required
}

// 4. Check backend logs
docker logs api-server-1
```

### Error: `Request body too large`

**Solution:**

```typescript
// Increase body size limit
security: {
  sizeLimits: {
    maxBodySize: 50 * 1024 * 1024, // 50 MB
  },
}
```

## Debug Mode

### Enable Detailed Logging

```typescript
import { BunGateway, PinoLogger } from 'bungate'

const logger = new PinoLogger({
  level: 'debug', // Show all logs
  prettyPrint: true, // Human-readable
})

const gateway = new BunGateway({
  server: {
    port: 3000,
    development: true, // Enable dev mode
  },
  logger,
})
```

### Request/Response Logging

```typescript
gateway.addRoute({
  pattern: '/api/*',
  target: 'http://backend:3000',
  middlewares: [
    async (req, next) => {
      // Log request
      console.log('→', req.method, req.url)
      console.log('Headers:', Object.fromEntries(req.headers))

      const start = Date.now()
      const response = await next()
      const duration = Date.now() - start

      // Log response
      console.log('←', response.status, `(${duration}ms)`)

      return response
    },
  ],
})
```

### Test with Verbose Curl

```bash
# Show request/response details
curl -v http://localhost:3000/api/data

# Show timing information
curl -w "@curl-format.txt" http://localhost:3000/api/data

# curl-format.txt:
#     time_namelookup: %{time_namelookup}s\n
#        time_connect: %{time_connect}s\n
#     time_appconnect: %{time_appconnect}s\n
#    time_pretransfer: %{time_pretransfer}s\n
#       time_redirect: %{time_redirect}s\n
#  time_starttransfer: %{time_starttransfer}s\n
#                     ----------\n
#          time_total: %{time_total}s\n

# Test with specific headers
curl -v \
  -H "X-API-Key: key1" \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}' \
  http://localhost:3000/api/data
```

## Getting Help

### Before Asking for Help

1. **Check this guide** for your specific issue
2. **Enable debug logging** and check logs
3. **Test manually** with curl
4. **Verify configuration** against examples
5. **Check system resources** (CPU, memory, disk)

### Information to Include

When reporting issues, include:

```typescript
// 1. Bungate version
console.log('Bungate version:', require('bungate/package.json').version)

// 2. Bun version
// bun --version

// 3. Operating system
// uname -a

// 4. Configuration (sanitized)
const config = {
  server: { port: 3000 },
  cluster: { enabled: true, workers: 4 },
  // ... (remove secrets)
}

// 5. Error logs
// Full error stack trace

// 6. Steps to reproduce
// 1. Start gateway with config
// 2. Send request: curl ...
// 3. Observe error: ...
```

### Resources

- 📚 **[Documentation](./)**
- 🐛 **[GitHub Issues](https://github.com/BackendStack21/bungate/issues)**
- 💬 **[Discussions](https://github.com/BackendStack21/bungate/discussions)**
- 📖 **[Examples](../examples/)**
- 🔍 **[Search Issues](https://github.com/BackendStack21/bungate/issues?q=is%3Aissue)**

### Community Support

- **Search existing issues** - Your problem might already be solved
- **Provide minimal reproduction** - Simplest code that shows the issue
- **Be specific** - Include versions, configurations, error messages
- **Follow up** - Respond to questions and confirm solutions

---

**Still stuck?** [Open a new issue](https://github.com/BackendStack21/bungate/issues/new) with detailed information.
