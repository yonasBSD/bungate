/**
 * Core security types and interfaces for Bungate security module
 */

/**
 * Validation result returned by security validators
 */
export interface ValidationResult {
  valid: boolean
  errors?: string[]
  sanitized?: string
}

/**
 * Input validation rules
 */
export interface ValidationRules {
  maxPathLength?: number
  maxHeaderSize?: number
  maxHeaderCount?: number
  allowedPathChars?: RegExp
  blockedPatterns?: RegExp[]
  sanitizeHeaders?: boolean
}

/**
 * Security context attached to each request
 */
export interface SecurityContext {
  requestId: string
  clientIP: string
  trustedProxy: boolean
  sessionId?: string
  csrfToken?: string
  validationErrors?: string[]
  securityWarnings?: string[]
}

/**
 * Security issue classification
 */
export interface SecurityIssue {
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  recommendation: string
}

/**
 * Error context for security logging
 */
export interface ErrorContext {
  requestId: string
  clientIP: string
  method: string
  url: string
  headers?: Record<string, string>
  timestamp: number
}

/**
 * Safe error response (sanitized)
 */
export interface SafeError {
  statusCode: number
  message: string
  requestId?: string
  timestamp: number
}

/**
 * Security log entry
 */
export interface SecurityLog {
  timestamp: number
  level: 'info' | 'warn' | 'error' | 'critical'
  category: string
  message: string
  context: SecurityContext
  metadata?: any
}

/**
 * Security metrics for monitoring
 */
export interface SecurityMetrics {
  tlsConnections: number
  validationFailures: number
  rateLimitHits: number
  csrfBlocks: number
  oversizedRequests: number
  suspiciousIPs: number
  jwtVerificationFailures: number
}
