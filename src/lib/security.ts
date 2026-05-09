// ============================================================
// SECURITY UTILITIES — Rate limiting, HMAC verification, etc.
// ============================================================

/**
 * Simple in-memory rate limiter for API routes.
 * Uses a sliding window counter per IP/key.
 * For production with multiple instances, use @upstash/ratelimit with Redis.
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

// Clean up expired entries every 60 seconds
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of rateLimitStore) {
      if (now > entry.resetAt) {
        rateLimitStore.delete(key)
      }
    }
  }, 60_000)
}

export interface RateLimitOptions {
  /** Maximum number of requests per window */
  limit: number
  /** Window duration in milliseconds */
  windowMs: number
}

/**
 * Check if a request should be rate limited.
 * Returns { allowed: true } if under the limit, { allowed: false, retryAfterMs } if over.
 */
export function checkRateLimit(
  key: string,
  options: RateLimitOptions = { limit: 10, windowMs: 60_000 }
): { allowed: boolean; retryAfterMs?: number; remaining?: number } {
  const now = Date.now()
  const entry = rateLimitStore.get(key)

  if (!entry || now > entry.resetAt) {
    // New window
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + options.windowMs,
    })
    return { allowed: true, remaining: options.limit - 1 }
  }

  if (entry.count >= options.limit) {
    const retryAfterMs = entry.resetAt - now
    return { allowed: false, retryAfterMs }
  }

  entry.count++
  return { allowed: true, remaining: options.limit - entry.count }
}

/**
 * Get client identifier from request (IP address or custom key).
 * Falls back to 'unknown' if headers are not available.
 */
export function getClientIdentifier(request: Request): string {
  // Try common headers for IP (Vercel, Cloudflare, etc.)
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }
  return 'unknown'
}

// ============================================================
// HMAC Signature Verification (WhatsApp Webhook)
// ============================================================

/**
 * Verify the X-Hub-Signature-256 header from Meta webhooks.
 * Meta signs every POST payload with HMAC-SHA256 using your App Secret.
 *
 * @param payload - Raw request body as string
 * @param signature - Value of X-Hub-Signature-256 header (format: "sha256=<hex>")
 * @param appSecret - Your Meta App Secret
 * @returns true if signature is valid
 */
export async function verifyMetaSignature(
  payload: string,
  signature: string | null,
  appSecret: string
): Promise<boolean> {
  if (!signature || !signature.startsWith('sha256=')) {
    return false
  }

  const expectedSignature = signature.slice(7) // Remove "sha256=" prefix

  // Use Web Crypto API (available in Edge Runtime / Node 18+)
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(appSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  const computedSignature = Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  // Timing-safe comparison
  return timingSafeEqual(computedSignature, expectedSignature)
}

/**
 * Timing-safe string comparison to prevent timing attacks.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still do a comparison to avoid leaking length info via timing
    b = a
  }
  let result = a.length ^ b.length
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

// ============================================================
// Prompt Sanitization (Anti-Prompt-Injection)
// ============================================================

/**
 * Sanitize user-provided text before injecting into LLM prompts.
 * Removes common prompt injection patterns and escapes special markers.
 */
export function sanitizeForPrompt(input: string): string {
  if (!input) return ''

  return input
    // Remove common injection markers
    .replace(/\[SYSTEM\]/gi, '[BLOCKED]')
    .replace(/\[INST\]/gi, '[BLOCKED]')
    .replace(/\[\/INST\]/gi, '[BLOCKED]')
    .replace(/<<<SYS>>>/gi, '[BLOCKED]')
    .replace(/<<<\/SYS>>>/gi, '[BLOCKED]')
    .replace(/<\|im_start\|>/gi, '[BLOCKED]')
    .replace(/<\|im_end\|>/gi, '[BLOCKED]')
    // Remove common injection phrases (case-insensitive)
    .replace(/ignore\s+(previous|all|above|prior)\s+(instructions?|prompts?|rules?)/gi, '[BLOCKED]')
    .replace(/disregard\s+(previous|all|above|prior)\s+(instructions?|prompts?|rules?)/gi, '[BLOCKED]')
    .replace(/forget\s+(previous|all|above|prior)\s+(instructions?|prompts?|rules?)/gi, '[BLOCKED]')
    .replace(/you\s+are\s+now\s+/gi, '[BLOCKED] ')
    .replace(/new\s+instructions?:/gi, '[BLOCKED]')
    .replace(/override\s+(previous|all|default)\s+/gi, '[BLOCKED] ')
    .replace(/pretend\s+(you\s+are|to\s+be)/gi, '[BLOCKED] ')
    .replace(/act\s+as\s+(if|a|an|you)/gi, '[BLOCKED] ')
    .replace(/jailbreak/gi, '[BLOCKED]')
    .replace(/DAN\s+mode/gi, '[BLOCKED]')
    // Trim excessive whitespace
    .replace(/\s{3,}/g, ' ')
    .trim()
}

/**
 * Wrap user-provided content in clear delimiters for LLM prompts.
 * This helps the model distinguish between instructions and user data.
 */
export function wrapUserContent(content: string, label: string = 'DATO DEL NEGOCIO'): string {
  const sanitized = sanitizeForPrompt(content)
  return `\n<<<${label}_START>>>\n${sanitized}\n<<<${label}_END>>>\n`
}

// ============================================================
// NEXTAUTH_SECRET Validation
// ============================================================

const WEAK_SECRETS = new Set([
  'demo-secret-change-me',
  'change-me',
  'secret',
  'nextauth-secret',
  'replace-with-random-secret',
  'your-secret-here',
])

/**
 * Validate that NEXTAUTH_SECRET is strong enough for production.
 * Call this at startup or in middleware.
 */
export function validateNextAuthSecret(): { valid: boolean; reason?: string } {
  const secret = process.env.NEXTAUTH_SECRET

  if (!secret) {
    return { valid: false, reason: 'NEXTAUTH_SECRET is not set' }
  }

  if (WEAK_SECRETS.has(secret)) {
    return { valid: false, reason: `NEXTAUTH_SECRET is set to a known weak value: "${secret}"` }
  }

  if (secret.length < 32) {
    return { valid: false, reason: 'NEXTAUTH_SECRET must be at least 32 characters' }
  }

  return { valid: true }
}
