import { describe, test, expect } from "bun:test";
import { BunGateway } from "../../src/gateway/gateway";

describe("Circuit Breaker E2E", () => {
  test("circuit breaker handles fast responses", async () => {
    const backendPort = 8140 + Math.floor(Math.random() * 1000);
    const gatewayPort = 3000 + Math.floor(Math.random() * 1000);

    // Create a simple backend
    const backend = Bun.serve({
      port: backendPort,
      async fetch(req) {
        return new Response("hello", { status: 200 });
      },
    });

    const gateway = new BunGateway({
      routes: [
        {
          pattern: "/api/cb/*",
          target: `http://localhost:${backendPort}`,
          proxy: { pathRewrite: { "^/api/cb": "" } },
          circuitBreaker: {
            enabled: true,
            timeout: 5000,
            failureThreshold: 5,
            resetTimeout: 10000,
          },
        },
      ],
      server: { port: gatewayPort },
    });

    await gateway.listen();
    await new Promise((r) => setTimeout(r, 200));

    try {
      const response = await fetch(`http://localhost:${gatewayPort}/api/cb/hello`);
      expect(response.status).toBe(200);
      const text = await response.text();
      expect(text).toBe("hello");
    } finally {
      await gateway.close();
      backend.stop();
    }
  });

  test("circuit breaker handles timeouts", async () => {
    const backendPort = 8140 + Math.floor(Math.random() * 1000);
    const gatewayPort = 3000 + Math.floor(Math.random() * 1000);

    // Create a backend that hangs
    const backend = Bun.serve({
      port: backendPort,
      async fetch(req) {
        // Hang for longer than circuit breaker timeout
        await new Promise((r) => setTimeout(r, 3000));
        return new Response("hello", { status: 200 });
      },
    });

    const gateway = new BunGateway({
      routes: [
        {
          pattern: "/api/cb/*",
          target: `http://localhost:${backendPort}`,
          proxy: { pathRewrite: { "^/api/cb": "" } },
          circuitBreaker: {
            enabled: true,
            timeout: 1000, // 1 second timeout
            failureThreshold: 2,
            resetTimeout: 10000,
          },
        },
      ],
      server: { port: gatewayPort },
    });

    await gateway.listen();
    await new Promise((r) => setTimeout(r, 200));

    try {
      const response = await fetch(`http://localhost:${gatewayPort}/api/cb/hello`);
      expect(response.status).toBe(504); // Gateway timeout
    } finally {
      await gateway.close();
      backend.stop();
    }
  });

  test("circuit breaker opens after repeated failures", async () => {
    const backendPort = 8140 + Math.floor(Math.random() * 1000);
    const gatewayPort = 3000 + Math.floor(Math.random() * 1000);

    // Create a backend that always fails
    const backend = Bun.serve({
      port: backendPort,
      async fetch(req) {
        return new Response("Internal Server Error", { status: 500 });
      },
    });

    const gateway = new BunGateway({
      routes: [
        {
          pattern: "/api/cb/*",
          target: `http://localhost:${backendPort}`,
          proxy: { pathRewrite: { "^/api/cb": "" } },
          circuitBreaker: {
            enabled: true,
            timeout: 5000,
            failureThreshold: 3,
            resetTimeout: 10000,
          },
        },
      ],
      server: { port: gatewayPort },
    });

    await gateway.listen();
    await new Promise((r) => setTimeout(r, 200));

    try {
      // First few requests should get 502 errors (circuit breaker converts 500 to 502)
      for (let i = 0; i < 3; i++) {
        const response = await fetch(`http://localhost:${gatewayPort}/api/cb/hello`);
        expect(response.status).toBe(502);
      }

      // Next request should be rejected with 503 (circuit breaker open)
      const response = await fetch(`http://localhost:${gatewayPort}/api/cb/hello`);
      expect(response.status).toBe(503);
    } finally {
      await gateway.close();
      backend.stop();
    }
  });

  test("circuit breaker can be disabled", async () => {
    const backendPort = 8140 + Math.floor(Math.random() * 1000);
    const gatewayPort = 3000 + Math.floor(Math.random() * 1000);

    // Create a simple backend
    const backend = Bun.serve({
      port: backendPort,
      async fetch(req) {
        return new Response("hello", { status: 200 });
      },
    });

    const gateway = new BunGateway({
      routes: [
        {
          pattern: "/api/cb/*",
          target: `http://localhost:${backendPort}`,
          proxy: { pathRewrite: { "^/api/cb": "" } },
          circuitBreaker: {
            enabled: false, // Explicitly disabled
          },
        },
      ],
      server: { port: gatewayPort },
    });

    await gateway.listen();
    await new Promise((r) => setTimeout(r, 200));

    try {
      const response = await fetch(`http://localhost:${gatewayPort}/api/cb/hello`);
      expect(response.status).toBe(200);
      const text = await response.text();
      expect(text).toBe("hello");
    } finally {
      await gateway.close();
      backend.stop();
    }
  });
});
