/**
 * E2E tests for Rate Limiting functionality
 * Tests the rate limiting capabilities with real echo servers
 */
import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { BunGateway } from "../../src/gateway/gateway.ts";
import { BunGateLogger } from "../../src/logger/pino-logger.ts";

describe("Rate Limiting E2E Tests", () => {
  let gateway: BunGateway;
  let echoServer: any;

  beforeAll(async () => {
    // Start echo server on port 8130
    echoServer = Bun.serve({
      port: 8130,
      fetch(req) {
        const url = new URL(req.url);

        // Health endpoint
        if (url.pathname === "/health" || url.pathname === "/") {
          return new Response("OK", {
            status: 200,
            headers: {
              "Content-Type": "text/plain",
              "X-Server": "echo-server",
            },
          });
        }

        // Echo endpoint
        const response = {
          server: "echo-server",
          port: 8130,
          method: req.method,
          path: url.pathname,
          headers: Object.fromEntries(req.headers.entries()),
          timestamp: new Date().toISOString(),
        };

        return new Response(JSON.stringify(response, null, 2), {
          headers: {
            "Content-Type": "application/json",
            "X-Server": "echo-server",
          },
        });
      },
    });

    // Wait for server to start
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Create gateway
    const logger = new BunGateLogger({ level: "error" });
    gateway = new BunGateway({
      logger,
      server: { port: 3006, development: false },
    });

    // Add rate-limited route
    gateway.addRoute({
      pattern: "/api/rate-limited/*",
      methods: ["GET"],
      target: "http://localhost:8130",
      rateLimit: {
        windowMs: 10000,
        max: 3,
      },
      proxy: {
        pathRewrite: (path: string) => path.replace("/api/rate-limited", ""),
      },
    });

    // Start gateway
    await gateway.listen(3006);
    await new Promise((resolve) => setTimeout(resolve, 500));
  });

  afterAll(async () => {
    if (gateway) {
      await gateway.close();
    }
    if (echoServer) {
      echoServer.stop();
    }
  });

  test("should start echo server successfully", async () => {
    const response = await fetch("http://localhost:8130/health");
    expect(response.status).toBe(200);
    expect(response.headers.get("X-Server")).toBe("echo-server");
  });

  test("should allow requests within rate limit", async () => {
    const responses = [];
    for (let i = 0; i < 3; i++) {
      const response = await fetch("http://localhost:3006/api/rate-limited/test");
      responses.push(response);
    }

    for (const response of responses) {
      expect(response.status).toBe(200);
      expect(response.headers.get("x-ratelimit-limit")).toBe("3");
    }
  });

  test("should return 429 when rate limit exceeded", async () => {
    // Make requests to exceed limit
    for (let i = 0; i < 3; i++) {
      await fetch("http://localhost:3006/api/rate-limited/exceed");
    }

    // This should be rate limited
    const response = await fetch("http://localhost:3006/api/rate-limited/exceed");
    expect(response.status).toBe(429);
  });
});
