/**
 * Example: Using Input Validation Middleware
 *
 * This example demonstrates how to use the input validation middleware
 * to protect your API from malicious inputs.
 */

import zero from '0http-bun'
import type { ZeroRequest } from '0http-bun'
import {
  validationMiddleware,
  createValidationMiddleware,
  type ValidationMiddlewareConfig,
} from '../src/security'

// Example 1: Basic validation with default settings
const app1 = zero().router

// Apply validation middleware globally
app1.use(validationMiddleware())

app1.get('/api/users', async (req: ZeroRequest) => {
  return new Response(JSON.stringify({ users: [] }), {
    headers: { 'Content-Type': 'application/json' },
  })
})

// Example 2: Custom validation rules
const app2 = zero().router

const customValidationConfig: ValidationMiddlewareConfig = {
  rules: {
    maxPathLength: 1024,
    maxHeaderSize: 8192,
    maxHeaderCount: 50,
  },
  validatePaths: true,
  validateHeaders: true,
  validateQueryParams: true,
}

app2.use(createValidationMiddleware(customValidationConfig))

app2.get('/api/search', async (req: ZeroRequest) => {
  // Query params are already validated
  const query = req.query.q || ''
  return new Response(JSON.stringify({ results: [], query }), {
    headers: { 'Content-Type': 'application/json' },
  })
})

// Example 3: Custom error handler
const app3 = zero().router

app3.use(
  createValidationMiddleware({
    onValidationError: (errors, req) => {
      // Log validation errors
      console.error('Validation failed:', {
        url: req.url,
        errors,
        ip: req.headers.get('x-forwarded-for') || 'unknown',
      })

      // Return custom error response
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Invalid request',
          errors: errors.map((e) => ({ message: e })),
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    },
  }),
)

app3.post('/api/data', async (req: ZeroRequest) => {
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})

// Example 4: Selective validation
const app4 = zero().router

// Only validate paths and query params, skip headers
app4.use(
  createValidationMiddleware({
    validatePaths: true,
    validateHeaders: false,
    validateQueryParams: true,
  }),
)

app4.get('/api/public', async (req: ZeroRequest) => {
  return new Response('Public endpoint')
})

// Start servers
const PORT1 = 3001
const PORT2 = 3002
const PORT3 = 3003
const PORT4 = 3004

console.log('Starting validation middleware examples...\n')

console.log(`Example 1 (Default validation): http://localhost:${PORT1}`)
console.log(`  Try: curl "http://localhost:${PORT1}/api/users"`)
console.log(
  `  Try: curl "http://localhost:${PORT1}/api/users?id=1' OR '1'='1" (should fail)\n`,
)

console.log(`Example 2 (Custom rules): http://localhost:${PORT2}`)
console.log(`  Try: curl "http://localhost:${PORT2}/api/search?q=test"`)
console.log(
  `  Try: curl "http://localhost:${PORT2}/api/search?q=<script>alert(1)</script>" (should fail)\n`,
)

console.log(`Example 3 (Custom error handler): http://localhost:${PORT3}`)
console.log(`  Try: curl -X POST "http://localhost:${PORT3}/api/data"`)
console.log(
  `  Try: curl -X POST "http://localhost:${PORT3}/api/data?cmd=rm -rf /" (should fail)\n`,
)

console.log(`Example 4 (Selective validation): http://localhost:${PORT4}`)
console.log(`  Try: curl "http://localhost:${PORT4}/api/public"\n`)

Bun.serve({
  port: PORT1,
  fetch: app1.fetch,
})

Bun.serve({
  port: PORT2,
  fetch: app2.fetch,
})

Bun.serve({
  port: PORT3,
  fetch: app3.fetch,
})

Bun.serve({
  port: PORT4,
  fetch: app4.fetch,
})
