/**
 * Supabase-based database client — fallback when Prisma can't connect
 * (e.g. Supabase pooler hasn't synced credentials yet).
 *
 * Uses the PostgREST API with the service_role key to bypass RLS.
 * Covers auth + demo-login + dashboard + critical routes.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''

/**
 * Get the service role key, supporting base64-encoded fallback.
 * Some hosting platforms (Vercel) may mangle JWT characters in env vars,
 * so we also accept SUPABASE_SERVICE_ROLE_KEY_B64 (base64-encoded).
 * 
 * IMPORTANT: This reads env vars at CALL TIME (not module load time)
 * to avoid stale cached values in serverless environments.
 */
function getServiceRoleKey(): string {
  const b64 = process.env.SUPABASE_SERVICE_ROLE_KEY_B64 || ''
  const raw = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

  // If base64 version is provided, decode it (takes priority)
  if (b64) {
    try {
      const decoded = Buffer.from(b64, 'base64').toString('utf-8')
      if (decoded.startsWith('eyJ')) {
        console.log('[db-supabase] Using B64-decoded service_role key, len:', decoded.length)
        return decoded
      }
    } catch (e: any) {
      console.error('[db-supabase] B64 decode failed:', e.message)
    }
  }

  return raw
}

let _adminClient: SupabaseClient | null = null
let _cachedKey = ''

function getAdminClient(): SupabaseClient {
  const serviceRoleKey = getServiceRoleKey()
  
  // Recreate client if key changed (e.g. after env var update)
  if (!_adminClient || _cachedKey !== serviceRoleKey) {
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL not configured')
    }
    console.log('[db-supabase] Creating admin client, key len:', serviceRoleKey.length, 'url:', supabaseUrl)
    _adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      db: { schema: 'public' },
      global: {
        headers: {
          'Accept-Profile': 'public',
        },
      },
    })
    _cachedKey = serviceRoleKey
  }
  return _adminClient
}

// ─── Prisma reachability cache ──────────────────────────────

let _prismaReachable: boolean | null = null
let _prismaCheckTime = 0
const PRISMA_CHECK_INTERVAL = 60_000 // 60 seconds

/**
 * Check if Prisma can connect. Caches result for 60 seconds.
 */
export async function isPrismaReachable(): Promise<boolean> {
  const now = Date.now()
  if (_prismaReachable !== null && (now - _prismaCheckTime) < PRISMA_CHECK_INTERVAL) {
    return _prismaReachable
  }
  try {
    const { db } = await import('@/lib/db')
    await db.$queryRaw`SELECT 1`
    _prismaReachable = true
    _prismaCheckTime = now
    return true
  } catch {
    _prismaReachable = false
    _prismaCheckTime = now
    return false
  }
}

/**
 * Force-reset the Prisma reachability cache (e.g. after a redeploy)
 */
export function resetPrismaCache(): void {
  _prismaReachable = null
  _prismaCheckTime = 0
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

export async function findWorkspaceById(id: string): Promise<SupabaseWorkspace | null> {
  const { data, error } = await getAdminClient()
    .from('workspaces')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('[db-supabase] findWorkspaceById error:', error.message)
    return null
  }
  return data as SupabaseWorkspace | null
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

export async function findWorkspaces(): Promise<SupabaseWorkspace[]> {
  const { data, error } = await getAdminClient()
    .from('workspaces')
    .select('*')
    .order('createdAt', { ascending: false })

  if (error) {
    console.error('[db-supabase] findWorkspaces error:', error.message)
    return []
  }
  return (data as SupabaseWorkspace[]) || []
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

export async function updateWorkspace(id: string, updates: Partial<SupabaseWorkspace>): Promise<SupabaseWorkspace | null> {
  const { data, error } = await getAdminClient()
    .from('workspaces')
    .update(updates as any)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('[db-supabase] updateWorkspace error:', error.message)
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

export async function findUserWorkspaces(userId: string): Promise<Array<{ id: string; name: string; slug: string; plan: string; role: string; createdAt: string }>> {
  const { data, error } = await getAdminClient()
    .from('workspace_members')
    .select('role, workspace:workspaces(id, name, slug, plan, createdAt)')
    .eq('userId', userId)
    .eq('isActive', true)
    .order('invitedAt', { ascending: true })

  if (error) {
    console.error('[db-supabase] findUserWorkspaces error:', error.message)
    return []
  }
  return (data || []).map((m: any) => ({
    id: m.workspace?.id,
    name: m.workspace?.name,
    slug: m.workspace?.slug,
    plan: m.workspace?.plan,
    role: m.role,
    createdAt: m.workspace?.createdAt,
  })).filter((w: any) => w.id)
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

// ─── Dashboard operations ───────────────────────────────────

export interface DashboardData {
  totalLeads: number
  activeConversations: number
  conversionRate: number
  revenue: number
  pipelineValue: number
  avgLeadScore: number
  totalDealValue: number
  activeAgents: number
  recentExecutions: number
  wonLeads: number
  lostLeads: number
  appointmentsScheduled: number
  estimatedLoss: number
  campaignsActive: number
  campaignsTotal: number
  totalCampaignsSent: number
  totalCampaignsDelivered: number
  totalCampaignsOpened: number
  totalCampaignsConverted: number
  openRate: number
  marketingConversionRate: number
  unreadNotifications: number
  leadSources: Array<{ source: string; count: number }>
  stageDistribution: Array<{ stage: string; count: number }>
  statusDistribution: Array<{ status: string; count: number }>
  temperatureDistribution: Array<{ temperature: string; count: number }>
  recentNotifications: any[]
  recentCampaigns: any[]
}

/**
 * Fetch all dashboard data using Supabase REST API.
 * This is the fallback when Prisma can't connect.
 */
export async function fetchDashboardData(workspaceId: string): Promise<DashboardData> {
  const client = getAdminClient()

  // Run all queries in parallel for best performance
  const [
    leads,
    conversations,
    agents,
    agentExecutions,
    contacts,
    deals,
    campaigns,
    calendarEvents,
    notifications,
    workspaceConfig,
    pipelineStages,
  ] = await Promise.all([
    // All leads for this workspace
    client.from('leads').select('id, status, temperature, score, dealValue').eq('workspaceId', workspaceId),
    // All conversations
    client.from('conversations').select('id, currentStage, status').eq('workspaceId', workspaceId),
    // Active agents
    client.from('agents').select('id, isActive').eq('workspaceId', workspaceId),
    // Agent executions (last 24h)
    client.from('agent_executions').select('id, agentId, createdAt, agents!inner(workspaceId)').eq('agents.workspaceId', workspaceId),
    // Contacts for source grouping
    client.from('contacts').select('id, source').eq('workspaceId', workspaceId),
    // Deals for revenue calculation
    client.from('deals').select('id, value, pipelineStageId').eq('workspaceId', workspaceId),
    // Campaigns
    client.from('campaigns').select('id, status, stats, name, createdAt').eq('workspaceId', workspaceId).order('createdAt', { ascending: false }),
    // Calendar events
    client.from('calendar_events').select('id, status').eq('workspaceId', workspaceId),
    // Notifications
    client.from('notifications').select('*').eq('workspaceId', workspaceId).order('createdAt', { ascending: false }).limit(50),
    // Workspace config for average ticket
    client.from('workspace_configs').select('*').eq('workspaceId', workspaceId).maybeSingle(),
    // Pipeline stages for won/lost detection
    client.from('pipeline_stages').select('id, isWonStage, isLostStage, pipelineId'),
  ])

  // Process leads
  const leadsData = leads.data || []
  const totalLeads = leadsData.length
  const wonLeads = leadsData.filter((l: any) => l.status === 'WON').length
  const lostLeads = leadsData.filter((l: any) => l.status === 'LOST').length
  const conversionRate = wonLeads + lostLeads > 0 ? (wonLeads / (wonLeads + lostLeads)) * 100 : 0
  const avgLeadScore = leadsData.length > 0
    ? leadsData.reduce((sum: number, l: any) => sum + (l.score || 0), 0) / leadsData.length
    : 0
  const totalDealValue = leadsData.reduce((sum: number, l: any) => sum + (l.dealValue || 0), 0)

  // Group leads by status
  const statusMap = new Map<string, number>()
  leadsData.forEach((l: any) => {
    statusMap.set(l.status, (statusMap.get(l.status) || 0) + 1)
  })
  const statusDistribution = Array.from(statusMap.entries()).map(([status, count]) => ({ status, count }))

  // Group leads by temperature
  const tempMap = new Map<string, number>()
  leadsData.forEach((l: any) => {
    const temp = l.temperature || 'UNKNOWN'
    tempMap.set(temp, (tempMap.get(temp) || 0) + 1)
  })
  const temperatureDistribution = Array.from(tempMap.entries()).map(([temperature, count]) => ({ temperature, count }))

  // Process conversations
  const conversationsData = conversations.data || []
  const activeConversations = conversationsData.filter((c: any) => c.status === 'ACTIVE').length
  const stageMap = new Map<string, number>()
  conversationsData.forEach((c: any) => {
    const stage = c.currentStage || 'UNKNOWN'
    stageMap.set(stage, (stageMap.get(stage) || 0) + 1)
  })
  const stageDistribution = Array.from(stageMap.entries()).map(([stage, count]) => ({ stage, count }))

  // Process agents
  const agentsData = agents.data || []
  const activeAgents = agentsData.filter((a: any) => a.isActive).length

  // Process agent executions (last 24h)
  const now = Date.now()
  const twentyFourHoursAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString()
  const executionsData = agentExecutions.data || []
  const recentExecutions = executionsData.filter((e: any) => e.createdAt >= twentyFourHoursAgo).length

  // Process contacts - group by source
  const contactsData = contacts.data || []
  const sourceMap = new Map<string, number>()
  contactsData.forEach((c: any) => {
    const source = c.source || 'UNKNOWN'
    sourceMap.set(source, (sourceMap.get(source) || 0) + 1)
  })
  const leadSources = Array.from(sourceMap.entries()).map(([source, count]) => ({ source, count }))

  // Process deals
  const dealsData = deals.data || []
  const stagesData = pipelineStages.data || []
  const wonStageIds = new Set(stagesData.filter((s: any) => s.isWonStage).map((s: any) => s.id))
  const lostStageIds = new Set(stagesData.filter((s: any) => s.isLostStage).map((s: any) => s.id))

  const wonDeals = dealsData.filter((d: any) => wonStageIds.has(d.pipelineStageId))
  const revenue = wonDeals.reduce((sum: number, d: any) => sum + (d.value || 0), 0)
  const pipelineValue = dealsData.reduce((sum: number, d: any) => sum + (d.value || 0), 0)

  // Process campaigns
  const campaignsData = campaigns.data || []
  const campaignsActive = campaignsData.filter((c: any) => c.status === 'active').length
  const campaignsTotal = campaignsData.length

  let totalSent = 0
  let totalDelivered = 0
  let totalOpened = 0
  let totalConverted = 0
  for (const c of campaignsData) {
    try {
      const stats = typeof c.stats === 'string' ? JSON.parse(c.stats) : c.stats
      totalSent += stats?.sent || 0
      totalDelivered += stats?.delivered || 0
      totalOpened += stats?.opened || 0
      totalConverted += stats?.converted || 0
    } catch {}
  }
  const openRate = totalSent > 0 ? (totalOpened / totalSent * 100) : 0
  const marketingConversionRate = totalOpened > 0 ? (totalConverted / totalOpened * 100) : 0

  const recentCampaigns = campaignsData.slice(0, 5).map((c: any) => ({
    id: c.id,
    name: c.name,
    status: c.status,
    stats: c.stats,
    createdAt: c.createdAt,
    _count: { campaignMessages: 0 },
  }))

  // Process calendar events
  const calendarData = calendarEvents.data || []
  const appointmentsScheduled = calendarData.filter((e: any) => e.status === 'scheduled').length

  // Process notifications
  const notificationsData = notifications.data || []
  const unreadNotifications = notificationsData.filter((n: any) => !n.read).length
  const recentNotifications = notificationsData.slice(0, 5)

  // Process workspace config for estimated loss
  let averageTicket = 500
  try {
    const config = workspaceConfig.data
    if (config) {
      const formula = typeof config.leadFormula === 'string' ? JSON.parse(config.leadFormula) : config.leadFormula
      if (formula?.average_ticket) averageTicket = formula.average_ticket
    }
  } catch {}
  const estimatedLoss = lostLeads * averageTicket

  return {
    totalLeads,
    activeConversations,
    conversionRate: Math.round(conversionRate * 100) / 100,
    revenue,
    pipelineValue,
    avgLeadScore: Math.round(avgLeadScore * 100) / 100,
    totalDealValue,
    activeAgents,
    recentExecutions,
    wonLeads,
    lostLeads,
    appointmentsScheduled,
    estimatedLoss,
    campaignsActive,
    campaignsTotal,
    totalCampaignsSent: totalSent,
    totalCampaignsDelivered: totalDelivered,
    totalCampaignsOpened: totalOpened,
    totalCampaignsConverted: totalConverted,
    openRate: Math.round(openRate * 100) / 100,
    marketingConversionRate: Math.round(marketingConversionRate * 100) / 100,
    unreadNotifications,
    // Map to frontend-expected format: {name, value} for PieChart, {name, count} for BarChart
    leadSourceDistribution: leadSources.map(s => ({ name: s.source || 'Otro', value: s.count })),
    stageDistribution: stageDistribution.map(s => ({ name: s.stage || 'UNKNOWN', count: s.count })),
    statusDistribution: statusDistribution.map(s => ({ name: s.status || 'UNKNOWN', count: s.count })),
    temperatureDistribution: temperatureDistribution.map(t => ({ name: t.temperature || 'UNKNOWN', count: t.count })),
    // Keep legacy field names for backward compatibility
    leadSources,
    recentNotifications,
    recentCampaigns,
  }
}

// ─── Generic table operations ───────────────────────────────

/**
 * Generic find many with filters
 */
export async function findMany(table: string, filters: Record<string, any> = {}, options: {
  select?: string
  orderBy?: string
  orderAsc?: boolean
  limit?: number
} = {}): Promise<any[]> {
  let query = getAdminClient()
    .from(table)
    .select(options.select || '*')

  // Apply filters
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null) {
      query = query.eq(key, value)
    }
  }

  // Apply ordering
  if (options.orderBy) {
    query = query.order(options.orderBy, { ascending: options.orderAsc ?? true })
  }

  // Apply limit
  if (options.limit) {
    query = query.limit(options.limit)
  }

  const { data, error } = await query

  if (error) {
    console.error(`[db-supabase] findMany(${table}) error:`, error.message)
    return []
  }
  return data || []
}

/**
 * Generic find unique by id
 */
export async function findById(table: string, id: string, select: string = '*'): Promise<any | null> {
  const { data, error } = await getAdminClient()
    .from(table)
    .select(select)
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error(`[db-supabase] findById(${table}) error:`, error.message)
    return null
  }
  return data
}

/**
 * Generic count
 */
export async function count(table: string, filters: Record<string, any> = {}): Promise<number> {
  let query = getAdminClient()
    .from(table)
    .select('*', { count: 'exact', head: true })

  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null) {
      query = query.eq(key, value)
    }
  }

  const { count: result, error } = await query

  if (error) {
    console.error(`[db-supabase] count(${table}) error:`, error.message)
    return 0
  }
  return result || 0
}

/**
 * Generic create
 */
export async function createRecord(table: string, data: Record<string, any>): Promise<any | null> {
  const { data: result, error } = await getAdminClient()
    .from(table)
    .insert(data)
    .select()
    .single()

  if (error) {
    console.error(`[db-supabase] createRecord(${table}) error:`, error.message)
    return null
  }
  return result
}

/**
 * Generic update
 */
export async function updateRecord(table: string, id: string, data: Record<string, any>): Promise<any | null> {
  const { data: result, error } = await getAdminClient()
    .from(table)
    .update(data)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error(`[db-supabase] updateRecord(${table}) error:`, error.message)
    return null
  }
  return result
}

/**
 * Generic delete
 */
export async function deleteRecord(table: string, id: string): Promise<boolean> {
  const { error } = await getAdminClient()
    .from(table)
    .delete()
    .eq('id', id)

  if (error) {
    console.error(`[db-supabase] deleteRecord(${table}) error:`, error.message)
    return false
  }
  return true
}

// ─── Raw fetch test (debug) ────────────────────────────────

export async function rawFetchTest(): Promise<{success: boolean, detail: string, keyInfo?: any}> {
  try {
    const serviceRoleKey = getServiceRoleKey()
    const url = supabaseUrl + '/rest/v1/users?select=id&limit=1'
    const res = await fetch(url, {
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': 'Bearer ' + serviceRoleKey,
        'Accept-Profile': 'public',
      },
    })
    const text = await res.text()
    return {
      success: res.ok,
      detail: text.substring(0, 200),
      keyInfo: {
        len: serviceRoleKey.length,
        first10: serviceRoleKey.substring(0, 10),
        last10: serviceRoleKey.slice(-10),
        hexFirst20: Buffer.from(serviceRoleKey.substring(0, 20)).toString('hex'),
        hasB64: !!(process.env.SUPABASE_SERVICE_ROLE_KEY_B64),
        rawLen: (process.env.SUPABASE_SERVICE_ROLE_KEY || '').length,
      }
    }
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

/**
 * Get workspace config by workspace ID
 */
export async function findWorkspaceConfig(workspaceId: string): Promise<any | null> {
  const { data, error } = await getAdminClient()
    .from('workspace_configs')
    .select('*')
    .eq('workspaceId', workspaceId)
    .maybeSingle()

  if (error) {
    console.error('[db-supabase] findWorkspaceConfig error:', error.message)
    return null
  }
  return data
}

/**
 * Upsert workspace config
 */
export async function upsertWorkspaceConfig(workspaceId: string, config: Record<string, any>): Promise<any | null> {
  // Try update first
  const existing = await findWorkspaceConfig(workspaceId)
  if (existing) {
    const { data, error } = await getAdminClient()
      .from('workspace_configs')
      .update(config)
      .eq('workspaceId', workspaceId)
      .select()
      .single()
    if (error) {
      console.error('[db-supabase] upsertWorkspaceConfig update error:', error.message)
      return null
    }
    return data
  }
  // Create new
  const { data, error } = await getAdminClient()
    .from('workspace_configs')
    .insert({ workspaceId, ...config })
    .select()
    .single()
  if (error) {
    console.error('[db-supabase] upsertWorkspaceConfig create error:', error.message)
    return null
  }
  return data
}

// ─── WhatsApp Config operations ─────────────────────────────

/**
 * Filter config fields to only include columns that definitely exist in the DB.
 * New columns (channelName, connectionType, etc.) may not have been added yet.
 */
const BASIC_WHATSAPP_COLUMNS = new Set([
  'id', 'workspaceId', 'phoneNumberId', 'businessAccountId', 'accessToken',
  'verifyToken', 'wabaId', 'isActive', 'webhookUrl', 'lastSyncAt',
  'createdAt', 'updatedAt',
])

const ALL_WHATSAPP_COLUMNS = new Set([
  ...BASIC_WHATSAPP_COLUMNS,
  'channelName', 'connectionType', 'evolutionInstanceName', 'evolutionConnected',
])

function filterWhatsAppConfigFields(config: Record<string, any>): Record<string, any> {
  const filtered: Record<string, any> = {}
  for (const [key, value] of Object.entries(config)) {
    if (ALL_WHATSAPP_COLUMNS.has(key)) {
      filtered[key] = value
    }
  }
  return filtered
}

function filterBasicWhatsAppFields(config: Record<string, any>): Record<string, any> {
  const filtered: Record<string, any> = {}
  for (const [key, value] of Object.entries(config)) {
    if (BASIC_WHATSAPP_COLUMNS.has(key)) {
      filtered[key] = value
    }
  }
  return filtered
}

export async function findWhatsAppConfig(workspaceId: string): Promise<any | null> {
  const { data, error } = await getAdminClient()
    .from('whatsapp_configs')
    .select('*')
    .eq('workspaceId', workspaceId)
    .maybeSingle()

  if (error) {
    console.error('[db-supabase] findWhatsAppConfig error:', error.message)
    return null
  }
  return data
}

export async function upsertWhatsAppConfig(workspaceId: string, config: Record<string, any>): Promise<any | null> {
  const existing = await findWhatsAppConfig(workspaceId)
  
  // Filter out columns that don't exist in the table yet
  // Only send columns that are known to exist in the whatsapp_configs table
  const safeConfig = filterWhatsAppConfigFields(config)
  
  if (existing) {
    const { data, error } = await getAdminClient()
      .from('whatsapp_configs')
      .update(safeConfig)
      .eq('workspaceId', workspaceId)
      .select()
      .single()
    if (error) {
      console.error('[db-supabase] upsertWhatsAppConfig update error:', error.message)
      // If new columns don't exist, try with only basic columns
      const basicConfig = filterBasicWhatsAppFields(config)
      const { data: basicData, error: basicError } = await getAdminClient()
        .from('whatsapp_configs')
        .update(basicConfig)
        .eq('workspaceId', workspaceId)
        .select()
        .single()
      if (basicError) {
        console.error('[db-supabase] upsertWhatsAppConfig basic update error:', basicError.message)
        return null
      }
      return { ...basicData, ...config } // Merge with requested values
    }
    return data
  }
  const { data, error } = await getAdminClient()
    .from('whatsapp_configs')
    .insert({ workspaceId, ...safeConfig })
    .select()
    .single()
  if (error) {
    console.error('[db-supabase] upsertWhatsAppConfig create error:', error.message)
    // Try with basic columns only
    const basicConfig = filterBasicWhatsAppFields(config)
    const { data: basicData, error: basicError } = await getAdminClient()
      .from('whatsapp_configs')
      .insert({ workspaceId, ...basicConfig })
      .select()
      .single()
    if (basicError) {
      console.error('[db-supabase] upsertWhatsAppConfig basic create error:', basicError.message)
      return null
    }
    return { ...basicData, ...config }
  }
  return data
}

export async function deleteWhatsAppConfig(workspaceId: string): Promise<boolean> {
  const { error } = await getAdminClient()
    .from('whatsapp_configs')
    .delete()
    .eq('workspaceId', workspaceId)

  if (error) {
    console.error('[db-supabase] deleteWhatsAppConfig error:', error.message)
    return false
  }
  return true
}

export async function findWhatsAppTemplates(workspaceId: string): Promise<any[]> {
  const { data, error } = await getAdminClient()
    .from('whatsapp_templates')
    .select('*')
    .eq('workspaceId', workspaceId)
    .order('createdAt', { ascending: false })

  if (error) {
    console.error('[db-supabase] findWhatsAppTemplates error:', error.message)
    return []
  }
  return data || []
}

// ─── Telegram Config operations ──────────────────────────────

export async function findTelegramConfig(workspaceId: string): Promise<any | null> {
  const { data, error } = await getAdminClient()
    .from('telegram_bot_configs')
    .select('*')
    .eq('workspaceId', workspaceId)
    .maybeSingle()

  if (error) {
    console.error('[db-supabase] findTelegramConfig error:', error.message)
    return null
  }
  return data
}

export async function upsertTelegramConfig(workspaceId: string, config: Record<string, any>): Promise<any | null> {
  const existing = await findTelegramConfig(workspaceId)
  if (existing) {
    const { data, error } = await getAdminClient()
      .from('telegram_bot_configs')
      .update(config)
      .eq('workspaceId', workspaceId)
      .select()
      .single()
    if (error) {
      console.error('[db-supabase] upsertTelegramConfig update error:', error.message)
      return null
    }
    return data
  }
  const { data, error } = await getAdminClient()
    .from('telegram_bot_configs')
    .insert({ workspaceId, ...config })
    .select()
    .single()
  if (error) {
    console.error('[db-supabase] upsertTelegramConfig create error:', error.message)
    return null
  }
  return data
}

export async function deleteTelegramConfig(workspaceId: string): Promise<boolean> {
  const { error } = await getAdminClient()
    .from('telegram_bot_configs')
    .delete()
    .eq('workspaceId', workspaceId)

  if (error) {
    console.error('[db-supabase] deleteTelegramConfig error:', error.message)
    return false
  }
  return true
}

export async function findTelegramSessions(workspaceId: string): Promise<any[]> {
  const { data, error } = await getAdminClient()
    .from('telegram_bot_sessions')
    .select('*')
    .eq('workspaceId', workspaceId)
    .order('updatedAt', { ascending: false })
    .limit(10)

  if (error) {
    console.error('[db-supabase] findTelegramSessions error:', error.message)
    return []
  }
  return data || []
}

export async function findTelegramCommands(workspaceId: string, limit: number = 50): Promise<any[]> {
  const { data, error } = await getAdminClient()
    .from('telegram_bot_commands')
    .select('*')
    .eq('workspaceId', workspaceId)
    .order('createdAt', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[db-supabase] findTelegramCommands error:', error.message)
    return []
  }
  return data || []
}

// ─── Google Calendar Config operations ──────────────────────

export async function findGoogleCalendarConfig(workspaceId: string): Promise<any | null> {
  const { data, error } = await getAdminClient()
    .from('google_calendar_configs')
    .select('*')
    .eq('workspaceId', workspaceId)
    .maybeSingle()

  if (error) {
    console.error('[db-supabase] findGoogleCalendarConfig error:', error.message)
    return null
  }
  return data
}

export async function createGoogleCalendarConfig(workspaceId: string, config: Record<string, any>): Promise<any | null> {
  const { data, error } = await getAdminClient()
    .from('google_calendar_configs')
    .insert({ workspaceId, ...config })
    .select()
    .single()

  if (error) {
    console.error('[db-supabase] createGoogleCalendarConfig error:', error.message)
    return null
  }
  return data
}

export async function updateGoogleCalendarConfig(workspaceId: string, updates: Record<string, any>): Promise<any | null> {
  const { data, error } = await getAdminClient()
    .from('google_calendar_configs')
    .update(updates)
    .eq('workspaceId', workspaceId)
    .select()
    .single()

  if (error) {
    console.error('[db-supabase] updateGoogleCalendarConfig error:', error.message)
    return null
  }
  return data
}

export async function deleteGoogleCalendarConfig(workspaceId: string): Promise<boolean> {
  const { error } = await getAdminClient()
    .from('google_calendar_configs')
    .delete()
    .eq('workspaceId', workspaceId)

  if (error) {
    console.error('[db-supabase] deleteGoogleCalendarConfig error:', error.message)
    return false
  }
  return true
}

// ─── Campaign operations ────────────────────────────────────

export async function findCampaigns(workspaceId: string, status?: string): Promise<any[]> {
  let query = getAdminClient()
    .from('campaigns')
    .select('*')
    .eq('workspaceId', workspaceId)
    .order('createdAt', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    console.error('[db-supabase] findCampaigns error:', error.message)
    return []
  }
  return (data || []).map((c: any) => ({
    ...c,
    _count: { campaignMessages: 0 },
  }))
}

export async function findCampaignById(campaignId: string): Promise<any | null> {
  const { data, error } = await getAdminClient()
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .maybeSingle()

  if (error) {
    console.error('[db-supabase] findCampaignById error:', error.message)
    return null
  }
  return data
}

export async function findCampaignWithMessages(campaignId: string): Promise<any | null> {
  const campaign = await findCampaignById(campaignId)
  if (!campaign) return null

  const { data: messages, error } = await getAdminClient()
    .from('campaign_messages')
    .select('*')
    .eq('campaignId', campaignId)
    .order('createdAt', { ascending: false })
    .limit(20)

  if (error) {
    console.error('[db-supabase] findCampaignWithMessages messages error:', error.message)
    return { ...campaign, campaignMessages: [] }
  }
  return { ...campaign, campaignMessages: messages || [] }
}

export async function createCampaign(workspaceId: string, data: Record<string, any>): Promise<any | null> {
  const { data: result, error } = await getAdminClient()
    .from('campaigns')
    .insert({ workspaceId, ...data })
    .select()
    .single()

  if (error) {
    console.error('[db-supabase] createCampaign error:', error.message)
    return null
  }
  return result
}

export async function updateCampaign(campaignId: string, data: Record<string, any>): Promise<any | null> {
  const { data: result, error } = await getAdminClient()
    .from('campaigns')
    .update(data)
    .eq('id', campaignId)
    .select()
    .single()

  if (error) {
    console.error('[db-supabase] updateCampaign error:', error.message)
    return null
  }
  return result
}

export async function deleteCampaignAndMessages(campaignId: string): Promise<boolean> {
  // Delete campaign messages first
  const { error: msgError } = await getAdminClient()
    .from('campaign_messages')
    .delete()
    .eq('campaignId', campaignId)

  if (msgError) {
    console.error('[db-supabase] deleteCampaignAndMessages messages error:', msgError.message)
    // Continue anyway to try deleting campaign
  }

  const { error } = await getAdminClient()
    .from('campaigns')
    .delete()
    .eq('id', campaignId)

  if (error) {
    console.error('[db-supabase] deleteCampaignAndMessages error:', error.message)
    return false
  }
  return true
}

export async function createNotification(workspaceId: string, data: { type: string; title: string; description: string }): Promise<any | null> {
  const { data: result, error } = await getAdminClient()
    .from('notifications')
    .insert({ workspaceId, ...data })
    .select()
    .single()

  if (error) {
    console.error('[db-supabase] createNotification error:', error.message)
    return null
  }
  return result
}

export async function createCampaignMessages(messages: Array<Record<string, any>>): Promise<boolean> {
  if (messages.length === 0) return true

  const { error } = await getAdminClient()
    .from('campaign_messages')
    .insert(messages)

  if (error) {
    console.error('[db-supabase] createCampaignMessages error:', error.message)
    return false
  }
  return true
}

export async function updateCampaignMessages(campaignId: string, contactId: string, data: Record<string, any>): Promise<boolean> {
  const { error } = await getAdminClient()
    .from('campaign_messages')
    .update(data)
    .eq('campaignId', campaignId)
    .eq('contactId', contactId)

  if (error) {
    console.error('[db-supabase] updateCampaignMessages error:', error.message)
    return false
  }
  return true
}

export async function findContacts(workspaceId: string, filters: Record<string, any> = {}): Promise<any[]> {
  let query = getAdminClient()
    .from('contacts')
    .select('id, name, phone, email, metadata')
    .eq('workspaceId', workspaceId)

  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null) {
      if (typeof value === 'object' && value.gte !== undefined) {
        query = query.gte(key, value.gte)
      } else {
        query = query.eq(key, value)
      }
    }
  }

  const { data, error } = await query

  if (error) {
    console.error('[db-supabase] findContacts error:', error.message)
    return []
  }
  return data || []
}

export async function findApprovedWhatsAppTemplate(workspaceId: string, templateId?: string): Promise<any | null> {
  let query = getAdminClient()
    .from('whatsapp_templates')
    .select('*')
    .eq('workspaceId', workspaceId)
    .eq('status', 'APPROVED')

  if (templateId) {
    query = query.eq('id', templateId)
  }

  const { data, error } = await query.limit(1).maybeSingle()

  if (error) {
    console.error('[db-supabase] findApprovedWhatsAppTemplate error:', error.message)
    return null
  }
  return data
}
