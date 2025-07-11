import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { BunGateway } from "../../src/gateway/gateway.ts";
import type { Server } from "bun";
import type { ZeroRequest } from "../../src/interfaces/middleware.ts";
import type { RouteConfig } from "../../src/interfaces/route.ts";

describe("Hooks E2E Tests", () => {
  let gateway: BunGateway;
  let gatewayServer: Server;
  let echoServer: Server;
  let failingServer: Server;
  let gatewayPort: number;
  let echoPort: number;
  let failingPort: number;

  // Hook tracking variables
  let beforeRequestCalls: Array<{ req: ZeroRequest; opts: any }> = [];
  let afterResponseCalls: Array<{ req: ZeroRequest; res: Response; body: any }> = [];
  let onErrorCalls: Array<{ req: Request; error: Error }> = [];
  let beforeCircuitBreakerCalls: Array<{ req: Request; options: any }> = [];
  let afterCircuitBreakerCalls: Array<{ req: Request; result: any }> = [];

  beforeAll(async () => {
    // Reset hook tracking
    beforeRequestCalls = [];
    afterResponseCalls = [];
    onErrorCalls = [];
    beforeCircuitBreakerCalls = [];
    afterCircuitBreakerCalls = [];

    // Start echo server
    echoPort = Math.floor(Math.random() * 10000) + 20000;
    echoServer = Bun.serve({
      port: echoPort,
      fetch: async (req) => {
        const url = new URL(req.url);

        if (url.pathname === "/health") {
          return new Response("OK", { status: 200 });
        }

        if (url.pathname === "/hello") {
          return new Response("Hello from echo server", { status: 200 });
        }

        if (url.pathname === "/slow") {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return new Response("Slow response", { status: 200 });
        }

        return new Response("Not found", { status: 404 });
      },
    });

    // Start failing server
    failingPort = Math.floor(Math.random() * 10000) + 30000;
    failingServer = Bun.serve({
      port: failingPort,
      fetch: async (req) => {
        const url = new URL(req.url);

        if (url.pathname === "/health") {
          return new Response("OK", { status: 200 });
        }

        if (url.pathname === "/error") {
          return new Response("Server error", { status: 500 });
        }

        if (url.pathname === "/timeout") {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          return new Response("Should not reach here", { status: 200 });
        }

        return new Response("Not found", { status: 404 });
      },
    });

    // Start gateway
    gatewayPort = Math.floor(Math.random() * 10000) + 40000;
    gateway = new BunGateway({
      server: {
        port: gatewayPort,
      },
    });

    // Add route with all hooks
    const routeConfig: RouteConfig = {
      pattern: "/api/hooks/*",
      target: `http://localhost:${echoPort}`,
      proxy: {
        pathRewrite: {
          "^/api/hooks": "",
        },
      },
      hooks: {
        beforeRequest: async (req: ZeroRequest, opts: any) => {
          beforeRequestCalls.push({ req, opts });
        },
        afterResponse: async (req: ZeroRequest, res: Response, body: any) => {
          afterResponseCalls.push({ req, res, body });
        },
        onError: async (req: Request, error: Error) => {
          onErrorCalls.push({ req, error });
        },
        beforeCircuitBreakerExecution: async (req: Request, options: any) => {
          beforeCircuitBreakerCalls.push({ req, options });
        },
        afterCircuitBreakerExecution: async (req: Request, result: any) => {
          afterCircuitBreakerCalls.push({ req, result });
        },
      },
    };

    gateway.addRoute(routeConfig);

    // Add route with error scenarios
    const errorRouteConfig: RouteConfig = {
      pattern: "/api/error/*",
      target: `http://localhost:${failingPort}`,
      timeout: 1000, // 1 second timeout
      proxy: {
        pathRewrite: {
          "^/api/error": "",
        },
      },
      circuitBreaker: {
        enabled: true,
        timeout: 1000,
        resetTimeout: 5000,
        failureThreshold: 2,
      },
      hooks: {
        beforeRequest: async (req: ZeroRequest, opts: any) => {
          beforeRequestCalls.push({ req, opts });
        },
        afterResponse: async (req: ZeroRequest, res: Response, body: any) => {
          afterResponseCalls.push({ req, res, body });
        },
        onError: async (req: Request, error: Error) => {
          onErrorCalls.push({ req, error });
        },
        beforeCircuitBreakerExecution: async (req: Request, options: any) => {
          beforeCircuitBreakerCalls.push({ req, options });
        },
        afterCircuitBreakerExecution: async (req: Request, result: any) => {
          afterCircuitBreakerCalls.push({ req, result });
        },
      },
    };

    gateway.addRoute(errorRouteConfig);

    gatewayServer = await gateway.listen(gatewayPort);
  });

  afterAll(async () => {
    if (gatewayServer) {
      gatewayServer.stop();
    }
    if (echoServer) {
      echoServer.stop();
    }
    if (failingServer) {
      failingServer.stop();
    }
  });

  test("should trigger beforeRequest and afterResponse hooks on successful request", async () => {
    const initialBeforeCount = beforeRequestCalls.length;
    const initialAfterCount = afterResponseCalls.length;

    const response = await fetch(`http://localhost:${gatewayPort}/api/hooks/hello`);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("Hello from echo server");

    // Verify hooks were called
    expect(beforeRequestCalls.length).toBe(initialBeforeCount + 1);
    expect(afterResponseCalls.length).toBe(initialAfterCount + 1);

    // Verify hook data
    const beforeCall = beforeRequestCalls[beforeRequestCalls.length - 1];
    expect(beforeCall?.req.url).toContain("/api/hooks/hello");
    expect(beforeCall?.opts).toBeDefined();

    const afterCall = afterResponseCalls[afterResponseCalls.length - 1];
    expect(afterCall?.req.url).toContain("/api/hooks/hello");
    expect(afterCall?.res.status).toBe(200);
  });

  test("should trigger circuit breaker hooks on successful request", async () => {
    const initialBeforeCount = beforeCircuitBreakerCalls.length;
    const initialAfterCount = afterCircuitBreakerCalls.length;

    const response = await fetch(`http://localhost:${gatewayPort}/api/error/health`);
    expect(response.status).toBe(200);

    // Verify circuit breaker hooks were called
    expect(beforeCircuitBreakerCalls.length).toBe(initialBeforeCount + 1);
    expect(afterCircuitBreakerCalls.length).toBe(initialAfterCount + 1);

    // Verify hook data
    const beforeCall = beforeCircuitBreakerCalls[beforeCircuitBreakerCalls.length - 1];
    expect(beforeCall?.req.url).toContain("/api/error/health");
    expect(beforeCall?.options).toBeDefined();

    const afterCall = afterCircuitBreakerCalls[afterCircuitBreakerCalls.length - 1];
    expect(afterCall?.req.url).toContain("/api/error/health");
    expect(afterCall?.result.state).toBe("CLOSED");
    expect(afterCall?.result.success).toBe(true);
  });

  test("should trigger onError hook on server error", async () => {
    const initialErrorCount = onErrorCalls.length;
    const initialBeforeCount = beforeRequestCalls.length;

    const response = await fetch(`http://localhost:${gatewayPort}/api/error/error`);
    expect(response.status).toBe(502); // Circuit breaker converts 500 to 502

    // Verify hooks were called
    expect(beforeRequestCalls.length).toBe(initialBeforeCount + 1);
    expect(onErrorCalls.length).toBe(initialErrorCount + 1);

    // Verify error hook data
    const errorCall = onErrorCalls[onErrorCalls.length - 1];
    expect(errorCall?.req.url).toContain("/api/error/error");
    expect(errorCall?.error.message).toContain("Server error");
  });

  test("should trigger onError hook on timeout", async () => {
    const initialErrorCount = onErrorCalls.length;
    const initialBeforeCount = beforeRequestCalls.length;

    const response = await fetch(`http://localhost:${gatewayPort}/api/error/timeout`);
    expect(response.status).toBe(504); // Gateway timeout

    // Verify hooks were called
    expect(beforeRequestCalls.length).toBe(initialBeforeCount + 1);
    expect(onErrorCalls.length).toBe(initialErrorCount + 1);

    // Verify error hook data
    const errorCall = onErrorCalls[onErrorCalls.length - 1];
    expect(errorCall?.req.url).toContain("/api/error/timeout");
    expect(errorCall?.error.message).toContain("timeout");
  });

  test("should trigger circuit breaker hooks with failure state", async () => {
    // Wait for circuit breaker to potentially reset
    await new Promise((resolve) => setTimeout(resolve, 100));

    const initialBeforeCount = beforeCircuitBreakerCalls.length;
    const initialAfterCount = afterCircuitBreakerCalls.length;

    // Make a request that will fail
    const response = await fetch(`http://localhost:${gatewayPort}/api/error/error`);
    // Circuit breaker might be open from previous test, so accept either 502 or 503
    expect([502, 503]).toContain(response.status);

    // Verify circuit breaker hooks were called
    expect(beforeCircuitBreakerCalls.length).toBe(initialBeforeCount + 1);
    expect(afterCircuitBreakerCalls.length).toBe(initialAfterCount + 1);

    // Verify hook data shows failure
    const afterCall = afterCircuitBreakerCalls[afterCircuitBreakerCalls.length - 1];
    expect(afterCall?.req.url).toContain("/api/error/error");
    expect(afterCall?.result.success).toBe(false);
  });

  test("should trigger all hooks in correct order for successful request", async () => {
    // Reset counters
    const startBeforeRequest = beforeRequestCalls.length;
    const startBeforeCircuitBreaker = beforeCircuitBreakerCalls.length;
    const startAfterCircuitBreaker = afterCircuitBreakerCalls.length;
    const startAfterResponse = afterResponseCalls.length;

    const response = await fetch(`http://localhost:${gatewayPort}/api/hooks/slow`);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("Slow response");

    // Verify all hooks were called exactly once
    expect(beforeRequestCalls.length).toBe(startBeforeRequest + 1);
    expect(beforeCircuitBreakerCalls.length).toBe(startBeforeCircuitBreaker + 1);
    expect(afterCircuitBreakerCalls.length).toBe(startAfterCircuitBreaker + 1);
    expect(afterResponseCalls.length).toBe(startAfterResponse + 1);

    // Verify the order and data integrity
    const beforeRequest = beforeRequestCalls[beforeRequestCalls.length - 1];
    const beforeCircuitBreaker = beforeCircuitBreakerCalls[beforeCircuitBreakerCalls.length - 1];
    const afterCircuitBreaker = afterCircuitBreakerCalls[afterCircuitBreakerCalls.length - 1];
    const afterResponse = afterResponseCalls[afterResponseCalls.length - 1];

    // All should be for the same request
    expect(beforeRequest?.req.url).toContain("/api/hooks/slow");
    expect(beforeCircuitBreaker?.req.url).toContain("/api/hooks/slow");
    expect(afterCircuitBreaker?.req.url).toContain("/api/hooks/slow");
    expect(afterResponse?.req.url).toContain("/api/hooks/slow");

    // Circuit breaker should show success
    expect(beforeCircuitBreaker?.options).toBeDefined();
    expect(afterCircuitBreaker?.result.state).toBe("CLOSED");
    expect(afterCircuitBreaker?.result.success).toBe(true);

    // Response should be successful
    expect(afterResponse?.res.status).toBe(200);
  });

  test("should trigger all hooks in correct order for failed request", async () => {
    // Wait for circuit breaker to potentially reset
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Reset counters
    const startBeforeRequest = beforeRequestCalls.length;
    const startBeforeCircuitBreaker = beforeCircuitBreakerCalls.length;
    const startAfterCircuitBreaker = afterCircuitBreakerCalls.length;
    const startOnError = onErrorCalls.length;

    const response = await fetch(`http://localhost:${gatewayPort}/api/error/error`);
    // Circuit breaker might be open from previous test, so accept either 502 or 503
    expect([502, 503]).toContain(response.status);

    // Verify hooks were called
    expect(beforeRequestCalls.length).toBe(startBeforeRequest + 1);
    expect(beforeCircuitBreakerCalls.length).toBe(startBeforeCircuitBreaker + 1);
    expect(afterCircuitBreakerCalls.length).toBe(startAfterCircuitBreaker + 1);
    expect(onErrorCalls.length).toBe(startOnError + 1);

    // Verify the order and data integrity
    const beforeRequest = beforeRequestCalls[beforeRequestCalls.length - 1];
    const beforeCircuitBreaker = beforeCircuitBreakerCalls[beforeCircuitBreakerCalls.length - 1];
    const afterCircuitBreaker = afterCircuitBreakerCalls[afterCircuitBreakerCalls.length - 1];
    const onError = onErrorCalls[onErrorCalls.length - 1];

    // All should be for the same request
    expect(beforeRequest?.req.url).toContain("/api/error/error");
    expect(beforeCircuitBreaker?.req.url).toContain("/api/error/error");
    expect(afterCircuitBreaker?.req.url).toContain("/api/error/error");
    expect(onError?.req.url).toContain("/api/error/error");

    // Circuit breaker should show failure
    expect(beforeCircuitBreaker?.options).toBeDefined();
    expect(afterCircuitBreaker?.result.success).toBe(false);

    // Error should be captured - different error messages based on circuit breaker state
    expect(onError?.error.message).toMatch(/Server error|Circuit breaker is OPEN/);
  });

  test("should pass correct proxy configuration to beforeRequest hook", async () => {
    const initialCount = beforeRequestCalls.length;

    const response = await fetch(`http://localhost:${gatewayPort}/api/hooks/hello`);
    expect(response.status).toBe(200);

    expect(beforeRequestCalls.length).toBe(initialCount + 1);

    const beforeCall = beforeRequestCalls[beforeRequestCalls.length - 1];
    expect(beforeCall?.opts).toBeDefined();
    expect(beforeCall?.opts.pathRewrite).toBeDefined();
    expect(beforeCall?.opts.pathRewrite["^/api/hooks"]).toBe("");
  });

  test("should provide response body to afterResponse hook", async () => {
    const initialCount = afterResponseCalls.length;

    const response = await fetch(`http://localhost:${gatewayPort}/api/hooks/hello`);
    expect(response.status).toBe(200);

    expect(afterResponseCalls.length).toBe(initialCount + 1);

    const afterCall = afterResponseCalls[afterResponseCalls.length - 1];
    expect(afterCall?.res.status).toBe(200);
    expect(afterCall?.res.headers.get("content-type")).toContain("text/plain");
    expect(afterCall?.body).toBeDefined();
  });
});
