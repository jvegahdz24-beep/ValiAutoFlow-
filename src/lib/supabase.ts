// ============================================================
// SUPABASE CLIENT — Browser & Server-side initialization
// ============================================================
// Project 2 (htbejkwhwkvzihaghmhn): Used for Auth, Storage, Realtime
// Project 1 (ffxppvsdunvsmotxkdiy): Used for PostgreSQL database (Prisma)
// ============================================================

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ''

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    '[Supabase] NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY not set. Auth/Storage/Realtime features disabled.'
  )
}

/**
 * Supabase client for browser-side usage (Auth, Storage, Realtime).
 * Database operations should use Prisma via `@/lib/db` instead.
 */
export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null

/**
 * Create a Supabase client with service role key for server-side admin operations.
 * Only use in API routes — never expose to the client.
 */
export function createServerSupabaseClient(serviceRoleKey: string) {
  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not configured')
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/**
 * Check if Supabase client is available and properly configured.
 */
export function isSupabaseConfigured(): boolean {
  return supabase !== null
}
