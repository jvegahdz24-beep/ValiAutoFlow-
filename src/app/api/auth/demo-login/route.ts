import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { seedDemoData } from "@/lib/demo/seed"
import { checkRateLimit, getClientIdentifier } from "@/lib/security"

const DEMO_EMAIL = "demo@valiautoflow.com"
const DEMO_PASSWORD = "demo123"
// Pre-hashed bcrypt password for demo user (avoids plaintext fallback issues)
const DEMO_PASSWORD_HASH = "$2b$12$3mZ.lSTyf/hWYWN4xOOzG.m/XIB/DTaG3K8tyjuVgQrwSKI26fk1q"

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

    // 1. Find or create the demo user
    let user = await db.user.findUnique({ where: { email: DEMO_EMAIL } })

    if (!user) {
      user = await db.user.create({
        data: {
          email: DEMO_EMAIL,
          name: "Demo User",
          password: DEMO_PASSWORD_HASH, // bcrypt-hashed — secure for production
          role: "OWNER",
          isActive: true,
          emailVerified: new Date(),
        },
      })
    }

    // 2. Find or create the demo workspace
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

      // Associate user as OWNER
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

      // Set user's default workspace
      await db.user.update({
        where: { id: user.id },
        data: { workspaceId: workspace.id },
      })

      // Seed all demo data
      await seedDemoData(workspace.id)
    }

    // 3. Return credentials so the client can authenticate via NextAuth
    return NextResponse.json({
      success: true,
      credentials: {
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
      },
      workspaceId: workspace.id,
      isDemo: true,
    })
  } catch (error) {
    console.error("Demo login error:", error)
    return NextResponse.json(
      { error: "Demo login failed" },
      { status: 500 }
    )
  }
}
