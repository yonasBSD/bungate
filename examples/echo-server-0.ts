import { serve } from 'bun'

let requestCount = 0
const server = serve({
  port: 8080,
  fetch(req) {
    // Increment request count for each incoming request
    requestCount++

    const url = new URL(req.url)

    // Health endpoint
    if (url.pathname === '/health') {
      return new Response('OK', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      })
    }

    // Echo endpoint - return request details
    const echo = req.headers

    return new Response(JSON.stringify(echo, null, 2), {
      headers: { 'Content-Type': 'application/json' },
    })
  },
})

console.log(`Echo server running on http://localhost:${server.port}`)

process.on('SIGINT', () => {
  console.log('\nShutting down echo server...')
  console.log(`Total requests handled: ${requestCount}`)
  process.exit(0)
})
