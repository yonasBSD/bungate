/**
 * Test suite for GatewayProxy and createGatewayProxy
 */
import { describe, test, expect, beforeEach } from "bun:test";
import { GatewayProxy, createGatewayProxy } from "../../src/proxy/gateway-proxy.ts";
import type { ProxyOptions, ProxyRequestOptions, CircuitState } from "fetch-gate";

// Manual mock for FetchProxy
class MockFetchProxy {
  called: Record<string, any[]> = {};
  proxy = async (...args: any[]) => {
    this.called.proxy = args;
    return new Response("ok");
  };
  close = (...args: any[]) => {
    this.called.close = args;
  };
  getCircuitBreakerState = (...args: any[]) => {
    this.called.getCircuitBreakerState = args;
    return "closed";
  };
  getCircuitBreakerFailures = (...args: any[]) => {
    this.called.getCircuitBreakerFailures = args;
    return 42;
  };
  clearURLCache = (...args: any[]) => {
    this.called.clearURLCache = args;
  };
}

describe("GatewayProxy", () => {
  let handler: GatewayProxy;
  let options: ProxyOptions;
  let mock: MockFetchProxy;

  beforeEach(() => {
    options = {} as ProxyOptions;
    mock = new MockFetchProxy();
    // @ts-ignore
    handler = new GatewayProxy(options);
    // @ts-ignore
    handler.fetchProxy = mock;
  });

  test("proxy delegates to fetchProxy", async () => {
    const req = new Request("http://test");
    const res = await handler.proxy(req as any);
    expect(mock.called.proxy).toBeTruthy();
    expect(res).toBeInstanceOf(Response);
  });

  test("close delegates to fetchProxy", () => {
    handler.close();
    expect(mock.called.close).toBeTruthy();
  });

  test("getCircuitBreakerState delegates to fetchProxy", () => {
    expect(handler.getCircuitBreakerState()).toBe("closed" as CircuitState);
    expect(mock.called.getCircuitBreakerState).toBeTruthy();
  });

  test("getCircuitBreakerFailures delegates to fetchProxy", () => {
    expect(handler.getCircuitBreakerFailures()).toBe(42);
    expect(mock.called.getCircuitBreakerFailures).toBeTruthy();
  });

  test("clearURLCache delegates to fetchProxy", () => {
    handler.clearURLCache();
    expect(mock.called.clearURLCache).toBeTruthy();
  });
});

describe("createGatewayProxy", () => {
  test("returns a ProxyInstance with all methods bound", () => {
    const instance = createGatewayProxy({} as ProxyOptions);
    expect(instance).toHaveProperty("proxy");
    expect(instance).toHaveProperty("close");
    expect(instance).toHaveProperty("getCircuitBreakerState");
    expect(instance).toHaveProperty("getCircuitBreakerFailures");
    expect(instance).toHaveProperty("clearURLCache");
  });
});
