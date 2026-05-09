import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { switchWorkspace } from "@/lib/auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

/**
 * POST /api/auth/switch-workspace — Switch user's active workspace
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { workspaceId } = body

    if (!workspaceId) {
      return NextResponse.json(
        { error: "Workspace ID is required" },
        { status: 400 }
      )
    }

    const workspace = await switchWorkspace(session.user.id, workspaceId)

    return NextResponse.json({
      workspace,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to switch workspace"
    console.error("Error switching workspace:", error)
    return NextResponse.json(
      { error: message },
      { status: message.includes("access") ? 403 : 500 }
    )
  }
}
