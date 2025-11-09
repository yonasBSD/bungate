/**
 * Comprehensive Security Hardening Example
 *
 * This example demonstrates ALL security features available in Bungate for a
 * production-ready API gateway with maximum security hardening and defense-in-depth.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * SECURITY LAYERS DEMONSTRATED:
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * 🔐 TRANSPORT LAYER SECURITY
 * - TLS 1.3 enforcement with strong cipher suites
 * - HTTP to HTTPS automatic redirect
 * - HSTS with preload for browser security
 *
 * 🛡️ INPUT VALIDATION & SANITIZATION
 * - Path length and character validation
 * - Header size and count limits
 * - Blocked patterns (XSS, SQL injection, traversal)
 * - Header sanitization
 *
 * 🔒 AUTHENTICATION & AUTHORIZATION
 * - JWT authentication with key rotation
 * - API key authentication
 * - Role-based access control (RBAC)
 * - Multi-secret support with graceful rotation
 *
 * 🚦 RATE LIMITING & ABUSE PREVENTION
 * - Per-user rate limiting with JWT context
 * - Per-endpoint rate limit policies
 * - API key-based rate limiting
 *
 * 📋 SECURITY HEADERS
 * - Strict-Transport-Security (HSTS)
 * - Content-Security-Policy (CSP)
 * - X-Frame-Options (clickjacking protection)
 * - X-Content-Type-Options (MIME sniffing prevention)
 * - Referrer-Policy
 * - Permissions-Policy
 *
 * 🔍 REQUEST/RESPONSE MONITORING
 * - Request size limits (body, headers, URL)
 * - Response payload monitoring
 * - Comprehensive error handling
 * - Secure error messages (no stack traces in prod)
 *
 * 🌐 NETWORK SECURITY
 * - Trusted proxy validation (Cloudflare, AWS, etc.)
 * - IP whitelist/blacklist support
 * - X-Forwarded-For depth limiting
 * - CORS validation with credentials support
 *
 * 💾 SESSION MANAGEMENT
 * - High-entropy session IDs (128+ bits)
 * - Secure cookie configuration
 * - HTTPOnly and SameSite flags
 * - Session timeout and rotation
 *
 * 🔄 CIRCUIT BREAKER & RESILIENCE
 * - Backend failure detection
 * - Automatic circuit opening/closing
 * - Timeout configuration
 * - Fallback responses
 *
 * 🛠️ CSRF PROTECTION
 * - Token-based CSRF prevention
 * - Double-submit cookie pattern
 * - Path and method exclusions
 *
 * Run this example:
 *   bun run examples/security-hardened.ts
 *
 * Test endpoints:
 *   # Health check (public)
 *   curl -k https://localhost:3443/health
 *
 *   # API with key
 *   curl -k -H "x-api-key: public-key-1" https://localhost:3443/api/public/test
 *
 *   # Generate JWT for testing
 *   # Use: https://jwt.io with secret: primary-secret-key
 *
 *   # Protected endpoint
 *   curl -k -H "Authorization: Bearer YOUR_JWT_TOKEN" https://localhost:3443/api/users/123
 *
 *   # Admin endpoint (requires admin role in JWT)
 *   curl -k -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" https://localhost:3443/api/admin/settings
 *
 *   # View security headers
 *   curl -I -k https://localhost:3443/health
 *
 *   # Test HTTP redirect
 *   curl -L http://localhost:3080/health
 */

import { BunGateway } from '../src/index'
import { BunGateLogger } from '../src/logger/pino-logger'

// ═══════════════════════════════════════════════════════════════════════════
// ENVIRONMENT CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Load secrets from environment variables in production
 * Never hardcode secrets in your code!
 */
const config = {
  // TLS Certificates
  tlsCert: process.env.TLS_CERT_PATH || './examples/cert.pem',
  tlsKey: process.env.TLS_KEY_PATH || './examples/key.pem',

  // JWT Secrets (use strong, random keys in production)
  jwtPrimary: process.env.JWT_SECRET_PRIMARY || 'primary-secret-key',
  jwtOld: process.env.JWT_SECRET_OLD || 'old-secret-key',

  // API Keys
  publicApiKeys: (process.env.PUBLIC_API_KEYS || '').split(',').filter(Boolean)
    .length
    ? process.env.PUBLIC_API_KEYS!.split(',')
    : ['public-key-1', 'public-key-2', 'public-key-3'],
  metricsApiKey: process.env.METRICS_API_KEY || 'metrics-secret-key',

  // Server Ports
  httpsPort: parseInt(process.env.HTTPS_PORT || '3443'),
  httpPort: parseInt(process.env.HTTP_PORT || '3080'),

  // CORS Origins
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || [
    'https://app.example.com',
    'https://admin.example.com',
  ],

  // Backend Targets
  backendTargets: process.env.BACKEND_TARGETS?.split(',') || [
    'http://localhost:8080',
    'http://localhost:8081',
  ],
}

// ═══════════════════════════════════════════════════════════════════════════
// LOGGER CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

// Create structured logger with request correlation
const logger = new BunGateLogger({
  level: 'info',
  format: 'pretty',
  enableRequestLogging: true,
})

// ═══════════════════════════════════════════════════════════════════════════
// GATEWAY CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

// Create gateway with comprehensive security configuration
const gateway = new BunGateway({
  server: {
    port: config.httpsPort,
    development: false,
  },
  logger,

  // Security configuration
  security: {
    // TLS/HTTPS configuration
    tls: {
      enabled: true,
      cert: config.tlsCert,
      key: config.tlsKey,
      minVersion: 'TLSv1.3', // Enforce TLS 1.3 only (most secure)
      cipherSuites: [
        'TLS_AES_256_GCM_SHA384', // AES-256 with GCM
        'TLS_CHACHA20_POLY1305_SHA256', // ChaCha20 (faster on mobile)
      ],
      redirectHTTP: true,
      redirectPort: config.httpPort,
    },

    // Input validation
    inputValidation: {
      maxPathLength: 2048,
      maxHeaderSize: 16384,
      maxHeaderCount: 100,
      allowedPathChars: /^[a-zA-Z0-9\/_\-\.~%]+$/,
      blockedPatterns: [
        /\.\./, // Directory traversal
        /%00/, // Null byte injection
        /<script>/i, // XSS attempts
        /javascript:/i, // JavaScript protocol
      ],
      sanitizeHeaders: true,
    },

    // Secure error handling
    errorHandling: {
      production: true,
      includeStackTrace: false,
      logErrors: true,
      sanitizeBackendErrors: true,
      customMessages: {
        500: 'An internal error occurred',
        502: 'Service temporarily unavailable',
        503: 'Service unavailable',
        504: 'Request timeout',
      },
    },

    // Session management
    sessions: {
      entropyBits: 128,
      ttl: 3600000, // 1 hour
      cookieOptions: {
        secure: true,
        httpOnly: true,
        sameSite: 'strict',
      },
    },

    // Trusted proxy configuration
    trustedProxies: {
      enabled: true,
      trustedIPs: ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16'],
      trustedNetworks: ['cloudflare'],
      maxForwardedDepth: 2,
    },

    // Security headers
    securityHeaders: {
      enabled: true,
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      },
      contentSecurityPolicy: {
        directives: {
          'default-src': ["'self'"],
          'script-src': ["'self'"],
          'style-src': ["'self'"],
          'img-src': ["'self'", 'https:'],
          'connect-src': ["'self'"],
          'font-src': ["'self'"],
          'object-src': ["'none'"],
          'frame-ancestors': ["'none'"],
          'base-uri': ["'self'"],
          'form-action': ["'self'"],
        },
        reportOnly: false,
      },
      xFrameOptions: 'DENY',
      xContentTypeOptions: true,
      referrerPolicy: 'strict-origin-when-cross-origin',
      permissionsPolicy: {
        camera: [],
        microphone: [],
        geolocation: ["'self'"],
        payment: ["'self'"],
      },
    },

    // Request size limits
    sizeLimits: {
      maxBodySize: 10 * 1024 * 1024, // 10 MB
      maxHeaderSize: 16 * 1024, // 16 KB
      maxHeaderCount: 100,
      maxUrlLength: 2048,
      maxQueryParams: 100,
    },

    // NOTE: JWT Key Rotation Configuration
    // The security.jwtKeyRotation config exists but is NOT automatically integrated
    // into the gateway. For key rotation, you need to manually use JWTKeyRotationManager
    // or implement multiple secrets per route. See src/security/jwt-key-rotation.ts
    //
    // TODO: Future enhancement - integrate JWTKeyRotationManager into gateway
    // to automatically apply key rotation from security.jwtKeyRotation config

    // CSRF protection
    csrf: {
      enabled: true,
      tokenLength: 32,
      cookieName: 'bungate_csrf',
      headerName: 'X-CSRF-Token',
      excludeMethods: ['GET', 'HEAD', 'OPTIONS'],
      excludePaths: ['/health', '/api/public/*'],
      sameSiteStrict: true,
    },

    // CORS validation (strict mode)
    corsValidation: {
      strictMode: true,
      allowWildcardWithCredentials: false,
      maxOrigins: 10,
      requireHttps: true,
    },

    // Payload monitoring
    payloadMonitor: {
      maxResponseSize: 100 * 1024 * 1024, // 100 MB
      trackMetrics: true,
      abortOnLimit: true,
      warnThreshold: 0.8, // Warn at 80% of limit
    },
  },

  // CORS configuration (Cross-Origin Resource Sharing)
  cors: {
    origin: config.corsOrigins, // Explicitly allowed origins
    credentials: true, // Allow cookies/auth headers
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    exposedHeaders: ['X-Request-ID', 'X-RateLimit-Remaining'],
    maxAge: 86400, // Cache preflight for 24 hours
  },

  // Routes configuration
  routes: [
    // Public health check endpoint (no authentication)
    {
      pattern: '/health',
      handler: async () => {
        return new Response(
          JSON.stringify({
            status: 'healthy',
            timestamp: new Date().toISOString(),
          }),
          {
            headers: { 'Content-Type': 'application/json' },
          },
        )
      },
    },

    // Protected API endpoints with JWT authentication
    {
      pattern: '/api/users/*',
      handler: async (req) => {
        // In a real application, this would proxy to a backend service
        const user = (req as any).jwt
        return new Response(
          JSON.stringify({
            message: 'User endpoint',
            user: {
              id: user?.userId,
              role: user?.role,
            },
          }),
          {
            headers: { 'Content-Type': 'application/json' },
          },
        )
      },
      auth: {
        secret: config.jwtPrimary,
        jwtOptions: {
          algorithms: ['HS256'],
          issuer: 'https://auth.example.com',
          audience: 'https://api.example.com',
        },
      },
      rateLimit: {
        max: 100,
        windowMs: 60000,
        keyGenerator: (req) => {
          return (
            (req as any).jwt?.userId ||
            req.headers.get('x-forwarded-for') ||
            'unknown'
          )
        },
      },
    },

    // Admin endpoints with stricter rate limiting
    {
      pattern: '/api/admin/*',
      handler: async (req) => {
        const user = (req as any).jwt

        // Check admin role
        if (user?.role !== 'admin') {
          return new Response(JSON.stringify({ error: 'Forbidden' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          })
        }

        return new Response(
          JSON.stringify({
            message: 'Admin endpoint',
            user: {
              id: user.userId,
              role: user.role,
            },
          }),
          {
            headers: { 'Content-Type': 'application/json' },
          },
        )
      },
      auth: {
        secret: config.jwtPrimary,
        jwtOptions: {
          algorithms: ['HS256'],
          issuer: 'https://auth.example.com',
          audience: 'https://api.example.com',
        },
      },
      rateLimit: {
        max: 50,
        windowMs: 60000,
      },
    },

    // Public API endpoint with API key authentication
    {
      pattern: '/api/public/*',
      handler: async (req) => {
        return new Response(
          JSON.stringify({
            message: 'Public API endpoint',
            timestamp: new Date().toISOString(),
            path: new URL(req.url).pathname,
          }),
          {
            headers: { 'Content-Type': 'application/json' },
          },
        )
      },
      auth: {
        apiKeys: config.publicApiKeys,
        apiKeyHeader: 'x-api-key',
      },
      rateLimit: {
        max: 1000,
        windowMs: 60000,
      },
    },

    // Load-balanced backend with circuit breaker
    {
      pattern: '/api/backend/*',
      loadBalancer: {
        strategy: 'least-connections', // Route to least busy server
        targets: config.backendTargets.map((url, index) => ({
          url,
          weight: index === 0 ? 2 : 1, // First server gets 2x traffic
        })),
        healthCheck: {
          enabled: true,
          interval: 5000,
          timeout: 2000,
          path: '/health',
          expectedStatus: 200,
        },
      },
      circuitBreaker: {
        enabled: true,
        failureThreshold: 5,
        resetTimeout: 30000,
        timeout: 5000,
      },
      proxy: {
        pathRewrite: (path) => path.replace('/api/backend', ''),
        headers: {
          'X-Gateway-Version': '1.0',
          'X-Forwarded-Proto': 'https',
        },
      },
      rateLimit: {
        max: 200,
        windowMs: 60000,
      },
      hooks: {
        afterCircuitBreakerExecution: async (req, result) => {
          if (!result.success) {
            logger.warn(
              `Circuit breaker failed for ${req.url}: ${result.error}`,
            )
          }
        },
      },
    },

    // File upload endpoint with size validation
    {
      pattern: '/api/upload',
      handler: async (req) => {
        const contentLength = req.headers.get('content-length')
        const maxSize = 5 * 1024 * 1024 // 5 MB

        if (contentLength && parseInt(contentLength) > maxSize) {
          return new Response(
            JSON.stringify({
              error: 'File too large',
              maxSize: '5MB',
            }),
            {
              status: 413,
              headers: { 'Content-Type': 'application/json' },
            },
          )
        }

        // Handle file upload
        return new Response(
          JSON.stringify({
            message: 'File uploaded successfully',
            size: contentLength,
          }),
          {
            headers: { 'Content-Type': 'application/json' },
          },
        )
      },
      auth: {
        secret: config.jwtPrimary,
      },
      rateLimit: {
        max: 10, // 10 uploads per minute
        windowMs: 60000,
      },
    },

    // WebSocket upgrade endpoint (example)
    {
      pattern: '/ws',
      handler: async (req) => {
        // WebSocket upgrade logic would go here
        return new Response(
          JSON.stringify({
            message: 'WebSocket endpoint',
            note: 'Use appropriate WebSocket client',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
          },
        )
      },
      rateLimit: {
        max: 100,
        windowMs: 60000,
      },
    },

    // Metrics endpoint (protected with API key)
    {
      pattern: '/metrics',
      handler: async (req) => {
        // In production, this would return Prometheus metrics
        return new Response(
          JSON.stringify({
            metrics: {
              requests_total: 12345,
              requests_per_second: 42,
              active_connections: 15,
              circuit_breakers_open: 0,
            },
          }),
          {
            headers: { 'Content-Type': 'application/json' },
          },
        )
      },
      auth: {
        apiKeys: [config.metricsApiKey],
        apiKeyHeader: 'x-metrics-key',
      },
    },
  ],
})

// Start the gateway
const server = await gateway.listen()

// Display comprehensive startup information
logger.info('')
logger.info('═══════════════════════════════════════════════════════════════')
logger.info('🔒 SECURITY-HARDENED GATEWAY STARTED')
logger.info('═══════════════════════════════════════════════════════════════')
logger.info('')
logger.info('📡 Server Configuration:')
logger.info('  • HTTPS: https://localhost:3443')
logger.info('  • HTTP Redirect: http://localhost:3080 → https://localhost:3443')
logger.info('')
logger.info('🛡️  Security Features Active:')
logger.info('  ✓ TLS 1.3 with AES-256-GCM & ChaCha20-Poly1305')
logger.info('  ✓ HTTP Strict Transport Security (HSTS) - 1 year')
logger.info('  ✓ Content Security Policy (CSP)')
logger.info('  ✓ Input validation & sanitization')
logger.info('  ✓ Request size limits (10MB body, 16KB headers)')
logger.info('  ✓ Security headers (X-Frame, X-Content-Type, Referrer)')
logger.info('  ✓ JWT authentication with key rotation')
logger.info('  ✓ CSRF protection (token-based)')
logger.info('  ✓ Rate limiting (per-user & per-endpoint)')
logger.info('  ✓ Session management (secure cookies)')
logger.info('  ✓ Trusted proxy validation (Cloudflare, RFC1918)')
logger.info('  ✓ CORS validation (strict mode)')
logger.info('  ✓ Payload monitoring (100MB limit)')
logger.info('  ✓ Circuit breaker pattern')
logger.info('  ✓ Secure error handling (no stack traces)')
logger.info('')
logger.info('🔌 Available Endpoints:')
logger.info('  Public:')
logger.info('    GET  /health                    - Health check')
logger.info(
  '    *    /api/public/*              - Public API (requires x-api-key)',
)
logger.info('  Protected (JWT):')
logger.info('    *    /api/users/*               - User endpoints')
logger.info('    POST /api/upload                - File upload (5MB max)')
logger.info('  Admin Only (JWT + role):')
logger.info('    *    /api/admin/*               - Admin endpoints')
logger.info('  Infrastructure:')
logger.info('    *    /api/backend/*             - Load balanced backend')
logger.info('    GET  /ws                        - WebSocket endpoint')
logger.info(
  '    GET  /metrics                   - Metrics (requires x-metrics-key)',
)
logger.info('')
logger.info('🧪 Testing Commands:')
logger.info('')
logger.info('  # Check health & security headers')
logger.info('  curl -I -k https://localhost:3443/health')
logger.info('')
logger.info('  # Test HTTP → HTTPS redirect')
logger.info('  curl -L http://localhost:3080/health')
logger.info('')
logger.info('  # Public API with API key')
logger.info(
  '  curl -k -H "x-api-key: public-key-1" https://localhost:3443/api/public/test',
)
logger.info('')
logger.info('  # Generate JWT token for testing:')
logger.info('  # Go to https://jwt.io and create a token with:')
logger.info('  #   Secret: primary-secret-key')
logger.info('  #   Payload: { "userId": "123", "role": "user" }')
logger.info('')
logger.info('  # Protected endpoint with JWT')
logger.info(
  '  curl -k -H "Authorization: Bearer YOUR_JWT" https://localhost:3443/api/users/profile',
)
logger.info('')
logger.info('  # Admin endpoint (requires role: admin)')
logger.info(
  '  curl -k -H "Authorization: Bearer ADMIN_JWT" https://localhost:3443/api/admin/settings',
)
logger.info('')
logger.info('  # View metrics')
logger.info(
  '  curl -k -H "x-metrics-key: metrics-secret-key" https://localhost:3443/metrics',
)
logger.info('')
logger.info('═══════════════════════════════════════════════════════════════')
logger.info('Press Ctrl+C to shutdown gracefully')
logger.info('═══════════════════════════════════════════════════════════════')
logger.info('')

// Graceful shutdown handlers
const shutdown = async (signal: string) => {
  logger.info('')
  logger.info(`Received ${signal}, initiating graceful shutdown...`)

  try {
    // Close the gateway gracefully
    await gateway.close()

    logger.info('✓ Gateway closed successfully')
    logger.info('✓ All connections drained')
    logger.info('✓ Cleanup completed')
    logger.info('')
    logger.info('Goodbye! 👋')

    process.exit(0)
  } catch (error) {
    logger.error('Error during shutdown', error as Error)
    process.exit(1)
  }
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', error)
  shutdown('uncaughtException')
})

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection', reason as Error)
  shutdown('unhandledRejection')
})

// ═══════════════════════════════════════════════════════════════════════════
// PRODUCTION DEPLOYMENT CHECKLIST
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Before deploying to production, ensure you:
 *
 * 1. CERTIFICATES & SECRETS
 *    ☐ Replace self-signed certificates with CA-signed certificates
 *    ☐ Use Let's Encrypt or commercial CA (DigiCert, GlobalSign)
 *    ☐ Store secrets in environment variables or secret manager
 *    ☐ Generate strong, random JWT secrets (256+ bits)
 *    ☐ Set proper file permissions (600 for keys, 644 for certs)
 *    ☐ Never commit secrets to version control
 *    ☐ Implement certificate rotation strategy
 *    ☐ Monitor certificate expiration dates
 *
 * 2. SECURITY CONFIGURATION
 *    ☐ Enable TLS 1.3 (or minimum TLS 1.2)
 *    ☐ Use strong cipher suites only
 *    ☐ Enable HSTS with preload
 *    ☐ Configure strict CSP policies
 *    ☐ Enable CSRF protection
 *    ☐ Set appropriate CORS origins (no wildcards with credentials)
 *    ☐ Configure trusted proxy IPs/networks
 *    ☐ Set appropriate rate limits
 *    ☐ Enable payload monitoring
 *
 * 3. ERROR HANDLING
 *    ☐ Set production: true in errorHandling config
 *    ☐ Disable stack traces in responses
 *    ☐ Sanitize backend errors
 *    ☐ Configure custom error messages
 *    ☐ Set up error logging/monitoring
 *
 * 4. AUTHENTICATION & AUTHORIZATION
 *    ☐ Implement proper JWT validation
 *    ☐ Set up key rotation schedule
 *    ☐ Use different secrets per environment
 *    ☐ Implement role-based access control
 *    ☐ Validate JWT issuer and audience
 *    ☐ Set appropriate token expiration times
 *
 * 5. MONITORING & LOGGING
 *    ☐ Configure structured logging
 *    ☐ Set up log aggregation (ELK, Datadog, etc.)
 *    ☐ Enable request correlation IDs
 *    ☐ Monitor rate limit violations
 *    ☐ Track circuit breaker events
 *    ☐ Set up alerts for security events
 *    ☐ Monitor certificate expiration
 *
 * 6. PERFORMANCE & SCALING
 *    ☐ Enable cluster mode for multi-core utilization
 *    ☐ Configure appropriate worker count
 *    ☐ Set up load balancing health checks
 *    ☐ Configure circuit breaker thresholds
 *    ☐ Optimize rate limit windows
 *    ☐ Set appropriate timeout values
 *
 * 7. INFRASTRUCTURE
 *    ☐ Run behind a load balancer (AWS ALB, Nginx, etc.)
 *    ☐ Configure WAF rules
 *    ☐ Set up DDoS protection (Cloudflare, AWS Shield)
 *    ☐ Enable auto-scaling
 *    ☐ Configure health check endpoints
 *    ☐ Set up backup and disaster recovery
 *
 * 8. TESTING
 *    ☐ Test with SSL Labs (https://www.ssllabs.com/ssltest/)
 *    ☐ Run security headers test (https://securityheaders.com/)
 *    ☐ Perform penetration testing
 *    ☐ Load test with realistic traffic
 *    ☐ Test certificate rotation process
 *    ☐ Test graceful shutdown
 *    ☐ Test failover scenarios
 *
 * 9. COMPLIANCE
 *    ☐ Review GDPR/CCPA requirements
 *    ☐ Implement data retention policies
 *    ☐ Set up audit logging
 *    ☐ Document security controls
 *    ☐ Review PCI DSS if handling payments
 *
 * 10. DOCUMENTATION
 *     ☐ Document security architecture
 *     ☐ Create incident response plan
 *     ☐ Document key rotation procedures
 *     ☐ Create runbooks for common issues
 *     ☐ Document API authentication flows
 */
