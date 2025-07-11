/**
 * Test suite for BunGateLogger (pino-logger.ts)
 */
import { describe, test, expect, beforeEach } from "bun:test";
import { BunGateLogger } from "../../src/logger/pino-logger.ts";

function createLogger(config = {}) {
  return new BunGateLogger({
    level: "debug",
    format: "json",
    ...config,
  });
}

describe("BunGateLogger", () => {
  let logger: BunGateLogger;

  beforeEach(() => {
    logger = createLogger();
  });

  test("should log info, debug, warn, error", () => {
    expect(() => logger.info("info message", { foo: "bar" })).not.toThrow();
    expect(() => logger.debug("debug message", { foo: "bar" })).not.toThrow();
    expect(() => logger.warn("warn message", { foo: "bar" })).not.toThrow();
    expect(() => logger.error("error message", new Error("fail"), { foo: "bar" })).not.toThrow();
    expect(() => logger.error({ foo: "bar" }, "error object message")).not.toThrow();
  });

  test("should log requests with and without response", () => {
    const req = new Request("http://test.com/api", { method: "POST", headers: { "user-agent": "bun-test" } });
    expect(() => logger.logRequest(req)).not.toThrow();
    const res = new Response("ok", { status: 201, headers: { "content-type": "text/plain" } });
    expect(() => logger.logRequest(req, res, 123)).not.toThrow();
  });

  test("should log metrics", () => {
    expect(() => logger.logMetrics("cache", "set", 42, { key: "foo" })).not.toThrow();
  });

  test("should log health checks (healthy/unhealthy)", () => {
    expect(() => logger.logHealthCheck("target1", true, 10)).not.toThrow();
    expect(() => logger.logHealthCheck("target2", false, 20, new Error("unhealthy"))).not.toThrow();
  });

  test("should log load balancing", () => {
    expect(() => logger.logLoadBalancing("round-robin", "http://target", { extra: 1 })).not.toThrow();
  });

  test("should support child loggers and level changes", () => {
    const child = logger.child({ service: "child" });
    expect(child).toBeTruthy();
    child.setLevel("warn");
    expect(child.getLevel()).toBe("warn");
  });

  test("should respect config flags for request logging and metrics", () => {
    const noReqLogger = createLogger({ enableRequestLogging: false });
    const req = new Request("http://test.com");
    expect(() => noReqLogger.logRequest(req)).not.toThrow(); // should not log

    const noMetricsLogger = createLogger({ enableMetrics: false });
    expect(() => noMetricsLogger.logMetrics("cache", "get", 1)).not.toThrow(); // should not log
  });
});
