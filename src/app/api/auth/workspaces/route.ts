import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { db } from "@/lib/db"
import { getUserWorkspaces, createDefaultWorkspace } from "@/lib/auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

/**
 * GET /api/auth/workspaces — Get current user's workspaces
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const workspaces = await getUserWorkspaces(session.user.id)

    return NextResponse.json({ workspaces })
  } catch (error) {
    console.error("Error fetching workspaces:", error)
    return NextResponse.json(
      { error: "Failed to fetch workspaces" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/auth/workspaces — Create a new workspace
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name } = body

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Workspace name is required" },
        { status: 400 }
      )
    }

    // Check workspace limit based on plan
    const currentWorkspaces = await db.workspaceMember.count({
      where: {
        userId: session.user.id,
        isActive: true,
      },
    })

    // Free plan: max 1 workspace (adjust as needed)
    if (currentWorkspaces >= 5) {
      return NextResponse.json(
        { error: "Workspace limit reached. Upgrade your plan for more workspaces." },
        { status: 403 }
      )
    }

    const workspace = await createDefaultWorkspace(session.user.id, name.trim())

    return NextResponse.json(
      {
        workspace: {
          id: workspace.id,
          name: workspace.name,
          slug: workspace.slug,
          plan: workspace.plan,
          createdAt: workspace.createdAt,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error creating workspace:", error)
    return NextResponse.json(
      { error: "Failed to create workspace" },
      { status: 500 }
    )
  }
}
