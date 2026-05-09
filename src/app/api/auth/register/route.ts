import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { createDefaultWorkspace } from "@/lib/auth"
import { hashPassword } from "@/app/api/auth/[...nextauth]/route"
import { checkRateLimit, getClientIdentifier } from "@/lib/security"

export async function POST(request: NextRequest) {
  try {
    // Rate limit registration to prevent abuse
    const clientId = getClientIdentifier(request)
    const rateCheck = checkRateLimit(`register_${clientId}`, { limit: 3, windowMs: 300_000 }) // 3 per 5 min
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Too many registration attempts. Please wait a few minutes." },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rateCheck.retryAfterMs || 300_000) / 1000)) } }
      )
    }

    const body = await request.json()
    const { name, email, password, businessName } = body

    if (!name || !email || !password || !businessName) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      )
    }

    // Hash password with bcrypt before storing
    const hashedPassword = await hashPassword(password)
    const user = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "AGENT",
        isActive: true,
      },
    })

    // Create default workspace + workspace member + workspace config
    const workspace = await createDefaultWorkspace(user.id, businessName)

    return NextResponse.json(
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        workspace: {
          id: workspace.id,
          name: workspace.name,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    )
  }
}
