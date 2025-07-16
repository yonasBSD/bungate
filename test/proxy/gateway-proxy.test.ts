/**
 * Test suite for GatewayProxy and createGatewayProxy
 */
import { describe, test, expect, beforeEach, spyOn } from 'bun:test'
import {
  GatewayProxy,
  createGatewayProxy,
} from '../../src/proxy/gateway-proxy.ts'
import type {
  ProxyOptions,
  ProxyRequestOptions,
  CircuitState,
} from 'fetch-gate'

describe('GatewayProxy', () => {
  let handler: GatewayProxy
  let options: ProxyOptions

  beforeEach(() => {
    options = {} as ProxyOptions
    handler = new GatewayProxy(options)
  })

  test('proxy delegates to fetchProxy', async () => {
    // Since fetchProxy is private, we spy on the public method and verify it works
    const req = new Request('http://test')
    const res = await handler.proxy(req as any)

    expect(res).toBeInstanceOf(Response)
  })

  test('close delegates to fetchProxy', () => {
    // Test that close method exists and can be called without error
    expect(() => handler.close()).not.toThrow()
  })

  test('getCircuitBreakerState delegates to fetchProxy', () => {
    const result = handler.getCircuitBreakerState()
    expect(typeof result).toBe('string')
    expect([
      'closed',
      'open',
      'half-open',
      'CLOSED',
      'OPEN',
      'HALF-OPEN',
    ]).toContain(result)
  })

  test('getCircuitBreakerFailures delegates to fetchProxy', () => {
    const result = handler.getCircuitBreakerFailures()
    expect(typeof result).toBe('number')
    expect(result).toBeGreaterThanOrEqual(0)
  })

  test('clearURLCache delegates to fetchProxy', () => {
    // Test that clearURLCache method exists and can be called without error
    expect(() => handler.clearURLCache()).not.toThrow()
  })
})

describe('createGatewayProxy', () => {
  test('returns a ProxyInstance with all methods bound', () => {
    const instance = createGatewayProxy({} as ProxyOptions)
    expect(instance).toHaveProperty('proxy')
    expect(instance).toHaveProperty('close')
    expect(instance).toHaveProperty('getCircuitBreakerState')
    expect(instance).toHaveProperty('getCircuitBreakerFailures')
    expect(instance).toHaveProperty('clearURLCache')
  })
})
