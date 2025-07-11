import { BunGateway } from "../";
import { BunGateLogger } from "../";

const logger = new BunGateLogger({
  level: "error",
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "SYS:standard",
      ignore: "pid,hostname",
    },
  },
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
    }),
    res: (res) => ({
      statusCode: res.status,
    }),
  },
});
const gateway = new BunGateway({
  logger,
  server: { port: 3000, development: false },
});

// Basic rate limiting example
gateway.addRoute({
  pattern: "/api/simple/*",
  target: "http://localhost:8080",
  proxy: {
    pathRewrite: (path) => {
      return path.replace("/api/simple", "");
    },
  },
  // rateLimit: {
  //   windowMs: 60000,
  //   max: 100, // 100 requests per user per minute
  //   keyGenerator: async (req) => {
  //     // Use user ID from JWT token or IP address as fallback
  //     return req.ctx?.user?.id || req.headers.get("x-forwarded-for") || "anonymous";
  //   },
  // },
});

// Basic rate limiting example
gateway.addRoute({
  pattern: "/api/lb/*",
  // rateLimit: {
  //   windowMs: 60000, // 1 minute
  //   max: 100, // 100 requests per user per minute
  //   keyGenerator: async (req) => {
  //     // Use user ID from JWT token or IP address as fallback
  //     return req.ctx?.user?.id || req.headers.get("x-forwarded-for") || "anonymous";
  //   },
  // },
  loadBalancer: {
    healthCheck: {
      enabled: true,
      interval: 5000, // Check every 5 seconds
      timeout: 2000, // Timeout after 2 seconds
      path: "/get",
    },
    targets: [
      { url: "http://localhost:8080", weight: 1 },
      { url: "http://localhost:8081", weight: 1 },
    ],
    strategy: "least-connections",
  },
  proxy: {
    pathRewrite: (path) => {
      return path.replace("/api/lb", "");
    },
  },
  hooks: {
    afterCircuitBreakerExecution: async (req, result) => {
      logger.info(
        `Circuit breaker ${result.success ? "succeeded" : "failed"} for ${req.url} after ${result.executionTimeMs} ms`
      );
    },
  },
  circuitBreaker: {
    enabled: true,
    failureThreshold: 3, // Fail after 3 consecutive errors
    resetTimeout: 10000, // Reset after 10 seconds
    timeout: 2000, // Timeout after 2 seconds
  },
});

// Start the server
await gateway.listen(3000);
console.log("Gateway running on http://localhost:3000");

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\nShutting down...");
  await gateway.close();
  process.exit(0);
});
