import NextAuth, { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import { db } from "@/lib/db"
import { getUserFirstWorkspace, createDefaultWorkspace } from "@/lib/auth"
import {
  findUserByEmail as supabaseFindUserByEmail,
  findWorkspaceMember as supabaseFindWorkspaceMember,
  findFirstWorkspaceForUser as supabaseFindFirstWorkspace,
  updateUser as supabaseUpdateUser,
} from "@/lib/db-supabase"
import bcrypt from "bcryptjs"

/**
 * Hash a password using bcrypt (10 rounds).
 * Used during registration and password updates.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

/**
 * Compare a plaintext password against a stored bcrypt hash.
 * Rejects non-bcrypt passwords — all passwords must be properly hashed.
 */
export async function comparePassword(plaintext: string, stored: string): Promise<boolean> {
  if (!stored.startsWith('$2')) {
    // Reject non-bcrypt passwords — all passwords must be properly hashed
    return false
  }
  return bcrypt.compare(plaintext, stored)
}

/**
 * Check if Prisma can connect to the database.
 * Caches the result for 60 seconds to avoid repeated connection attempts.
 */
let prismaReachable: boolean | null = null
let prismaCheckTime = 0
const PRISMA_CHECK_INTERVAL = 60_000 // 60 seconds

async function isPrismaReachable(): Promise<boolean> {
  const now = Date.now()
  if (prismaReachable !== null && (now - prismaCheckTime) < PRISMA_CHECK_INTERVAL) {
    return prismaReachable
  }
  try {
    await db.$queryRaw`SELECT 1`
    prismaReachable = true
    prismaCheckTime = now
    return true
  } catch {
    prismaReachable = false
    prismaCheckTime = now
    return false
  }
}

/**
 * Find user by email — tries Prisma first, falls back to Supabase REST API.
 */
async function findUserByEmailSafe(email: string) {
  if (await isPrismaReachable()) {
    return await db.user.findUnique({ where: { email } })
  }
  // Fallback: Supabase REST API
  const supaUser = await supabaseFindUserByEmail(email)
  if (!supaUser) return null
  return {
    id: supaUser.id,
    email: supaUser.email,
    name: supaUser.name,
    image: supaUser.image,
    password: supaUser.password,
    role: supaUser.role,
    avatarUrl: supaUser.avatarUrl,
    workspaceId: supaUser.workspaceId,
    isActive: supaUser.isActive,
    lastSeenAt: supaUser.lastSeenAt ? new Date(supaUser.lastSeenAt) : null,
    emailVerified: supaUser.emailVerified ? new Date(supaUser.emailVerified) : null,
    createdAt: new Date(supaUser.createdAt),
    updatedAt: new Date(supaUser.updatedAt),
  }
}

/**
 * Find workspace member — tries Prisma first, falls back to Supabase REST API.
 */
async function findWorkspaceMemberSafe(userId: string, workspaceId: string) {
  if (await isPrismaReachable()) {
    return await db.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    })
  }
  const supaMember = await supabaseFindWorkspaceMember(userId, workspaceId)
  if (!supaMember) return null
  return {
    id: supaMember.id,
    userId: supaMember.userId,
    workspaceId: supaMember.workspaceId,
    role: supaMember.role,
    invitedAt: new Date(supaMember.invitedAt),
    acceptedAt: supaMember.acceptedAt ? new Date(supaMember.acceptedAt) : null,
    isActive: supaMember.isActive,
  }
}

/**
 * Get user's first workspace — tries Prisma first, falls back to Supabase REST API.
 */
async function getUserFirstWorkspaceSafe(userId: string) {
  if (await isPrismaReachable()) {
    return await getUserFirstWorkspace(userId)
  }
  const supaMember = await supabaseFindFirstWorkspace(userId)
  if (!supaMember || !supaMember.workspace) return null
  return {
    id: supaMember.workspace.id,
    name: supaMember.workspace.name,
    slug: supaMember.workspace.slug,
    plan: supaMember.workspace.plan,
    role: supaMember.role,
  }
}

/**
 * Update user lastSeenAt — tries Prisma first, falls back to Supabase REST API.
 */
async function updateLastSeenAtSafe(userId: string) {
  try {
    if (await isPrismaReachable()) {
      await db.user.update({
        where: { id: userId },
        data: { lastSeenAt: new Date() },
      })
    } else {
      await supabaseUpdateUser(userId, { lastSeenAt: new Date().toISOString() } as any)
    }
  } catch {
    // Non-critical — ignore errors
  }
}

/**
 * Custom PrismaAdapter using our db client
 * Only needed for OAuth providers (Google etc.) to store Account data
 */
function PrismaAdapter(): import("next-auth/adapters").Adapter {
  return {
    async createUser(data: { name?: string | null; email?: string | null; image?: string | null; emailVerified?: Date | null }) {
      const user = await db.user.create({
        data: {
          name: data.name ?? "",
          email: data.email ?? "",
          image: data.image,
          emailVerified: data.emailVerified,
        },
      })
      return user as any
    },
    async getUser(id) {
      const user = await db.user.findUnique({ where: { id } })
      return user as any
    },
    async getUserByEmail(email) {
      const user = await db.user.findUnique({ where: { email } })
      return user as any
    },
    async getUserByAccount({ provider, providerAccountId }) {
      const account = await db.account.findUnique({
        where: { provider_providerAccountId: { provider, providerAccountId } },
        include: { user: true },
      })
      return account?.user as any
    },
    async updateUser(data: { id?: string; name?: string | null; email?: string | null; image?: string | null; emailVerified?: Date | null }) {
      const user = await db.user.update({
        where: { id: (data as any).id },
        data: data as any,
      })
      return user as any
    },
    async deleteUser(id) {
      await db.user.delete({ where: { id } })
    },
    async linkAccount(data: { userId: string; type: string; provider: string; providerAccountId: string; refresh_token?: string | null; access_token?: string | null; expires_at?: number | null; token_type?: string | null; scope?: string | null; id_token?: string | null; session_state?: string | null; oauth_token?: string | null; oauth_token_secret?: string | null }) {
      await db.account.create({
        data: {
          userId: data.userId,
          type: data.type,
          provider: data.provider,
          providerAccountId: data.providerAccountId,
          refresh_token: data.refresh_token,
          access_token: data.access_token,
          expires_at: data.expires_at,
          token_type: data.token_type,
          scope: data.scope,
          id_token: data.id_token,
          session_state: data.session_state,
          oauth_token: data.oauth_token,
          oauth_token_secret: data.oauth_token_secret,
        },
      })
    },
    async unlinkAccount({ provider, providerAccountId }: { provider: string; providerAccountId: string }) {
      await db.account.delete({
        where: { provider_providerAccountId: { provider, providerAccountId } },
      })
    },
    async createSession(data: { sessionToken: string; userId: string; expires: Date }) {
      const session = await db.session.create({
        data: {
          sessionToken: data.sessionToken,
          userId: data.userId,
          expires: data.expires,
        },
      })
      return session as any
    },
    async getSession(sessionToken: string) {
      const session = await db.session.findUnique({
        where: { sessionToken },
      })
      return session as any
    },
    async updateSession(data: { sessionToken?: string; [key: string]: unknown }) {
      const session = await db.session.update({
        where: { sessionToken: (data as any).sessionToken },
        data: data as any,
      })
      return session as any
    },
    async deleteSession(sessionToken: string) {
      await db.session.delete({ where: { sessionToken } })
    },
    async createVerificationToken(data: { identifier: string; token: string; expires: Date }) {
      const token = await db.verificationToken.create({
        data: {
          identifier: data.identifier,
          token: data.token,
          expires: data.expires,
        },
      })
      return token as any
    },
    async useVerificationToken({ identifier, token }) {
      try {
        const verificationToken = await db.verificationToken.delete({
          where: { identifier_token: { identifier, token } },
        })
        return verificationToken as any
      } catch {
        return null
      }
    },
  } as import("next-auth/adapters").Adapter
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(),
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required")
        }

        // Uses Prisma with Supabase REST API fallback
        const user = await findUserByEmailSafe(credentials.email)

        if (!user) {
          throw new Error("No user found with this email")
        }

        if (!user.password) {
          throw new Error("This account uses OAuth. Please sign in with Google.")
        }

        // Compare password with bcrypt hash
        const isPasswordValid = await comparePassword(credentials.password, user.password)
        if (!isPasswordValid) {
          throw new Error("Invalid password")
        }

        if (!user.isActive) {
          throw new Error("Your account has been deactivated")
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        }
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  jwt: {
    secret: process.env.NEXTAUTH_SECRET,
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/auth/signin",
    error: "/auth/signin",
  },
  callbacks: {
    async signIn({ user, account }) {
      // For OAuth providers, create default workspace if user is new
      if (account?.type === "oauth" && user.id) {
        const existingWorkspaces = await getUserFirstWorkspaceSafe(user.id)
        if (!existingWorkspaces) {
          await createDefaultWorkspace(user.id, user.name ?? "My Workspace")
        }
      }
      return true
    },
    async jwt({ token, user, trigger, session }) {
      // Initial sign in — add user data to token
      if (user) {
        token.id = user.id
        token.workspaceId = (user as any).workspaceId
        token.role = (user as any).role

        // Fetch user's first workspace if none set
        if (!(user as any).workspaceId) {
          const workspace = await getUserFirstWorkspaceSafe(user.id)
          if (workspace) {
            token.workspaceId = workspace.id
            token.role = workspace.role
          }
        } else {
          // Get the user's role in their current workspace
          const membership = await findWorkspaceMemberSafe(user.id, (user as any).workspaceId)
          if (membership) {
            token.role = membership.role
          }
        }
      }

      // Handle workspace switch via update trigger
      if (trigger === "update" && session?.workspaceId) {
        token.workspaceId = session.workspaceId
        // Fetch role for new workspace
        const membership = await findWorkspaceMemberSafe(token.sub!, session.workspaceId)
        if (membership) {
          token.role = membership.role
        }
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? token.id as string
        session.user.workspaceId = token.workspaceId
        session.user.role = token.role
      }
      return session
    },
  },
  events: {
    async signIn({ user }) {
      // Update lastSeenAt on sign in
      if (user.id) {
        await updateLastSeenAtSafe(user.id)
      }
    },
  },
  debug: process.env.NODE_ENV === "development",
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
