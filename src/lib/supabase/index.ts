// ============================================================
// SUPABASE — Central exports for all Supabase client types
// ============================================================
// Project: fnqhxtqkjbawajmollfg
// Used for: Auth, Storage, Realtime (client-side features)
// Database operations should use Prisma via `@/lib/db` instead.
//
// Three client types are available:
// 1. Browser client   → useSupabaseBrowser()  — for Client Components
// 2. Server client    → createSupabaseServerClient() — for Server Components
// 3. Middleware client → updateSession() — for middleware session refresh
// ============================================================

// Re-export the shadcn-generated clients for convenience
export { createClient as useSupabaseBrowser } from './client'
export { createClient as createSupabaseServerClient } from './server'
export { updateSession } from './middleware'

// Legacy browser singleton (for backwards compatibility with existing code)
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ''

/**
 * @deprecated Use `useSupabaseBrowser()` from '@/lib/supabase' instead.
 * This singleton is kept for backwards compatibility.
 */
export const supabase: SupabaseClient | null = supabaseUrl && supabaseKey
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
 * Create a Supabase admin client with service role key.
 * Only use in API routes — never expose to the client.
 */
export function createSupabaseAdminClient(serviceRoleKey: string) {
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
  return !!(supabaseUrl && supabaseKey)
}
