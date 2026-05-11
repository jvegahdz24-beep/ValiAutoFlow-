import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"
import { validateNextAuthSecret } from "@/lib/security"
import { updateSession } from "@/lib/supabase/middleware"

// Validate NEXTAUTH_SECRET in production at module load time
if (process.env.NODE_ENV === 'production') {
  const secretCheck = validateNextAuthSecret()
  if (!secretCheck.valid) {
    console.error(`🚨 SECURITY: ${secretCheck.reason}. The application may be vulnerable!`)
  }
}

// Public routes that don't require authentication
const publicRoutes = [
  "/",               // Landing page
  "/precios",        // Pricing page
  "/privacidad",     // Privacy policy
  "/terminos",       // Terms of service
  "/auth/signin",
  "/auth/register",
  "/api/auth/demo-login",
  "/api/auth",
  "/api/whatsapp/webhook",
  "/api/telegram/webhook",
  "/api/seed",
  "/api/health",
  "/api/migrate",
  "/api/whatsapp/evolution",
  "/api/whatsapp/qr",
  "/api/whatsapp/status",
  "/api/whatsapp/disconnect",
]

// Routes that should redirect away if already authenticated
const authRoutes = ["/auth/signin", "/auth/register"]

export default withAuth(
  async function middleware(req) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token

    // ── Refresh Supabase auth session on every request ──
    // This ensures the Supabase client stays in sync with the server
    const supabaseResponse = await updateSession(req)

    // Allow public routes
    if (publicRoutes.some((route) => pathname === route || pathname.startsWith(route + '/'))) {
      // If user is already authenticated and visiting auth pages, redirect to dashboard
      if (token && authRoutes.some((route) => pathname.startsWith(route))) {
        const url = req.nextUrl.clone()
        url.pathname = "/dashboard"
        return NextResponse.redirect(url)
      }
      // If user is authenticated and visiting landing page, redirect to dashboard
      if (token && pathname === '/') {
        const url = req.nextUrl.clone()
        url.pathname = "/dashboard"
        return NextResponse.redirect(url)
      }
      return supabaseResponse
    }

    // Check if user is authenticated
    if (!token) {
      // Only allow auth bypass if explicitly enabled via AUTH_BYPASS env var
      if (process.env.AUTH_BYPASS === 'true') {
        return supabaseResponse
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

    // Merge Supabase cookies with our custom headers
    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })

    // Carry over Supabase cookies from the session refresh
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie.name, cookie.value)
    })

    return response
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl

        // Allow public routes without authentication
        if (publicRoutes.some((route) => pathname === route || pathname.startsWith(route + '/'))) {
          return true
        }

        // Only allow auth bypass if explicitly enabled via AUTH_BYPASS env var
        if (process.env.AUTH_BYPASS === 'true') {
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
// Build: Mon May 11 05:05:00 UTC 2026
