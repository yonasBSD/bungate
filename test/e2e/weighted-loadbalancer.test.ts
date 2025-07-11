/**
 * Weighted Load Balancer E2E Tests
 * Tests the weighted load balancing strategy with different weight configurations
 */
import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { BunGateway } from "../../src/gateway/gateway.ts";
import { BunGateLogger } from "../../src/logger/pino-logger.ts";

interface EchoResponse {
  server: string;
  port: number;
  method: string;
  path: string;
  headers: Record<string, string>;
  timestamp: string;
}

describe("Weighted Load Balancer E2E Tests", () => {
  let gateway: BunGateway;
  let echoServer1: any;
  let echoServer2: any;
  let echoServer3: any;

  beforeAll(async () => {
    // Start echo servers on ports 8100, 8101, and 8102
    echoServer1 = Bun.serve({
      port: 8100,
      fetch(req) {
        const url = new URL(req.url);

        // Health endpoint
        if (url.pathname === "/health" || url.pathname === "/") {
          return new Response("OK", {
            status: 200,
            headers: {
              "Content-Type": "text/plain",
              "X-Server": "echo-1",
            },
          });
        }

        // Echo endpoint - return server identifier and request info
        const response = {
          server: "echo-1",
          port: 8100,
          method: req.method,
          path: url.pathname,
          headers: Object.fromEntries(req.headers.entries()),
          timestamp: new Date().toISOString(),
        };

        return new Response(JSON.stringify(response, null, 2), {
          headers: {
            "Content-Type": "application/json",
            "X-Server": "echo-1",
          },
        });
      },
    });

    echoServer2 = Bun.serve({
      port: 8101,
      fetch(req) {
        const url = new URL(req.url);

        // Health endpoint
        if (url.pathname === "/health" || url.pathname === "/") {
          return new Response("OK", {
            status: 200,
            headers: {
              "Content-Type": "text/plain",
              "X-Server": "echo-2",
            },
          });
        }

        // Echo endpoint - return server identifier and request info
        const response = {
          server: "echo-2",
          port: 8101,
          method: req.method,
          path: url.pathname,
          headers: Object.fromEntries(req.headers.entries()),
          timestamp: new Date().toISOString(),
        };

        return new Response(JSON.stringify(response, null, 2), {
          headers: {
            "Content-Type": "application/json",
            "X-Server": "echo-2",
          },
        });
      },
    });

    echoServer3 = Bun.serve({
      port: 8102,
      fetch(req) {
        const url = new URL(req.url);

        // Health endpoint
        if (url.pathname === "/health" || url.pathname === "/") {
          return new Response("OK", {
            status: 200,
            headers: {
              "Content-Type": "text/plain",
              "X-Server": "echo-3",
            },
          });
        }

        // Echo endpoint - return server identifier and request info
        const response = {
          server: "echo-3",
          port: 8102,
          method: req.method,
          path: url.pathname,
          headers: Object.fromEntries(req.headers.entries()),
          timestamp: new Date().toISOString(),
        };

        return new Response(JSON.stringify(response, null, 2), {
          headers: {
            "Content-Type": "application/json",
            "X-Server": "echo-3",
          },
        });
      },
    });

    // Wait a bit for servers to start
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Create gateway with basic logger
    const logger = new BunGateLogger({
      level: "error", // Keep logs quiet during tests
    });

    gateway = new BunGateway({
      logger,
      server: {
        port: 3002, // Use different port to avoid conflicts
        development: false, // Disable development mode to avoid Prometheus conflicts
        hostname: "127.0.0.1",
      },
    });

    // Add weighted load balancer route with 5:2:1 ratio
    gateway.addRoute({
      pattern: "/api/weighted-high/*",
      loadBalancer: {
        strategy: "weighted",
        targets: [
          { url: "http://localhost:8100", weight: 5 }, // High weight
          { url: "http://localhost:8101", weight: 2 }, // Medium weight
          { url: "http://localhost:8102", weight: 1 }, // Low weight
        ],
        healthCheck: {
          enabled: true,
          interval: 2000,
          timeout: 1000,
          path: "/health",
          expectedStatus: 200,
        },
      },
      proxy: {
        pathRewrite: (path) => path.replace("/api/weighted-high", ""),
        timeout: 5000,
      },
    });

    // Add weighted load balancer route with equal weights
    gateway.addRoute({
      pattern: "/api/weighted-equal/*",
      loadBalancer: {
        strategy: "weighted",
        targets: [
          { url: "http://localhost:8100", weight: 1 }, // Equal weight
          { url: "http://localhost:8101", weight: 1 }, // Equal weight
          { url: "http://localhost:8102", weight: 1 }, // Equal weight
        ],
        healthCheck: {
          enabled: true,
          interval: 2000,
          timeout: 1000,
          path: "/health",
          expectedStatus: 200,
        },
      },
      proxy: {
        pathRewrite: (path) => path.replace("/api/weighted-equal", ""),
        timeout: 5000,
      },
    });

    // Add weighted load balancer route with extreme ratio (10:1:0)
    gateway.addRoute({
      pattern: "/api/weighted-extreme/*",
      loadBalancer: {
        strategy: "weighted",
        targets: [
          { url: "http://localhost:8100", weight: 10 }, // Very high weight
          { url: "http://localhost:8101", weight: 1 }, // Low weight
        ],
        healthCheck: {
          enabled: true,
          interval: 2000,
          timeout: 1000,
          path: "/health",
          expectedStatus: 200,
        },
      },
      proxy: {
        pathRewrite: (path) => path.replace("/api/weighted-extreme", ""),
        timeout: 5000,
      },
    });

    // Start the gateway
    await gateway.listen(3002);

    // Wait for health checks to complete
    await new Promise((resolve) => setTimeout(resolve, 3000));
  });

  afterAll(async () => {
    // Clean up
    if (gateway) {
      await gateway.close();
    }
    if (echoServer1) {
      echoServer1.stop();
    }
    if (echoServer2) {
      echoServer2.stop();
    }
    if (echoServer3) {
      echoServer3.stop();
    }
  });

  test("should start all echo servers successfully", async () => {
    // Test that all servers are running
    const echo1Response = await fetch("http://localhost:8100/health");
    expect(echo1Response.status).toBe(200);
    expect(echo1Response.headers.get("X-Server")).toBe("echo-1");

    const echo2Response = await fetch("http://localhost:8101/health");
    expect(echo2Response.status).toBe(200);
    expect(echo2Response.headers.get("X-Server")).toBe("echo-2");

    const echo3Response = await fetch("http://localhost:8102/health");
    expect(echo3Response.status).toBe(200);
    expect(echo3Response.headers.get("X-Server")).toBe("echo-3");
  });

  test("should distribute requests according to weights (5:2:1)", async () => {
    const serverCounts: Record<string, number> = { "echo-1": 0, "echo-2": 0, "echo-3": 0 };
    const requestCount = 40; // Use multiple of 8 for better weight distribution testing

    // Make multiple requests to observe weighted distribution
    for (let i = 0; i < requestCount; i++) {
      const response = await fetch("http://localhost:3002/api/weighted-high/test");
      expect(response.status).toBe(200);

      const data = (await response.json()) as EchoResponse;
      if (data.server in serverCounts) {
        serverCounts[data.server] = (serverCounts[data.server] || 0) + 1;
      }
    }

    // Calculate expected distribution based on weights (5:2:1)
    // Total weight = 5 + 2 + 1 = 8
    // Expected percentages: echo-1 = 5/8 (62.5%), echo-2 = 2/8 (25%), echo-3 = 1/8 (12.5%)
    const expectedEcho1 = Math.round(requestCount * (5 / 8));
    const expectedEcho2 = Math.round(requestCount * (2 / 8));
    const expectedEcho3 = Math.round(requestCount * (1 / 8));

    // Allow reasonable tolerance for weighted distribution (±70% for higher weights, ±100% for lower weights)
    // Weighted load balancing algorithms can have natural variance, especially with smaller sample sizes
    expect(serverCounts["echo-1"] || 0).toBeGreaterThan(expectedEcho1 * 0.5);
    expect(serverCounts["echo-1"] || 0).toBeLessThan(expectedEcho1 * 1.5);

    expect(serverCounts["echo-2"] || 0).toBeGreaterThan(expectedEcho2 * 0.3);
    expect(serverCounts["echo-2"] || 0).toBeLessThan(expectedEcho2 * 1.7);

    expect(serverCounts["echo-3"] || 0).toBeGreaterThan(0); // Just ensure it gets some requests
    expect(serverCounts["echo-3"] || 0).toBeLessThan(expectedEcho3 * 3); // Allow wider tolerance for lowest weight

    // Total should equal request count
    expect((serverCounts["echo-1"] || 0) + (serverCounts["echo-2"] || 0) + (serverCounts["echo-3"] || 0)).toBe(
      requestCount
    );

    // Echo-1 should have the most requests (highest weight) - but allow for algorithm variance
    expect(serverCounts["echo-1"] || 0).toBeGreaterThan(
      Math.max(serverCounts["echo-2"] || 0, serverCounts["echo-3"] || 0)
    );

    // Validate the weighted distribution is working - echo-1 should clearly dominate
    expect(serverCounts["echo-1"] || 0).toBeGreaterThan(requestCount * 0.4); // At least 40% for highest weight

    // Both echo-2 and echo-3 should get some requests
    expect(serverCounts["echo-2"] || 0).toBeGreaterThan(0);
    expect(serverCounts["echo-3"] || 0).toBeGreaterThan(0);

    // Additional validation: ensure weighted distribution is reasonable
    // Echo-1 should have significantly more than the others (highest weight)
    expect(serverCounts["echo-1"] || 0).toBeGreaterThan(
      (serverCounts["echo-2"] || 0) + (serverCounts["echo-3"] || 0) - 5
    );
  });

  test("should distribute requests evenly when weights are equal", async () => {
    const serverCounts: Record<string, number> = { "echo-1": 0, "echo-2": 0, "echo-3": 0 };
    const requestCount = 15; // Use multiple of 3 for better equal distribution testing

    // Make multiple requests to test equal weight distribution
    for (let i = 0; i < requestCount; i++) {
      const response = await fetch("http://localhost:3002/api/weighted-equal/test");
      expect(response.status).toBe(200);

      const data = (await response.json()) as EchoResponse;
      if (data.server in serverCounts) {
        serverCounts[data.server] = (serverCounts[data.server] || 0) + 1;
      }
    }

    // With equal weights, each server should get roughly 1/3 of requests
    const expectedPerServer = requestCount / 3;
    const tolerance = 0.8; // Allow 80% tolerance for equal distribution (weighted algorithms can have variance)

    expect(serverCounts["echo-1"] || 0).toBeGreaterThan(expectedPerServer * (1 - tolerance));
    expect(serverCounts["echo-1"] || 0).toBeLessThan(expectedPerServer * (1 + tolerance));

    expect(serverCounts["echo-2"] || 0).toBeGreaterThan(expectedPerServer * (1 - tolerance));
    expect(serverCounts["echo-2"] || 0).toBeLessThan(expectedPerServer * (1 + tolerance));

    expect(serverCounts["echo-3"] || 0).toBeGreaterThan(expectedPerServer * (1 - tolerance));
    expect(serverCounts["echo-3"] || 0).toBeLessThan(expectedPerServer * (1 + tolerance));

    // Total should equal request count
    expect((serverCounts["echo-1"] || 0) + (serverCounts["echo-2"] || 0) + (serverCounts["echo-3"] || 0)).toBe(
      requestCount
    );
  });

  test("should heavily favor high-weight server in extreme ratio (10:1)", async () => {
    const serverCounts: Record<string, number> = { "echo-1": 0, "echo-2": 0 };
    const requestCount = 22; // Use multiple of 11 for better extreme ratio testing

    // Make multiple requests to test extreme weight distribution
    for (let i = 0; i < requestCount; i++) {
      const response = await fetch("http://localhost:3002/api/weighted-extreme/test");
      expect(response.status).toBe(200);

      const data = (await response.json()) as EchoResponse;
      if (data.server in serverCounts) {
        serverCounts[data.server] = (serverCounts[data.server] || 0) + 1;
      }
    }

    // With 10:1 weight ratio, echo-1 should get ~90% of requests
    const expectedEcho1 = Math.round(requestCount * (10 / 11));
    const expectedEcho2 = Math.round(requestCount * (1 / 11));

    // Allow some tolerance but echo-1 should clearly dominate
    expect(serverCounts["echo-1"] || 0).toBeGreaterThan(expectedEcho1 * 0.8);
    expect(serverCounts["echo-2"] || 0).toBeGreaterThan(0); // Should get at least some requests

    // Total should equal request count
    expect((serverCounts["echo-1"] || 0) + (serverCounts["echo-2"] || 0)).toBe(requestCount);

    // Echo-1 should have significantly more requests than echo-2
    expect(serverCounts["echo-1"] || 0).toBeGreaterThan((serverCounts["echo-2"] || 0) * 3);
  });

  test("should handle path rewriting correctly with weighted strategy", async () => {
    const response = await fetch("http://localhost:3002/api/weighted-high/custom/path");
    expect(response.status).toBe(200);

    const data = (await response.json()) as EchoResponse;
    expect(data.path).toBe("/custom/path");
    expect(data.method).toBe("GET");
    expect(data.server).toMatch(/echo-[123]/);
  });

  test("should handle request headers correctly with weighted strategy", async () => {
    const response = await fetch("http://localhost:3002/api/weighted-high/headers", {
      headers: {
        "X-Test-Header": "weighted-test",
        Authorization: "Bearer weighted-token",
      },
    });

    expect(response.status).toBe(200);
    const data = (await response.json()) as EchoResponse;

    // Verify custom headers were passed through
    expect(data.headers["x-test-header"]).toBe("weighted-test");
    expect(data.headers["authorization"]).toBe("Bearer weighted-token");
    expect(data.server).toMatch(/echo-[123]/);
  });
});
