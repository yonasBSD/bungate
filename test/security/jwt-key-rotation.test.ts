import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { JWTKeyRotationManager } from '../../src/security/jwt-key-rotation'
import type { JWTKeyConfig } from '../../src/security/config'

describe('JWTKeyRotationManager', () => {
  let manager: JWTKeyRotationManager

  afterEach(() => {
    if (manager) {
      manager.destroy()
    }
  })

  describe('constructor and validation', () => {
    test('should create JWTKeyRotationManager instance', () => {
      const config: JWTKeyConfig = {
        secrets: [
          { key: 'test-secret-key', algorithm: 'HS256', primary: true },
        ],
      }
      manager = new JWTKeyRotationManager(config)
      expect(manager).toBeDefined()
      expect(manager).toBeInstanceOf(JWTKeyRotationManager)
    })

    test('should throw error if no secrets configured', () => {
      expect(() => {
        new JWTKeyRotationManager({ secrets: [] })
      }).toThrow('At least one JWT secret must be configured')
    })

    test('should throw error if multiple primary keys configured', () => {
      const config: JWTKeyConfig = {
        secrets: [
          { key: 'key1', algorithm: 'HS256', primary: true },
          { key: 'key2', algorithm: 'HS256', primary: true },
        ],
      }
      expect(() => {
        new JWTKeyRotationManager(config)
      }).toThrow('Only one primary key can be configured')
    })

    test('should auto-assign first key as primary if none specified', () => {
      const config: JWTKeyConfig = {
        secrets: [
          { key: 'key1', algorithm: 'HS256' },
          { key: 'key2', algorithm: 'HS256' },
        ],
      }
      manager = new JWTKeyRotationManager(config)
      const primaryKey = manager.getPrimaryKey()
      expect(primaryKey.key).toBe('key1')
    })

    test('should throw error for invalid algorithm', () => {
      const config: JWTKeyConfig = {
        secrets: [{ key: 'test-key', algorithm: 'INVALID' as any }],
      }
      expect(() => {
        new JWTKeyRotationManager(config)
      }).toThrow('Invalid algorithm')
    })

    test('should accept valid algorithms', () => {
      const algorithms = [
        'HS256',
        'HS384',
        'HS512',
        'RS256',
        'RS384',
        'RS512',
        'ES256',
        'ES384',
        'ES512',
      ]

      for (const algorithm of algorithms) {
        const config: JWTKeyConfig = {
          secrets: [{ key: 'test-key', algorithm, primary: true }],
        }
        const mgr = new JWTKeyRotationManager(config)
        expect(mgr).toBeDefined()
        mgr.destroy()
      }
    })
  })

  describe('getPrimaryKey', () => {
    test('should return the primary key', () => {
      const config: JWTKeyConfig = {
        secrets: [
          { key: 'old-key', algorithm: 'HS256' },
          { key: 'new-key', algorithm: 'HS256', primary: true },
        ],
      }
      manager = new JWTKeyRotationManager(config)
      const primaryKey = manager.getPrimaryKey()
      expect(primaryKey.key).toBe('new-key')
      expect(primaryKey.primary).toBe(true)
    })

    test('should return first key if no primary specified', () => {
      const config: JWTKeyConfig = {
        secrets: [
          { key: 'first-key', algorithm: 'HS256' },
          { key: 'second-key', algorithm: 'HS256' },
        ],
      }
      manager = new JWTKeyRotationManager(config)
      const primaryKey = manager.getPrimaryKey()
      expect(primaryKey.key).toBe('first-key')
    })
  })

  describe('signToken', () => {
    test('should sign a token with primary key', async () => {
      const config: JWTKeyConfig = {
        secrets: [
          { key: 'test-secret-key', algorithm: 'HS256', primary: true },
        ],
      }
      manager = new JWTKeyRotationManager(config)

      const payload = { userId: '123', role: 'admin' }
      const token = await manager.signToken(payload)

      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.split('.')).toHaveLength(3) // JWT has 3 parts
    })

    test('should sign token with expiration', async () => {
      const config: JWTKeyConfig = {
        secrets: [
          { key: 'test-secret-key', algorithm: 'HS256', primary: true },
        ],
      }
      manager = new JWTKeyRotationManager(config)

      const payload = { userId: '123' }
      const token = await manager.signToken(payload, { expiresIn: 3600 })

      expect(token).toBeDefined()

      // Verify the token contains expiration
      const result = await manager.verifyToken(token)
      expect(result.payload.exp).toBeDefined()
    })

    test('should include kid in header if specified', async () => {
      const config: JWTKeyConfig = {
        secrets: [
          {
            key: 'test-secret-key',
            algorithm: 'HS256',
            primary: true,
            kid: 'key-2024-01',
          },
        ],
      }
      manager = new JWTKeyRotationManager(config)

      const token = await manager.signToken({ userId: '123' })
      const result = await manager.verifyToken(token)

      expect(result.protectedHeader.kid).toBe('key-2024-01')
    })
  })

  describe('verifyToken - single secret', () => {
    test('should verify a valid token', async () => {
      const config: JWTKeyConfig = {
        secrets: [
          { key: 'test-secret-key', algorithm: 'HS256', primary: true },
        ],
      }
      manager = new JWTKeyRotationManager(config)

      const payload = { userId: '123', role: 'admin' }
      const token = await manager.signToken(payload)

      const result = await manager.verifyToken(token)
      expect(result.payload.userId).toBe('123')
      expect(result.payload.role).toBe('admin')
      expect(result.usedDeprecatedKey).toBeUndefined()
    })

    test('should reject invalid token', async () => {
      const config: JWTKeyConfig = {
        secrets: [
          { key: 'test-secret-key', algorithm: 'HS256', primary: true },
        ],
      }
      manager = new JWTKeyRotationManager(config)

      const invalidToken = 'invalid.token.here'

      await expect(manager.verifyToken(invalidToken)).rejects.toThrow()
    })

    test('should reject token signed with different key', async () => {
      const config1: JWTKeyConfig = {
        secrets: [{ key: 'key1', algorithm: 'HS256', primary: true }],
      }
      const manager1 = new JWTKeyRotationManager(config1)
      const token = await manager1.signToken({ userId: '123' })
      manager1.destroy()

      const config2: JWTKeyConfig = {
        secrets: [{ key: 'key2', algorithm: 'HS256', primary: true }],
      }
      manager = new JWTKeyRotationManager(config2)

      await expect(manager.verifyToken(token)).rejects.toThrow()
    })
  })

  describe('verifyToken - multiple secrets', () => {
    test('should verify token with any configured secret', async () => {
      const config: JWTKeyConfig = {
        secrets: [
          { key: 'new-key', algorithm: 'HS256', primary: true },
          { key: 'old-key', algorithm: 'HS256', deprecated: true },
        ],
      }
      manager = new JWTKeyRotationManager(config)

      // Create a token with the old key
      const oldConfig: JWTKeyConfig = {
        secrets: [{ key: 'old-key', algorithm: 'HS256', primary: true }],
      }
      const oldManager = new JWTKeyRotationManager(oldConfig)
      const token = await oldManager.signToken({ userId: '123' })
      oldManager.destroy()

      // Should verify with new manager that has old key as deprecated
      const result = await manager.verifyToken(token)
      expect(result.payload.userId).toBe('123')
      expect(result.usedDeprecatedKey).toBe(true)
    })

    test('should try secrets in order', async () => {
      const config: JWTKeyConfig = {
        secrets: [
          { key: 'key1', algorithm: 'HS256', primary: true },
          { key: 'key2', algorithm: 'HS256' },
          { key: 'key3', algorithm: 'HS256' },
        ],
      }
      manager = new JWTKeyRotationManager(config)

      // Create token with key3
      const key3Config: JWTKeyConfig = {
        secrets: [{ key: 'key3', algorithm: 'HS256', primary: true }],
      }
      const key3Manager = new JWTKeyRotationManager(key3Config)
      const token = await key3Manager.signToken({ userId: '123' })
      key3Manager.destroy()

      // Should still verify
      const result = await manager.verifyToken(token)
      expect(result.payload.userId).toBe('123')
    })

    test('should log warning when deprecated key is used', async () => {
      const logs: any[] = []
      const logger = (message: string, meta?: any) => {
        logs.push({ message, meta })
      }

      const config: JWTKeyConfig = {
        secrets: [
          { key: 'new-key', algorithm: 'HS256', primary: true },
          {
            key: 'old-key',
            algorithm: 'HS256',
            deprecated: true,
            kid: 'old-key-id',
          },
        ],
      }
      manager = new JWTKeyRotationManager(config, logger)

      // Create token with old key
      const oldConfig: JWTKeyConfig = {
        secrets: [{ key: 'old-key', algorithm: 'HS256', primary: true }],
      }
      const oldManager = new JWTKeyRotationManager(oldConfig)
      const token = await oldManager.signToken({ userId: '123' })
      oldManager.destroy()

      await manager.verifyToken(token)

      expect(logs.length).toBeGreaterThan(0)
      expect(logs[0].message).toContain('deprecated')
    })

    test('should skip expired keys during verification', async () => {
      const config: JWTKeyConfig = {
        secrets: [
          { key: 'new-key', algorithm: 'HS256', primary: true },
          {
            key: 'expired-key',
            algorithm: 'HS256',
            expiresAt: Date.now() - 1000,
          },
        ],
      }
      manager = new JWTKeyRotationManager(config)

      // Create token with expired key
      const expiredConfig: JWTKeyConfig = {
        secrets: [{ key: 'expired-key', algorithm: 'HS256', primary: true }],
      }
      const expiredManager = new JWTKeyRotationManager(expiredConfig)
      const token = await expiredManager.signToken({ userId: '123' })
      expiredManager.destroy()

      // Should fail because expired key is skipped
      await expect(manager.verifyToken(token)).rejects.toThrow()
    })
  })

  describe('rotateKeys', () => {
    test('should mark current primary as deprecated', () => {
      const config: JWTKeyConfig = {
        secrets: [{ key: 'current-key', algorithm: 'HS256', primary: true }],
        gracePeriod: 86400000, // 24 hours
      }
      manager = new JWTKeyRotationManager(config)

      const beforeRotation = manager.getPrimaryKey()
      expect(beforeRotation.deprecated).toBeUndefined()

      manager.rotateKeys()

      expect(beforeRotation.deprecated).toBe(true)
      expect(beforeRotation.primary).toBe(false)
      expect(beforeRotation.expiresAt).toBeDefined()
    })

    test('should set expiration based on grace period', () => {
      const gracePeriod = 3600000 // 1 hour
      const config: JWTKeyConfig = {
        secrets: [{ key: 'current-key', algorithm: 'HS256', primary: true }],
        gracePeriod,
      }
      manager = new JWTKeyRotationManager(config)

      const beforeTime = Date.now()
      manager.rotateKeys()
      const afterTime = Date.now()

      const primaryKey = config.secrets[0]
      expect(primaryKey).toBeDefined()
      expect(primaryKey!.expiresAt).toBeDefined()
      expect(primaryKey!.expiresAt!).toBeGreaterThanOrEqual(
        beforeTime + gracePeriod,
      )
      expect(primaryKey!.expiresAt!).toBeLessThanOrEqual(
        afterTime + gracePeriod,
      )
    })

    test('should log rotation event', () => {
      const logs: any[] = []
      const logger = (message: string, meta?: any) => {
        logs.push({ message, meta })
      }

      const config: JWTKeyConfig = {
        secrets: [
          {
            key: 'current-key',
            algorithm: 'HS256',
            primary: true,
            kid: 'key-2024-01',
          },
        ],
        gracePeriod: 86400000,
      }
      manager = new JWTKeyRotationManager(config, logger)

      manager.rotateKeys()

      expect(logs.length).toBeGreaterThan(0)
      expect(logs[0].message).toContain('deprecated')
      expect(logs[0].meta.kid).toBe('key-2024-01')
    })
  })

  describe('cleanupExpiredKeys', () => {
    test('should remove expired keys', () => {
      const config: JWTKeyConfig = {
        secrets: [
          { key: 'current-key', algorithm: 'HS256', primary: true },
          {
            key: 'expired-key',
            algorithm: 'HS256',
            expiresAt: Date.now() - 1000,
          },
        ],
      }
      manager = new JWTKeyRotationManager(config)

      expect(config.secrets.length).toBe(2)

      manager.cleanupExpiredKeys()

      expect(config.secrets.length).toBe(1)
      expect(config.secrets[0]?.key).toBe('current-key')
    })

    test('should keep non-expired keys', () => {
      const config: JWTKeyConfig = {
        secrets: [
          { key: 'current-key', algorithm: 'HS256', primary: true },
          {
            key: 'future-key',
            algorithm: 'HS256',
            expiresAt: Date.now() + 86400000,
          },
        ],
      }
      manager = new JWTKeyRotationManager(config)

      manager.cleanupExpiredKeys()

      expect(config.secrets.length).toBe(2)
    })

    test('should log cleanup events', () => {
      const logs: any[] = []
      const logger = (message: string, meta?: any) => {
        logs.push({ message, meta })
      }

      const config: JWTKeyConfig = {
        secrets: [
          { key: 'current-key', algorithm: 'HS256', primary: true },
          {
            key: 'expired-key-1',
            algorithm: 'HS256',
            expiresAt: Date.now() - 1000,
            kid: 'exp-1',
          },
          {
            key: 'expired-key-2',
            algorithm: 'HS256',
            expiresAt: Date.now() - 2000,
            kid: 'exp-2',
          },
        ],
      }
      manager = new JWTKeyRotationManager(config, logger)

      manager.cleanupExpiredKeys()

      expect(logs.length).toBeGreaterThan(0)
      const cleanupLog = logs.find((log) => log.message.includes('Cleaned up'))
      expect(cleanupLog).toBeDefined()
      expect(cleanupLog.meta.count).toBe(2)
    })
  })

  describe('key rotation without downtime', () => {
    test('should support seamless key rotation', async () => {
      // Start with old key
      const config: JWTKeyConfig = {
        secrets: [{ key: 'old-key', algorithm: 'HS256', primary: true }],
        gracePeriod: 86400000,
      }
      manager = new JWTKeyRotationManager(config)

      // Create token with old key
      const oldToken = await manager.signToken({ userId: '123' })

      // Add new key and rotate
      config.secrets.push({ key: 'new-key', algorithm: 'HS256', primary: true })
      manager.rotateKeys()

      // Old token should still verify
      const oldResult = await manager.verifyToken(oldToken)
      expect(oldResult.payload.userId).toBe('123')
      expect(oldResult.usedDeprecatedKey).toBe(true)

      // New tokens should use new key
      const newToken = await manager.signToken({ userId: '456' })
      const newResult = await manager.verifyToken(newToken)
      expect(newResult.payload.userId).toBe('456')
      expect(newResult.usedDeprecatedKey).toBeUndefined()
    })

    test('should handle multiple rotation cycles', async () => {
      const config: JWTKeyConfig = {
        secrets: [{ key: 'key-v1', algorithm: 'HS256', primary: true }],
        gracePeriod: 86400000,
      }
      manager = new JWTKeyRotationManager(config)

      const token1 = await manager.signToken({ version: 1 })

      // First rotation
      config.secrets.push({ key: 'key-v2', algorithm: 'HS256', primary: true })
      manager.rotateKeys()
      const token2 = await manager.signToken({ version: 2 })

      // Second rotation
      config.secrets.push({ key: 'key-v3', algorithm: 'HS256', primary: true })
      manager.rotateKeys()
      const token3 = await manager.signToken({ version: 3 })

      // All tokens should still verify
      const result1 = await manager.verifyToken(token1)
      expect(result1.payload.version).toBe(1)

      const result2 = await manager.verifyToken(token2)
      expect(result2.payload.version).toBe(2)

      const result3 = await manager.verifyToken(token3)
      expect(result3.payload.version).toBe(3)
    })
  })

  describe('destroy', () => {
    test('should stop JWKS refresh timer', () => {
      const config: JWTKeyConfig = {
        secrets: [{ key: 'test-key', algorithm: 'HS256', primary: true }],
        jwksUri: 'https://example.com/.well-known/jwks.json',
        jwksRefreshInterval: 3600000,
      }
      manager = new JWTKeyRotationManager(config)

      expect(() => manager.destroy()).not.toThrow()
    })

    test('should be safe to call multiple times', () => {
      const config: JWTKeyConfig = {
        secrets: [{ key: 'test-key', algorithm: 'HS256', primary: true }],
      }
      manager = new JWTKeyRotationManager(config)

      manager.destroy()
      expect(() => manager.destroy()).not.toThrow()
    })
  })
})
