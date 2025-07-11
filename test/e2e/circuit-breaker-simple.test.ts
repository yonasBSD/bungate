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
          // Configure circuit breaker with normal settings
          circuitBreaker: { 
            enabled: true,
            timeout: 5000,
            failureThreshold: 5,
            resetTimeout: 10000
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
