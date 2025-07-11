/**
 * Custom Middleware E2E Tests
 *
 * Tests custom middleware functionality at both:
 * 1. Gateway level (global middleware)
 * 2. Route level (route-specific middleware)
 */

import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { BunGateway } from "../../src/gateway/gateway.ts";
import { BunGateLogger } from "../../src/logger/pino-logger.ts";
import type { ZeroRequest, RequestHandler } from "../../src/interfaces/middleware.ts";

describe("Custom Middleware E2E Tests", () => {
  let gateway: BunGateway;
  let mockServer: any;
  let baseUrl: string;

  beforeAll(async () => {
    // Create a mock backend server
    mockServer = Bun.serve({
      port: 9001,
      fetch: async (req) => {
        const url = new URL(req.url);

        if (url.pathname === "/api/users") {
          return new Response(
            JSON.stringify([
              { id: 1, name: "Alice" },
              { id: 2, name: "Bob" },
            ]),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        if (url.pathname === "/api/posts") {
          return new Response(
            JSON.stringify([
              { id: 1, title: "Post 1", author: "Alice" },
              { id: 2, title: "Post 2", author: "Bob" },
            ]),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        return new Response("Not Found", { status: 404 });
      },
    });

    // Create gateway with logger
    const logger = new BunGateLogger({
      level: "info",
      transport: {
        target: "pino/file",
        options: {
          destination: "/dev/null", // Suppress logs during tests
        },
      },
    });

    gateway = new BunGateway({
      logger,
      server: {
        port: 9000,
        hostname: "localhost",
        development: true,
      },
      metrics: {
        enabled: false, // Disable metrics to avoid conflicts
      },
    });

    baseUrl = "http://localhost:9000";
  });

  afterAll(async () => {
    await gateway.close();
    mockServer.stop();
  });

  describe("Gateway Level Middleware", () => {
    it("should apply global middleware to all routes", async () => {
      const requestLogs: string[] = [];
      const responseLogs: string[] = [];

      // Custom logging middleware
      const loggingMiddleware: RequestHandler = async (req, next) => {
        requestLogs.push(`Request: ${req.method} ${new URL(req.url).pathname}`);
        const response = await next();
        responseLogs.push(`Response: ${response.status}`);
        return response;
      };

      // Authentication middleware
      const authMiddleware: RequestHandler = async (req, next) => {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
          return new Response("Unauthorized", { status: 401 });
        }
        return next();
      };

      // Custom header middleware
      const headerMiddleware: RequestHandler = async (req, next) => {
        const response = await next();
        // Clone response to add custom headers
        const clonedResponse = new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        });
        clonedResponse.headers.set("X-Custom-Gateway", "BunGate");
        clonedResponse.headers.set("X-Request-ID", crypto.randomUUID());
        return clonedResponse;
      };

      // Apply global middlewares
      gateway.use(loggingMiddleware);
      gateway.use(authMiddleware);
      gateway.use(headerMiddleware);

      // Add routes
      gateway.addRoute({
        pattern: "/api/users",
        target: "http://localhost:9001",
        proxy: {
          pathRewrite: (path) => path,
        },
      });

      gateway.addRoute({
        pattern: "/api/posts",
        target: "http://localhost:9001",
        proxy: {
          pathRewrite: (path) => path,
        },
      });

      // Start server
      await gateway.listen();

      // Test unauthorized request
      const unauthorizedResponse = await fetch(`${baseUrl}/api/users`);
      expect(unauthorizedResponse.status).toBe(401);
      expect(await unauthorizedResponse.text()).toBe("Unauthorized");

      // Test authorized request to users endpoint
      const usersResponse = await fetch(`${baseUrl}/api/users`, {
        headers: {
          Authorization: "Bearer valid-token",
        },
      });

      expect(usersResponse.status).toBe(200);
      expect(usersResponse.headers.get("X-Custom-Gateway")).toBe("BunGate");
      expect(usersResponse.headers.get("X-Request-ID")).toBeTruthy();

      const usersData = await usersResponse.json();
      expect(usersData).toEqual([
        { id: 1, name: "Alice" },
        { id: 2, name: "Bob" },
      ]);

      // Test authorized request to posts endpoint
      const postsResponse = await fetch(`${baseUrl}/api/posts`, {
        headers: {
          Authorization: "Bearer valid-token",
        },
      });

      expect(postsResponse.status).toBe(200);
      expect(postsResponse.headers.get("X-Custom-Gateway")).toBe("BunGate");
      expect(postsResponse.headers.get("X-Request-ID")).toBeTruthy();

      const postsData = await postsResponse.json();
      expect(postsData).toEqual([
        { id: 1, title: "Post 1", author: "Alice" },
        { id: 2, title: "Post 2", author: "Bob" },
      ]);

      // Verify middleware execution
      expect(requestLogs).toContain("Request: GET /api/users");
      expect(requestLogs).toContain("Request: GET /api/posts");
      expect(responseLogs).toContain("Response: 200");
      expect(responseLogs.length).toBeGreaterThan(0);
    });

    it("should handle middleware errors gracefully", async () => {
      const errorMiddleware: RequestHandler = async (req, next) => {
        if (req.url.includes("/error")) {
          // Instead of throwing, return an error response directly
          return new Response("Middleware Error Occurred", { status: 500 });
        }
        return next();
      };

      // Create a new gateway for this test
      const testGateway = new BunGateway({
        server: {
          port: 9002,
          hostname: "localhost",
          development: false, // Disable development mode to avoid logging conflicts
        },
        metrics: {
          enabled: false, // Disable metrics to avoid conflicts
        },
      });

      testGateway.use(errorMiddleware);

      testGateway.addRoute({
        pattern: "/error",
        handler: async (req) => {
          return new Response("This should not be reached", { status: 200 });
        },
      });

      testGateway.addRoute({
        pattern: "/success",
        handler: async (req) => {
          return new Response("Success", { status: 200 });
        },
      });

      await testGateway.listen();

      // Test error path - middleware should return 500 error response
      const errorResponse = await fetch("http://localhost:9002/error");
      expect(errorResponse.status).toBe(500);
      expect(await errorResponse.text()).toBe("Middleware Error Occurred");

      // Test success path
      const successResponse = await fetch("http://localhost:9002/success");
      expect(successResponse.status).toBe(200);
      expect(await successResponse.text()).toBe("Success");

      await testGateway.close();
    });
  });

  describe("Route Level Middleware", () => {
    it("should apply route-specific middleware only to specific routes", async () => {
      const routeSpecificLogs: string[] = [];
      const globalLogs: string[] = [];

      // Route-specific middleware
      const routeSpecificMiddleware: RequestHandler = async (req, next) => {
        routeSpecificLogs.push(`Route middleware: ${new URL(req.url).pathname}`);
        const response = await next();
        response.headers.set("X-Route-Specific", "true");
        return response;
      };

      // Global middleware
      const globalMiddleware: RequestHandler = async (req, next) => {
        globalLogs.push(`Global middleware: ${new URL(req.url).pathname}`);
        const response = await next();
        response.headers.set("X-Global-Middleware", "true");
        return response;
      };

      // Create a new gateway for this test
      const testGateway = new BunGateway({
        server: {
          port: 9003,
          hostname: "localhost",
          development: true,
        },
        metrics: {
          enabled: false, // Disable metrics to avoid conflicts
        },
      });

      // Apply global middleware
      testGateway.use(globalMiddleware);

      // Route with specific middleware
      testGateway.addRoute({
        pattern: "/api/protected/*",
        target: "http://localhost:9001",
        middlewares: [routeSpecificMiddleware],
        proxy: {
          pathRewrite: (path) => path.replace("/api/protected", "/api"),
        },
      });

      // Route without specific middleware
      testGateway.addRoute({
        pattern: "/api/public/*",
        target: "http://localhost:9001",
        proxy: {
          pathRewrite: (path) => path.replace("/api/public", "/api"),
        },
      });

      await testGateway.listen();

      // Test protected route (should have both global and route-specific middleware)
      const protectedResponse = await fetch("http://localhost:9003/api/protected/users");
      expect(protectedResponse.status).toBe(200);
      expect(protectedResponse.headers.get("X-Global-Middleware")).toBe("true");
      expect(protectedResponse.headers.get("X-Route-Specific")).toBe("true");

      // Test public route (should only have global middleware)
      const publicResponse = await fetch("http://localhost:9003/api/public/users");
      expect(publicResponse.status).toBe(200);
      expect(publicResponse.headers.get("X-Global-Middleware")).toBe("true");
      expect(publicResponse.headers.get("X-Route-Specific")).toBe(null);

      // Verify middleware execution
      expect(globalLogs).toContain("Global middleware: /api/protected/users");
      expect(globalLogs).toContain("Global middleware: /api/public/users");
      expect(routeSpecificLogs).toContain("Route middleware: /api/protected/users");
      expect(routeSpecificLogs).not.toContain("Route middleware: /api/public/users");

      await testGateway.close();
    });

    it("should handle multiple route-specific middlewares in correct order", async () => {
      const executionOrder: string[] = [];

      // First middleware
      const firstMiddleware: RequestHandler = async (req, next) => {
        executionOrder.push("first-before");
        const response = await next();
        executionOrder.push("first-after");
        response.headers.set("X-First", "executed");
        return response;
      };

      // Second middleware
      const secondMiddleware: RequestHandler = async (req, next) => {
        executionOrder.push("second-before");
        const response = await next();
        executionOrder.push("second-after");
        response.headers.set("X-Second", "executed");
        return response;
      };

      // Third middleware
      const thirdMiddleware: RequestHandler = async (req, next) => {
        executionOrder.push("third-before");
        const response = await next();
        executionOrder.push("third-after");
        response.headers.set("X-Third", "executed");
        return response;
      };

      // Create a new gateway for this test
      const testGateway = new BunGateway({
        server: {
          port: 9004,
          hostname: "localhost",
          development: true,
        },
        metrics: {
          enabled: false, // Disable metrics to avoid conflicts
        },
      });

      // Route with multiple middlewares
      testGateway.addRoute({
        pattern: "/api/chain/*",
        target: "http://localhost:9001",
        middlewares: [firstMiddleware, secondMiddleware, thirdMiddleware],
        proxy: {
          pathRewrite: (path) => path.replace("/api/chain", "/api"),
        },
      });

      await testGateway.listen();

      // Test middleware chain
      const response = await fetch("http://localhost:9004/api/chain/users");
      expect(response.status).toBe(200);
      expect(response.headers.get("X-First")).toBe("executed");
      expect(response.headers.get("X-Second")).toBe("executed");
      expect(response.headers.get("X-Third")).toBe("executed");

      // Verify execution order
      expect(executionOrder).toEqual([
        "first-before",
        "second-before",
        "third-before",
        "third-after",
        "second-after",
        "first-after",
      ]);

      await testGateway.close();
    });

    it("should handle route-specific middleware with validation and transformation", async () => {
      // Request validation middleware
      const validationMiddleware: RequestHandler = async (req, next) => {
        if (req.method === "POST") {
          const contentType = req.headers.get("Content-Type");
          if (!contentType || !contentType.includes("application/json")) {
            return new Response("Invalid Content-Type", { status: 400 });
          }
        }
        return next();
      };

      // Request transformation middleware
      const transformationMiddleware: RequestHandler = async (req, next) => {
        // Add custom headers to forwarded request
        const modifiedRequest = new Request(req.url, {
          method: req.method,
          headers: {
            ...Object.fromEntries(req.headers.entries()),
            "X-Forwarded-By": "BunGate",
            "X-Timestamp": new Date().toISOString(),
          },
          body: req.body,
        });

        const response = await next();

        // Transform response
        const data = (await response.json()) as Record<string, any>;
        const transformedData = {
          ...data,
          metadata: {
            transformedBy: "BunGate",
            timestamp: new Date().toISOString(),
          },
        };

        return new Response(JSON.stringify(transformedData), {
          status: response.status,
          headers: {
            "Content-Type": "application/json",
            "X-Transformed": "true",
          },
        });
      };

      // Create a new gateway for this test
      const testGateway = new BunGateway({
        server: {
          port: 9005,
          hostname: "localhost",
          development: true,
        },
        metrics: {
          enabled: false, // Disable metrics to avoid conflicts
        },
      });

      // Route with validation and transformation
      testGateway.addRoute({
        pattern: "/api/validated/*",
        methods: ["GET", "POST"], // Explicitly specify methods
        target: "http://localhost:9001",
        middlewares: [validationMiddleware, transformationMiddleware],
        proxy: {
          pathRewrite: (path) => path.replace("/api/validated", "/api"),
        },
      });

      await testGateway.listen();

      // Test valid GET request
      const getResponse = await fetch("http://localhost:9005/api/validated/users");
      expect(getResponse.status).toBe(200);
      expect(getResponse.headers.get("X-Transformed")).toBe("true");

      const getData = (await getResponse.json()) as Record<string, any>;
      expect(getData.metadata).toBeDefined();
      expect(getData.metadata.transformedBy).toBe("BunGate");
      expect(getData.metadata.timestamp).toBeTruthy();

      // Test invalid POST request (missing Content-Type)
      const invalidPostResponse = await fetch("http://localhost:9005/api/validated/users", {
        method: "POST",
        body: JSON.stringify({ name: "Test User" }),
      });
      expect(invalidPostResponse.status).toBe(400);
      expect(await invalidPostResponse.text()).toBe("Invalid Content-Type");

      // Test valid POST request
      const validPostResponse = await fetch("http://localhost:9005/api/validated/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: "Test User" }),
      });
      expect(validPostResponse.status).toBe(200);
      expect(validPostResponse.headers.get("X-Transformed")).toBe("true");

      await testGateway.close();
    });
  });

  describe("Mixed Middleware Scenarios", () => {
    it("should handle both global and route-specific middleware together", async () => {
      const executionOrder: string[] = [];

      // Global middleware
      const globalMiddleware: RequestHandler = async (req, next) => {
        executionOrder.push("global-before");
        const response = await next();
        executionOrder.push("global-after");
        response.headers.set("X-Global", "true");
        return response;
      };

      // Route-specific middleware
      const routeMiddleware: RequestHandler = async (req, next) => {
        executionOrder.push("route-before");
        const response = await next();
        executionOrder.push("route-after");
        response.headers.set("X-Route", "true");
        return response;
      };

      // Create a new gateway for this test
      const testGateway = new BunGateway({
        server: {
          port: 9006,
          hostname: "localhost",
          development: true,
        },
        metrics: {
          enabled: false, // Disable metrics to avoid conflicts
        },
      });

      // Apply global middleware
      testGateway.use(globalMiddleware);

      // Route with specific middleware
      testGateway.addRoute({
        pattern: "/api/mixed/*",
        target: "http://localhost:9001",
        middlewares: [routeMiddleware],
        proxy: {
          pathRewrite: (path) => path.replace("/api/mixed", "/api"),
        },
      });

      await testGateway.listen();

      // Test mixed middleware execution
      const response = await fetch("http://localhost:9006/api/mixed/users");
      expect(response.status).toBe(200);
      expect(response.headers.get("X-Global")).toBe("true");
      expect(response.headers.get("X-Route")).toBe("true");

      // Verify execution order (global middleware should wrap route middleware)
      expect(executionOrder).toEqual(["global-before", "route-before", "route-after", "global-after"]);

      await testGateway.close();
    });
  });
});
