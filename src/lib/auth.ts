import { getServerSession as nextAuthGetServerSession, Session } from "next-auth"
import { db } from "@/lib/db"

/**
 * Get the current server session (wrapper around next-auth getServerSession)
 * Must be called from Server Components or API routes
 */
export async function getServerSession(): Promise<Session | null> {
  const { authOptions } = await import("@/app/api/auth/[...nextauth]/route")
  return nextAuthGetServerSession(authOptions)
}

/**
 * Require authentication — throws if not authenticated
 * Returns the session if authenticated
 */
export async function requireAuth(): Promise<Session> {
  const session = await getServerSession()
  if (!session || !session.user) {
    throw new Error("Authentication required")
  }
  return session
}

/**
 * Require authentication AND workspace membership.
 * Verifies that the authenticated user belongs to the requested workspace.
 * Returns { session, workspaceId } if authorized, throws otherwise.
 *
 * This is the CRITICAL security gate for all workspace-scoped API routes.
 * Without this check, a user from Workspace A could access Workspace B's data.
 */
export async function requireWorkspaceAccess(
  requestedWorkspaceId: string
): Promise<{ session: Session; workspaceId: string; role: string }> {
  const session = await requireAuth()
  const userId = session.user.id

  // Check if user is a member of the requested workspace
  const membership = await db.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId,
        workspaceId: requestedWorkspaceId,
      },
    },
    select: {
      role: true,
      isActive: true,
    },
  })

  if (!membership || !membership.isActive) {
    throw new Error("You do not have access to this workspace")
  }

  return {
    session,
    workspaceId: requestedWorkspaceId,
    role: membership.role,
  }
}

/**
 * Check if a user has a specific role or higher in a workspace.
 * Role hierarchy: OWNER > ADMIN > AGENT > VIEWER
 */
const ROLE_HIERARCHY: Record<string, number> = {
  OWNER: 4,
  ADMIN: 3,
  AGENT: 2,
  VIEWER: 1,
}

export function hasMinimumRole(userRole: string, requiredRole: string): boolean {
  const userLevel = ROLE_HIERARCHY[userRole] ?? 0
  const requiredLevel = ROLE_HIERARCHY[requiredRole] ?? 0
  return userLevel >= requiredLevel
}

/**
 * Get all workspaces for a user
 */
export async function getUserWorkspaces(userId: string) {
  const memberships = await db.workspaceMember.findMany({
    where: {
      userId,
      isActive: true,
    },
    include: {
      workspace: {
        select: {
          id: true,
          name: true,
          slug: true,
          plan: true,
          createdAt: true,
        },
      },
    },
    orderBy: {
      invitedAt: "asc",
    },
  })

  return memberships.map((m) => ({
    id: m.workspace.id,
    name: m.workspace.name,
    slug: m.workspace.slug,
    plan: m.workspace.plan,
    role: m.role,
    createdAt: m.workspace.createdAt,
  }))
}

/**
 * Create a default workspace for a new user
 * Creates: Workspace → WorkspaceMember (role: OWNER) → WorkspaceConfig
 */
export async function createDefaultWorkspace(userId: string, businessName: string) {
  const slug = businessName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    + "-" + Date.now().toString(36)

  const workspace = await db.workspace.create({
    data: {
      name: businessName,
      slug,
      plan: "FREE",
      settings: JSON.stringify({}),
    },
  })

  await db.workspaceMember.create({
    data: {
      userId,
      workspaceId: workspace.id,
      role: "OWNER",
      acceptedAt: new Date(),
      isActive: true,
    },
  })

  await db.workspaceConfig.create({
    data: {
      workspaceId: workspace.id,
      businessName,
      businessType: "general",
    },
  })

  // Update user's default workspaceId
  await db.user.update({
    where: { id: userId },
    data: { workspaceId: workspace.id },
  })

  return workspace
}

/**
 * Switch workspace — validate user has access and return workspace
 */
export async function switchWorkspace(userId: string, workspaceId: string) {
  const membership = await db.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId,
        workspaceId,
      },
    },
    include: {
      workspace: {
        select: {
          id: true,
          name: true,
          slug: true,
          plan: true,
        },
      },
    },
  })

  if (!membership || !membership.isActive) {
    throw new Error("You do not have access to this workspace")
  }

  // Update user's default workspaceId
  await db.user.update({
    where: { id: userId },
    data: { workspaceId },
  })

  return {
    id: membership.workspace.id,
    name: membership.workspace.name,
    slug: membership.workspace.slug,
    plan: membership.workspace.plan,
    role: membership.role,
  }
}

/**
 * Get the user's first active workspace (used during login/JWT callback)
 */
export async function getUserFirstWorkspace(userId: string) {
  const membership = await db.workspaceMember.findFirst({
    where: {
      userId,
      isActive: true,
    },
    include: {
      workspace: {
        select: {
          id: true,
          name: true,
          slug: true,
          plan: true,
        },
      },
    },
    orderBy: {
      invitedAt: "asc",
    },
  })

  if (!membership) return null

  return {
    id: membership.workspace.id,
    name: membership.workspace.name,
    slug: membership.workspace.slug,
    plan: membership.workspace.plan,
    role: membership.role,
  }
}
