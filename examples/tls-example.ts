/**
 * Comprehensive TLS/HTTPS Configuration Example
 *
 * This example demonstrates all TLS/HTTPS features available in Bungate:
 * - Basic HTTPS setup with TLS 1.2 and 1.3
 * - HTTP to HTTPS automatic redirect
 * - Custom cipher suites configuration
 * - Mutual TLS (mTLS) with client certificate validation
 * - Certificate loading from files and buffers
 * - Security headers (HSTS, CSP, etc.)
 * - Production-ready TLS configuration
 *
 * Run this example:
 *   bun run examples/tls-example.ts
 *
 * Test with curl:
 *   curl -k https://localhost:3443/health
 *   curl http://localhost:3080/health (should redirect to HTTPS)
 */

import { BunGateway } from '../src/index'
import { BunGateLogger } from '../src/logger/pino-logger'
import { readFileSync } from 'fs'

// ============================================================================
// EXAMPLE 1: Basic HTTPS Setup
// ============================================================================

async function basicHTTPSExample() {
  console.log('\n=== Example 1: Basic HTTPS Setup ===\n')

  const gateway = new BunGateway({
    server: {
      port: 3443,
      development: false,
    },
    security: {
      tls: {
        enabled: true,
        cert: './examples/cert.pem',
        key: './examples/key.pem',
      },
    },
  })

  // Add a health check route
  gateway.addRoute({
    pattern: '/health',
    handler: async () => {
      return new Response(
        JSON.stringify({
          status: 'healthy',
          tls: 'enabled',
          timestamp: new Date().toISOString(),
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        },
      )
    },
  })

  console.log('✓ Basic HTTPS server configured')
  console.log('  Port: 3443')
  console.log('  Certificates: cert.pem, key.pem')
  console.log('  Test: curl -k https://localhost:3443/health\n')
}

// ============================================================================
// EXAMPLE 2: HTTPS with HTTP Redirect
// ============================================================================

async function httpRedirectExample() {
  console.log('=== Example 2: HTTPS with HTTP to HTTPS Redirect ===\n')

  const gateway = new BunGateway({
    server: {
      port: 3443, // HTTPS port
      development: false,
    },
    security: {
      tls: {
        enabled: true,
        cert: './examples/cert.pem',
        key: './examples/key.pem',
        redirectHTTP: true,
        redirectPort: 3080, // HTTP port that redirects to HTTPS
      },
    },
  })

  gateway.addRoute({
    pattern: '/secure',
    handler: async () => {
      return new Response(
        JSON.stringify({
          message: 'This is a secure endpoint',
          protocol: 'https',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        },
      )
    },
  })

  console.log('✓ HTTPS server with HTTP redirect configured')
  console.log('  HTTPS Port: 3443')
  console.log('  HTTP Redirect Port: 3080')
  console.log('  Test HTTPS: curl -k https://localhost:3443/secure')
  console.log('  Test Redirect: curl -L http://localhost:3080/secure\n')
}

// ============================================================================
// EXAMPLE 3: TLS 1.3 with Custom Cipher Suites
// ============================================================================

async function customCipherSuitesExample() {
  console.log('=== Example 3: TLS 1.3 with Custom Cipher Suites ===\n')

  const gateway = new BunGateway({
    server: {
      port: 3443,
      development: false,
    },
    security: {
      tls: {
        enabled: true,
        cert: './examples/cert.pem',
        key: './examples/key.pem',
        minVersion: 'TLSv1.3', // Enforce TLS 1.3 only
        cipherSuites: [
          // TLS 1.3 cipher suites (most secure)
          'TLS_AES_256_GCM_SHA384',
          'TLS_CHACHA20_POLY1305_SHA256',
          'TLS_AES_128_GCM_SHA256',
        ],
      },
    },
  })

  gateway.addRoute({
    pattern: '/tls-info',
    handler: async () => {
      return new Response(
        JSON.stringify({
          tls: {
            version: 'TLSv1.3',
            cipherSuites: [
              'TLS_AES_256_GCM_SHA384',
              'TLS_CHACHA20_POLY1305_SHA256',
              'TLS_AES_128_GCM_SHA256',
            ],
            features: [
              'Forward Secrecy',
              'AEAD Encryption',
              'Post-Quantum Ready',
            ],
          },
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        },
      )
    },
  })

  console.log('✓ TLS 1.3 server with custom cipher suites configured')
  console.log('  Minimum Version: TLS 1.3')
  console.log('  Cipher Suites:')
  console.log('    - TLS_AES_256_GCM_SHA384')
  console.log('    - TLS_CHACHA20_POLY1305_SHA256')
  console.log('    - TLS_AES_128_GCM_SHA256')
  console.log('  Test: curl -k https://localhost:3443/tls-info\n')
}

// ============================================================================
// EXAMPLE 4: Mutual TLS (mTLS) - Client Certificate Validation
// ============================================================================

async function mutualTLSExample() {
  console.log('=== Example 4: Mutual TLS (mTLS) ===\n')

  const gateway = new BunGateway({
    server: {
      port: 3443,
      development: false,
    },
    security: {
      tls: {
        enabled: true,
        cert: './examples/cert.pem',
        key: './examples/key.pem',
        ca: './examples/cert.pem', // CA certificate for client validation
        requestCert: true, // Request client certificate
        rejectUnauthorized: true, // Reject clients without valid certificate
      },
    },
  })

  gateway.addRoute({
    pattern: '/mtls-protected',
    handler: async (req) => {
      // In a real mTLS setup, you would have access to client certificate info
      return new Response(
        JSON.stringify({
          message: 'Client authenticated via mTLS',
          security: 'maximum',
          note: 'This endpoint requires a valid client certificate',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        },
      )
    },
  })

  console.log('✓ Mutual TLS (mTLS) server configured')
  console.log('  Server Certificate: cert.pem')
  console.log('  CA Certificate: cert.pem')
  console.log('  Client Certificate: Required')
  console.log(
    '  Test: curl -k --cert client-cert.pem --key client-key.pem https://localhost:3443/mtls-protected\n',
  )
  console.log(
    '  Note: You need to generate client certificates for this to work\n',
  )
}

// ============================================================================
// EXAMPLE 5: Certificate Loading from Buffers
// ============================================================================

async function bufferCertificatesExample() {
  console.log('=== Example 5: Loading Certificates from Buffers ===\n')

  // Load certificates into memory
  const certBuffer = readFileSync('./examples/cert.pem')
  const keyBuffer = readFileSync('./examples/key.pem')

  const gateway = new BunGateway({
    server: {
      port: 3443,
      development: false,
    },
    security: {
      tls: {
        enabled: true,
        cert: certBuffer, // Pass Buffer directly
        key: keyBuffer, // Pass Buffer directly
      },
    },
  })

  gateway.addRoute({
    pattern: '/buffer-info',
    handler: async () => {
      return new Response(
        JSON.stringify({
          message: 'Certificates loaded from buffers',
          method: 'Buffer (in-memory)',
          advantages: [
            'No filesystem access during runtime',
            'Certificates can be encrypted/decrypted in memory',
            'Useful for containerized environments',
            'Better for secret management systems',
          ],
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        },
      )
    },
  })

  console.log('✓ Server configured with buffer-based certificates')
  console.log('  Certificate: Loaded from buffer')
  console.log('  Key: Loaded from buffer')
  console.log('  Test: curl -k https://localhost:3443/buffer-info\n')
}

// ============================================================================
// EXAMPLE 6: Production-Ready TLS with Security Headers
// ============================================================================

async function productionTLSExample() {
  console.log('=== Example 6: Production-Ready TLS Configuration ===\n')

  const logger = new BunGateLogger({
    level: 'info',
    format: 'pretty',
    enableRequestLogging: true,
  })

  const gateway = new BunGateway({
    server: {
      port: 3443,
      development: false,
    },
    logger,
    security: {
      // TLS Configuration
      tls: {
        enabled: true,
        cert: './examples/cert.pem',
        key: './examples/key.pem',
        minVersion: 'TLSv1.3',
        cipherSuites: [
          'TLS_AES_256_GCM_SHA384',
          'TLS_CHACHA20_POLY1305_SHA256',
        ],
        redirectHTTP: true,
        redirectPort: 3080,
      },

      // Security Headers
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
            'style-src': ["'self'", "'unsafe-inline'"],
            'img-src': ["'self'", 'https:', 'data:'],
            'connect-src': ["'self'"],
            'font-src': ["'self'"],
            'object-src': ["'none'"],
            'frame-ancestors': ["'none'"],
            'base-uri': ["'self'"],
            'form-action': ["'self'"],
            'upgrade-insecure-requests': [],
          },
          reportOnly: false,
        },
        xFrameOptions: 'DENY',
        xContentTypeOptions: true,
        referrerPolicy: 'strict-origin-when-cross-origin',
        permissionsPolicy: {
          camera: [],
          microphone: [],
          geolocation: [],
          payment: [],
        },
      },

      // Input Validation
      inputValidation: {
        maxPathLength: 2048,
        maxHeaderSize: 16384,
        sanitizeHeaders: true,
        blockedPatterns: [/\.\./, /%00/, /<script>/i],
      },

      // Size Limits
      sizeLimits: {
        maxBodySize: 10 * 1024 * 1024, // 10 MB
        maxHeaderSize: 16 * 1024, // 16 KB
        maxUrlLength: 2048,
      },
    },
  })

  // Add API routes
  gateway.addRoute({
    pattern: '/api/*',
    handler: async (req) => {
      return new Response(
        JSON.stringify({
          message: 'Production API endpoint',
          security: {
            tls: 'TLS 1.3',
            hsts: 'enabled',
            csp: 'enabled',
            headers: 'hardened',
          },
          path: new URL(req.url).pathname,
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        },
      )
    },
  })

  // Health check endpoint
  gateway.addRoute({
    pattern: '/health',
    handler: async () => {
      return new Response(
        JSON.stringify({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          tls: {
            version: 'TLS 1.3',
            redirect: 'enabled',
            hsts: 'enabled',
          },
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        },
      )
    },
  })

  console.log('✓ Production-ready TLS server configured')
  console.log('  TLS Version: 1.3')
  console.log('  HSTS: Enabled (1 year)')
  console.log('  CSP: Enabled')
  console.log('  Security Headers: All enabled')
  console.log('  HTTP Redirect: Enabled')
  console.log('  HTTPS Port: 3443')
  console.log('  HTTP Port: 3080')
  console.log('\nTest endpoints:')
  console.log('  curl -k https://localhost:3443/health')
  console.log('  curl -k https://localhost:3443/api/users')
  console.log(
    '  curl -I -k https://localhost:3443/health (to see security headers)\n',
  )

  return gateway
}

// ============================================================================
// EXAMPLE 7: TLS with Backend Proxy
// ============================================================================

async function tlsProxyExample() {
  console.log('=== Example 7: TLS Gateway with Backend Proxying ===\n')

  const gateway = new BunGateway({
    server: {
      port: 3443,
      development: false,
    },
    security: {
      tls: {
        enabled: true,
        cert: './examples/cert.pem',
        key: './examples/key.pem',
        minVersion: 'TLSv1.2',
        redirectHTTP: true,
        redirectPort: 3080,
      },
    },
  })

  // Proxy to external API with TLS termination
  gateway.addRoute({
    pattern: '/api/external/*',
    target: 'http://localhost:8080', // Backend service
    proxy: {
      pathRewrite: (path) => path.replace('/api/external', ''),
      headers: {
        'X-Forwarded-Proto': 'https',
        'X-Forwarded-Port': '3443',
      },
    },
  })

  // Local handler for comparison
  gateway.addRoute({
    pattern: '/api/local',
    handler: async () => {
      return new Response(
        JSON.stringify({
          message: 'This is handled locally by the gateway',
          tls: 'terminated at gateway',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        },
      )
    },
  })

  console.log('✓ TLS Gateway with proxying configured')
  console.log('  Gateway terminates TLS')
  console.log('  Backend communication over HTTP (internal)')
  console.log('  Routes:')
  console.log('    /api/external/* -> proxied to backend')
  console.log('    /api/local -> handled locally')
  console.log('  Test: curl -k https://localhost:3443/api/local\n')
}

// ============================================================================
// Main Function - Choose which example to run
// ============================================================================

async function main() {
  console.log(
    '\n╔═══════════════════════════════════════════════════════════════╗',
  )
  console.log(
    '║  Bungate - Comprehensive TLS/HTTPS Configuration Examples    ║',
  )
  console.log(
    '╚═══════════════════════════════════════════════════════════════╝',
  )

  // Display all examples
  await basicHTTPSExample()
  await httpRedirectExample()
  await customCipherSuitesExample()
  await mutualTLSExample()
  await bufferCertificatesExample()
  await tlsProxyExample()

  console.log(
    '═══════════════════════════════════════════════════════════════\n',
  )
  console.log('Starting Production-Ready TLS Example...\n')

  // Run the production example
  const gateway = await productionTLSExample()
  await gateway.listen()

  console.log('✅ Server is running!')
  console.log('\nPress Ctrl+C to stop the server\n')

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n\nShutting down gracefully...')
    await gateway.close()
    console.log('Server stopped.')
    process.exit(0)
  })

  process.on('SIGTERM', async () => {
    console.log('\n\nReceived SIGTERM, shutting down...')
    await gateway.close()
    console.log('Server stopped.')
    process.exit(0)
  })
}

// ============================================================================
// Additional Helper Functions and Documentation
// ============================================================================

/**
 * Generate self-signed certificates for testing:
 *
 * ```bash
 * # Generate a private key and certificate
 * openssl req -x509 -newkey rsa:4096 \
 *   -keyout key.pem -out cert.pem \
 *   -days 365 -nodes \
 *   -subj "/CN=localhost"
 *
 * # Verify the certificate
 * openssl x509 -in cert.pem -text -noout
 *
 * # Check certificate expiration
 * openssl x509 -in cert.pem -noout -enddate
 * ```
 *
 * Generate client certificates for mTLS:
 *
 * ```bash
 * # Generate CA private key and certificate
 * openssl req -x509 -newkey rsa:4096 \
 *   -keyout ca-key.pem -out ca-cert.pem \
 *   -days 365 -nodes \
 *   -subj "/CN=MyCA"
 *
 * # Generate client private key
 * openssl genrsa -out client-key.pem 4096
 *
 * # Generate client certificate signing request
 * openssl req -new -key client-key.pem \
 *   -out client-csr.pem \
 *   -subj "/CN=client"
 *
 * # Sign client certificate with CA
 * openssl x509 -req -in client-csr.pem \
 *   -CA ca-cert.pem -CAkey ca-key.pem \
 *   -CAcreateserial -out client-cert.pem \
 *   -days 365
 * ```
 *
 * Testing with curl:
 *
 * ```bash
 * # Test HTTPS (ignore self-signed cert)
 * curl -k https://localhost:3443/health
 *
 * # Test with verbose TLS info
 * curl -vk https://localhost:3443/health
 *
 * # Test HTTP redirect
 * curl -L http://localhost:3080/health
 *
 * # View security headers
 * curl -I -k https://localhost:3443/health
 *
 * # Test with mTLS
 * curl -k --cert client-cert.pem --key client-key.pem \
 *   https://localhost:3443/mtls-protected
 * ```
 *
 * Production Checklist:
 *
 * ✓ Use certificates from a trusted CA (Let's Encrypt, etc.)
 * ✓ Enable TLS 1.3 (or minimum TLS 1.2)
 * ✓ Use strong cipher suites
 * ✓ Enable HSTS with preload
 * ✓ Configure CSP headers
 * ✓ Set secure file permissions (600 for keys)
 * ✓ Implement certificate rotation
 * ✓ Monitor certificate expiration
 * ✓ Enable HTTP to HTTPS redirect
 * ✓ Use environment variables for secrets
 * ✓ Test with SSL Labs or similar tools
 */

// Run the main function
main().catch((error) => {
  console.error('Error starting server:', error)
  process.exit(1)
})
