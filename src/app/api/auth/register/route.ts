import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { createDefaultWorkspace } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
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

    // Create user with password (in production, hash with bcrypt)
    const user = await db.user.create({
      data: {
        name,
        email,
        password, // In production: await bcrypt.hash(password, 12)
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
