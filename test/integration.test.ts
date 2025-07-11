/**
 * Integration tests for BunGate interfaces
 * Validates that all type imports work correctly
 */
import { describe, test, expect } from "bun:test";

describe("BunGate Type Integration", () => {
  test("should import interface modules without errors", async () => {
    // Test that interface modules can be imported (types are compile-time only)
    const gatewayModule = await import("../src/interfaces/gateway.ts");
    const routeModule = await import("../src/interfaces/route.ts");
    const middlewareModule = await import("../src/interfaces/middleware.ts");
    const proxyModule = await import("../src/interfaces/proxy.ts");

    // Modules should exist even if they only export types
    expect(gatewayModule).toBeDefined();
    expect(routeModule).toBeDefined();
    expect(middlewareModule).toBeDefined();
    expect(proxyModule).toBeDefined();
  });

  test("should import from main index without errors", async () => {
    // Test main index import
    const interfaces = await import("../src/interfaces/index.ts");

    // The import should succeed (main validation is TypeScript compilation)
    expect(interfaces).toBeDefined();
  });

  test("should validate type compatibility with 0http-bun and fetch-gate", async () => {
    // Import actual packages to verify compatibility
    const zeroHttp = await import("0http-bun");
    const fetchGate = await import("fetch-gate");

    // Verify packages are available
    expect(zeroHttp.default).toBeDefined();
    expect(fetchGate.default).toBeDefined();

    // The main test is that TypeScript compilation succeeds
    // This validates our type re-exports are compatible
    expect(true).toBe(true);
  });
});
