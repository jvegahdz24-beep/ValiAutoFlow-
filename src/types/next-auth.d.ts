import { DefaultSession, DefaultUser } from "next-auth"
import { DefaultJWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      workspaceId?: string
      role?: string
    } & DefaultSession["user"]
  }

  interface User extends DefaultUser {
    workspaceId?: string
    role?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    workspaceId?: string
    role?: string
  }
}
