/**
 * Supabase-based database client — fallback when Prisma can't connect
 * (e.g. Supabase pooler hasn't synced credentials yet).
 *
 * Uses the PostgREST API with the service_role key to bypass RLS.
 * Only covers the operations needed for auth + demo-login.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

let _adminClient: SupabaseClient | null = null

function getAdminClient(): SupabaseClient {
  if (!_adminClient) {
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL not configured')
    }
    _adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      db: { schema: 'public' },
      global: {
        headers: {
          'Accept-Profile': 'public',
        },
      },
    })
  }
  return _adminClient
}

// ─── User operations ────────────────────────────────────────

export interface SupabaseUser {
  id: string
  email: string
  name: string
  image: string | null
  password: string | null
  role: string
  avatarUrl: string | null
  workspaceId: string | null
  isActive: boolean
  lastSeenAt: string | null
  emailVerified: string | null
  createdAt: string
  updatedAt: string
}

export async function findUserByEmail(email: string): Promise<SupabaseUser | null> {
  const { data, error } = await getAdminClient()
    .from('users')
    .select('*')
    .eq('email', email)
    .maybeSingle()

  if (error) {
    console.error('[db-supabase] findUserByEmail error:', error.message, error.code, error.details)
    throw new Error(`Supabase findUserByEmail error: ${error.message} (code: ${error.code})`)
  }
  return data as SupabaseUser | null
}

export async function findUserById(id: string): Promise<SupabaseUser | null> {
  const { data, error } = await getAdminClient()
    .from('users')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('[db-supabase] findUserById error:', error.message)
    return null
  }
  return data as SupabaseUser | null
}

export async function createUser(userData: Omit<SupabaseUser, 'id' | 'createdAt' | 'updatedAt'>): Promise<SupabaseUser | null> {
  const { data, error } = await getAdminClient()
    .from('users')
    .insert(userData as any)
    .select()
    .single()

  if (error) {
    console.error('[db-supabase] createUser error:', error.message)
    return null
  }
  return data as SupabaseUser
}

export async function updateUser(id: string, updates: Partial<SupabaseUser>): Promise<SupabaseUser | null> {
  const { data, error } = await getAdminClient()
    .from('users')
    .update(updates as any)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('[db-supabase] updateUser error:', error.message)
    return null
  }
  return data as SupabaseUser
}

// ─── Workspace operations ───────────────────────────────────

export interface SupabaseWorkspace {
  id: string
  name: string
  slug: string
  plan: string
  settings: string
  createdAt: string
  updatedAt: string
}

export async function findWorkspaceBySlug(slug: string): Promise<SupabaseWorkspace | null> {
  const { data, error } = await getAdminClient()
    .from('workspaces')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  if (error) {
    console.error('[db-supabase] findWorkspaceBySlug error:', error.message)
    return null
  }
  return data as SupabaseWorkspace | null
}

export async function createWorkspace(wsData: Omit<SupabaseWorkspace, 'id' | 'createdAt' | 'updatedAt'>): Promise<SupabaseWorkspace | null> {
  const { data, error } = await getAdminClient()
    .from('workspaces')
    .insert(wsData as any)
    .select()
    .single()

  if (error) {
    console.error('[db-supabase] createWorkspace error:', error.message)
    return null
  }
  return data as SupabaseWorkspace
}

// ─── WorkspaceMember operations ─────────────────────────────

export interface SupabaseWorkspaceMember {
  id: string
  userId: string
  workspaceId: string
  role: string
  invitedAt: string
  acceptedAt: string | null
  isActive: boolean
}

export async function findWorkspaceMember(userId: string, workspaceId: string): Promise<SupabaseWorkspaceMember | null> {
  const { data, error } = await getAdminClient()
    .from('workspace_members')
    .select('*')
    .eq('userId', userId)
    .eq('workspaceId', workspaceId)
    .maybeSingle()

  if (error) {
    console.error('[db-supabase] findWorkspaceMember error:', error.message)
    return null
  }
  return data as SupabaseWorkspaceMember | null
}

export async function createWorkspaceMember(memberData: Omit<SupabaseWorkspaceMember, 'id'>): Promise<SupabaseWorkspaceMember | null> {
  const { data, error } = await getAdminClient()
    .from('workspace_members')
    .insert(memberData as any)
    .select()
    .single()

  if (error) {
    console.error('[db-supabase] createWorkspaceMember error:', error.message)
    return null
  }
  return data as SupabaseWorkspaceMember
}

export async function findFirstWorkspaceForUser(userId: string): Promise<(SupabaseWorkspaceMember & { workspace: SupabaseWorkspace }) | null> {
  const { data, error } = await getAdminClient()
    .from('workspace_members')
    .select('*, workspace:workspaces(*)')
    .eq('userId', userId)
    .eq('isActive', true)
    .order('invitedAt', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[db-supabase] findFirstWorkspaceForUser error:', error.message)
    return null
  }
  return data as any
}

// ─── Account operations (for NextAuth) ──────────────────────

export interface SupabaseAccount {
  id: string
  userId: string
  type: string
  provider: string
  providerAccountId: string
  refresh_token: string | null
  access_token: string | null
  expires_at: number | null
  token_type: string | null
  scope: string | null
  id_token: string | null
  session_state: string | null
  oauth_token_secret: string | null
  oauth_token: string | null
}

export async function findAccountByProvider(provider: string, providerAccountId: string): Promise<(SupabaseAccount & { user: SupabaseUser }) | null> {
  const { data, error } = await getAdminClient()
    .from('accounts')
    .select('*, user:users(*)')
    .eq('provider', provider)
    .eq('providerAccountId', providerAccountId)
    .maybeSingle()

  if (error) {
    console.error('[db-supabase] findAccountByProvider error:', error.message)
    return null
  }
  return data as any
}

// ─── Session operations (for NextAuth) ──────────────────────

export interface SupabaseSession {
  id: string
  sessionToken: string
  userId: string
  expires: string
}

export async function findSessionByToken(sessionToken: string): Promise<(SupabaseSession & { user: SupabaseUser }) | null> {
  const { data, error } = await getAdminClient()
    .from('sessions')
    .select('*, user:users(*)')
    .eq('sessionToken', sessionToken)
    .maybeSingle()

  if (error) {
    console.error('[db-supabase] findSessionByToken error:', error.message)
    return null
  }
  return data as any
}

export async function createSession(sessionData: Omit<SupabaseSession, 'id'>): Promise<SupabaseSession | null> {
  const { data, error } = await getAdminClient()
    .from('sessions')
    .insert(sessionData as any)
    .select()
    .single()

  if (error) {
    console.error('[db-supabase] createSession error:', error.message)
    return null
  }
  return data as SupabaseSession
}

export async function updateSession(sessionToken: string, updates: Partial<SupabaseSession>): Promise<SupabaseSession | null> {
  const { data, error } = await getAdminClient()
    .from('sessions')
    .update(updates as any)
    .eq('sessionToken', sessionToken)
    .select()
    .single()

  if (error) {
    console.error('[db-supabase] updateSession error:', error.message)
    return null
  }
  return data as SupabaseSession
}

export async function deleteSession(sessionToken: string): Promise<boolean> {
  const { error } = await getAdminClient()
    .from('sessions')
    .delete()
    .eq('sessionToken', sessionToken)

  if (error) {
    console.error('[db-supabase] deleteSession error:', error.message)
    return false
  }
  return true
}

// ─── Raw fetch test (debug) ────────────────────────────────

export async function rawFetchTest(): Promise<{success: boolean, detail: string}> {
  try {
    const url = supabaseUrl + '/rest/v1/users?select=id&limit=1'
    const res = await fetch(url, {
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': 'Bearer ' + serviceRoleKey,
        'Accept-Profile': 'public',
      },
    })
    const text = await res.text()
    return { success: res.ok, detail: text.substring(0, 200) }
  } catch (err: any) {
    return { success: false, detail: err.message }
  }
}

// ─── Health check ───────────────────────────────────────────

export async function isDatabaseReachable(): Promise<boolean> {
  try {
    const { error } = await getAdminClient()
      .from('users')
      .select('id')
      .limit(1)
    return !error
  } catch {
    return false
  }
}
