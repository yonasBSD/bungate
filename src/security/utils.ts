/**
 * Security utility functions
 */

import { randomBytes } from 'crypto'

/**
 * Calculates the entropy (in bits) of a given string
 * Uses Shannon entropy formula
 */
export function calculateEntropy(str: string): number {
  if (!str || str.length === 0) {
    return 0
  }

  const frequencies = new Map<string, number>()

  // Count character frequencies
  for (const char of str) {
    frequencies.set(char, (frequencies.get(char) || 0) + 1)
  }

  // Calculate Shannon entropy
  let entropy = 0
  const length = str.length

  for (const count of frequencies.values()) {
    const probability = count / length
    entropy -= probability * Math.log2(probability)
  }

  // Return total entropy in bits
  return entropy * length
}

/**
 * Validates that a string has minimum entropy
 */
export function hasMinimumEntropy(str: string, minBits: number): boolean {
  return calculateEntropy(str) >= minBits
}

/**
 * Generates a cryptographically secure random string
 */
export function generateSecureRandom(bytes: number = 32): string {
  return randomBytes(bytes).toString('hex')
}

/**
 * Generates a cryptographically secure random string with specific entropy
 */
export function generateSecureRandomWithEntropy(entropyBits: number): string {
  const bytes = Math.ceil(entropyBits / 8)
  return randomBytes(bytes).toString('hex')
}

/**
 * Sanitizes a path to prevent directory traversal attacks
 */
export function sanitizePath(path: string): string {
  if (!path) {
    return '/'
  }

  // Remove null bytes
  let sanitized = path.replace(/\0/g, '')

  // Decode URL encoding
  try {
    sanitized = decodeURIComponent(sanitized)
  } catch {
    // If decoding fails, use original
  }

  // Remove directory traversal patterns
  sanitized = sanitized.replace(/\.\./g, '')
  sanitized = sanitized.replace(/\/\//g, '/')

  // Ensure path starts with /
  if (!sanitized.startsWith('/')) {
    sanitized = '/' + sanitized
  }

  // Remove trailing slash (except for root)
  if (sanitized.length > 1 && sanitized.endsWith('/')) {
    sanitized = sanitized.slice(0, -1)
  }

  return sanitized
}

/**
 * Sanitizes a header value
 */
export function sanitizeHeader(value: string): string {
  if (!value) {
    return ''
  }

  // Remove control characters and null bytes
  return value.replace(/[\x00-\x1F\x7F]/g, '')
}

/**
 * Validates if a string contains only allowed characters
 */
export function containsOnlyAllowedChars(
  str: string,
  pattern: RegExp,
): boolean {
  return pattern.test(str)
}

/**
 * Checks if a string matches any blocked patterns
 */
export function matchesBlockedPattern(
  str: string,
  patterns: RegExp[],
): boolean {
  return patterns.some((pattern) => pattern.test(str))
}

/**
 * Sanitizes an error message for production
 */
export function sanitizeErrorMessage(
  error: Error,
  production: boolean,
): string {
  if (!production) {
    return error.message
  }

  // Return generic message in production
  return 'An error occurred while processing your request'
}

/**
 * Generates a unique request ID
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${generateSecureRandom(8)}`
}

/**
 * Validates IP address format (IPv4 or IPv6)
 */
export function isValidIP(ip: string): boolean {
  // IPv4 pattern
  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/

  // IPv6 pattern (simplified)
  const ipv6Pattern = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/

  if (ipv4Pattern.test(ip)) {
    // Validate IPv4 octets are 0-255
    const octets = ip.split('.')
    return octets.every((octet) => {
      const num = parseInt(octet, 10)
      return num >= 0 && num <= 255
    })
  }

  return ipv6Pattern.test(ip)
}

/**
 * Parses CIDR notation and checks if IP is in range
 */
export function isIPInCIDR(ip: string, cidr: string): boolean {
  const [network, prefixLength] = cidr.split('/')

  if (!network) {
    return false
  }

  if (!prefixLength) {
    // No CIDR notation, exact match
    return ip === network
  }

  // Only support IPv4 CIDR for now
  if (!network.includes('.')) {
    return false
  }

  const ipNum = ipToNumber(ip)
  const networkNum = ipToNumber(network)
  const prefix = parseInt(prefixLength, 10)

  if (isNaN(prefix) || prefix < 0 || prefix > 32) {
    return false
  }

  const mask = ~((1 << (32 - prefix)) - 1)

  return (ipNum & mask) === (networkNum & mask)
}

/**
 * Converts IPv4 address to number
 */
function ipToNumber(ip: string): number {
  const octets = ip.split('.')
  if (octets.length !== 4) {
    return 0
  }

  return (
    octets.reduce((acc, octet) => {
      return (acc << 8) + parseInt(octet, 10)
    }, 0) >>> 0
  ) // Unsigned right shift to ensure positive number
}

/**
 * Safely parses JSON with error handling
 */
export function safeJSONParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T
  } catch {
    return fallback
  }
}

/**
 * Redacts sensitive information from objects
 */
export function redactSensitiveData(
  obj: any,
  sensitiveKeys: string[] = [
    'password',
    'secret',
    'token',
    'key',
    'authorization',
  ],
): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => redactSensitiveData(item, sensitiveKeys))
  }

  const redacted: any = {}

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase()
    const isSensitive = sensitiveKeys.some((sk) =>
      lowerKey.includes(sk.toLowerCase()),
    )

    if (isSensitive) {
      redacted[key] = '[REDACTED]'
    } else if (typeof value === 'object' && value !== null) {
      redacted[key] = redactSensitiveData(value, sensitiveKeys)
    } else {
      redacted[key] = value
    }
  }

  return redacted
}

/**
 * Creates a timing-safe string comparison
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }

  return result === 0
}

/**
 * Validates URL format
 */
export function isValidURL(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * Extracts domain from URL
 */
export function extractDomain(url: string): string | null {
  try {
    const parsed = new URL(url)
    return parsed.hostname
  } catch {
    return null
  }
}
