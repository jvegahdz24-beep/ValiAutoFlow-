import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"
import { validateNextAuthSecret } from "@/lib/security"

// Validate NEXTAUTH_SECRET in production at module load time
if (process.env.NODE_ENV === 'production') {
  const secretCheck = validateNextAuthSecret()
  if (!secretCheck.valid) {
    console.error(`🚨 SECURITY: ${secretCheck.reason}. The application may be vulnerable!`)
  }
}

// Public routes that don't require authentication
const publicRoutes = [
  "/auth/signin",
  "/auth/register",
  "/api/auth/demo-login",
  "/api/auth",
  "/api/whatsapp/webhook",
  "/api/telegram/webhook",
  "/api/seed",
]

// Routes that should redirect away if already authenticated
const authRoutes = ["/auth/signin", "/auth/register"]

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token

    // Allow public routes
    if (publicRoutes.some((route) => pathname.startsWith(route))) {
      // If user is already authenticated and visiting auth pages, redirect to home
      if (token && authRoutes.some((route) => pathname.startsWith(route))) {
        return NextResponse.redirect(new URL("/", req.url))
      }
      return NextResponse.next()
    }

    // Check if user is authenticated
    if (!token) {
      // In development mode, allow access without auth if no users exist yet
      if (process.env.NODE_ENV === 'development') {
        return NextResponse.next()
      }
      const signInUrl = new URL("/auth/signin", req.url)
      signInUrl.searchParams.set("callbackUrl", pathname)
      return NextResponse.redirect(signInUrl)
    }

    // Add workspace context to request headers for downstream API routes
    const requestHeaders = new Headers(req.headers)
    if (token.workspaceId) {
      requestHeaders.set("x-workspace-id", token.workspaceId as string)
    }
    if (token.role) {
      requestHeaders.set("x-user-role", token.role as string)
    }
    requestHeaders.set("x-user-id", token.sub ?? "")

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl

        // Allow public routes without authentication
        if (publicRoutes.some((route) => pathname.startsWith(route))) {
          return true
        }

        // In development, allow everything (auth is optional)
        if (process.env.NODE_ENV === 'development') {
          return true
        }

        // Require token for all other routes in production
        return !!token
      },
    },
    pages: {
      signIn: "/auth/signin",
    },
    secret: process.env.NEXTAUTH_SECRET,
  }
)

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|logo\\.svg|robots\\.txt).*)",
  ],
}
