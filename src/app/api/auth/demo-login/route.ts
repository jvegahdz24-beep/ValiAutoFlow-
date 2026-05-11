import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { checkRateLimit, getClientIdentifier } from "@/lib/security"
import {
  findUserByEmail,
  createUser,
  updateUser,
  findWorkspaceBySlug,
  createWorkspace,
  findWorkspaceMember,
  createWorkspaceMember,
  isDatabaseReachable,
  rawFetchTest,
  type SupabaseUser,
  type SupabaseWorkspace,
} from "@/lib/db-supabase"

const DEMO_EMAIL = "demo@valiautoflow.com"
const DEMO_PASSWORD = "demo123"
// Pre-hashed bcrypt password for demo user (avoids plaintext fallback issues)
const DEMO_PASSWORD_HASH = "$2b$12$3mZ.lSTyf/hWYWN4xOOzG.m/XIB/DTaG3K8tyjuVgQrwSKI26fk1q"

/**
 * Check if Prisma can connect, otherwise use Supabase REST API.
 * Returns 'prisma' | 'supabase'
 */
async function getDbMode(): Promise<'prisma' | 'supabase'> {
  try {
    await db.$queryRaw`SELECT 1`
    return 'prisma'
  } catch (err) {
    console.warn('[demo-login] Prisma unreachable, falling back to Supabase REST API:', (err as any)?.message?.substring(0, 80))
    return 'supabase'
  }
}

/**
 * POST /api/auth/demo-login
 *
 * Creates or recovers a demo user + workspace with realistic data,
 * then returns credentials so the client can sign in via NextAuth.
 *
 * This approach keeps auth flow consistent: we don't bypass NextAuth,
 * we just auto-provision the demo account and let the client call signIn().
 *
 * Rate limited: max 5 requests per minute per IP.
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limit demo-login to prevent abuse
    const clientId = getClientIdentifier(request)
    const rateCheck = checkRateLimit(`demo_login_${clientId}`, { limit: 5, windowMs: 60_000 })
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment and try again." },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rateCheck.retryAfterMs || 60_000) / 1000)) } }
      )
    }

    const mode = await getDbMode()

    if (mode === 'supabase') {
      return await handleDemoLoginSupabase()
    }

    return await handleDemoLoginPrisma()
  } catch (error: any) {
    console.error("Demo login error:", error)
    // Include debug info in development
    const debugInfo: Record<string, any> = {
      error: "Demo login failed", 
      details: error?.message || 'Unknown error',
    }
    if (process.env.NODE_ENV !== 'production') {
      debugInfo.stack = error?.stack?.substring(0, 300)
    }
    // Always include key diagnostic info
    debugInfo._debug = {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      serviceKeyLen: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
      serviceKeyFirst10: process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 10) || '',
      serviceKeyLast10: process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(-10) || '',
      rawFetch: await rawFetchTest(),
    }
    return NextResponse.json(debugInfo, { status: 500 })
  }
}

// ─── Prisma implementation (original) ──────────────────────

async function handleDemoLoginPrisma() {
  let user = await db.user.findUnique({ where: { email: DEMO_EMAIL } })

  if (!user) {
    user = await db.user.create({
      data: {
        email: DEMO_EMAIL,
        name: "Demo User",
        password: DEMO_PASSWORD_HASH,
        role: "OWNER",
        isActive: true,
        emailVerified: new Date(),
      },
    })
  }

  let workspace = await db.workspace.findFirst({
    where: { slug: "demo-restaurante-la-casa" },
  })

  if (!workspace) {
    workspace = await db.workspace.create({
      data: {
        name: "Restaurante La Casa",
        slug: "demo-restaurante-la-casa",
        plan: "PRO",
        settings: JSON.stringify({ isDemo: true, demoCreatedAt: new Date().toISOString() }),
      },
    })

    const existingMembership = await db.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId: user.id,
          workspaceId: workspace.id,
        },
      },
    })

    if (!existingMembership) {
      await db.workspaceMember.create({
        data: {
          userId: user.id,
          workspaceId: workspace.id,
          role: "OWNER",
          acceptedAt: new Date(),
          isActive: true,
        },
      })
    }

    await db.user.update({
      where: { id: user.id },
      data: { workspaceId: workspace.id },
    })
  }

  return NextResponse.json({
    success: true,
    credentials: {
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    },
    workspaceId: workspace.id,
    isDemo: true,
  })
}

// ─── Supabase REST API implementation (fallback) ───────────

async function handleDemoLoginSupabase() {
  // 1. Find or create the demo user
  let user = await findUserByEmail(DEMO_EMAIL)
  console.log('[demo-login] Supabase findUserByEmail result:', user ? `found ${user.email}` : 'not found')

  if (!user) {
    user = await createUser({
      email: DEMO_EMAIL,
      name: "Demo User",
      image: null,
      password: DEMO_PASSWORD_HASH,
      role: "OWNER",
      avatarUrl: null,
      workspaceId: null,
      isActive: true,
      lastSeenAt: null,
      emailVerified: new Date().toISOString(),
    })

    if (!user) {
      throw new Error("Failed to create demo user via Supabase - check service_role key and schema")
    }
  }

  // 2. Find or create the demo workspace
  let workspace = await findWorkspaceBySlug("demo-restaurante-la-casa")

  if (!workspace) {
    workspace = await createWorkspace({
      name: "Restaurante La Casa",
      slug: "demo-restaurante-la-casa",
      plan: "PRO",
      settings: JSON.stringify({ isDemo: true, demoCreatedAt: new Date().toISOString() }),
    })

    if (!workspace) {
      throw new Error("Failed to create demo workspace via Supabase")
    }

    // Associate user as OWNER
    const existingMembership = await findWorkspaceMember(user.id, workspace.id)

    if (!existingMembership) {
      await createWorkspaceMember({
        userId: user.id,
        workspaceId: workspace.id,
        role: "OWNER",
        invitedAt: new Date().toISOString(),
        acceptedAt: new Date().toISOString(),
        isActive: true,
      })
    }

    // Set user's default workspace
    await updateUser(user.id, { workspaceId: workspace.id })
    // Note: seed data already exists from the SQL seed script, so we skip seedDemoData
  }

  return NextResponse.json({
    success: true,
    credentials: {
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    },
    workspaceId: workspace.id,
    isDemo: true,
  })
}
