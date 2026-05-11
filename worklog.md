---
Task ID: 1
Agent: Main Agent
Task: Fix Supabase REST API fallback for ValiAutoFlow on Vercel

Work Log:
- Added SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_ANON_KEY to Vercel env vars
- Updated local .env with both keys
- Extended db-supabase.ts with comprehensive operations (dashboard, generic CRUD, workspace, auth)
- Modified auth.ts to use Supabase REST API fallback for requireWorkspaceAccess, getUserWorkspaces, getUserFirstWorkspace, switchWorkspace, createDefaultWorkspace
- Modified dashboard route to use Supabase REST API fallback (fetchDashboardData function)
- Added Supabase fallback to health, workspaces, leads, conversations, agents, pipelines routes
- Added base64-encoded service_role key support (SUPABASE_SERVICE_ROLE_KEY_B64)
- Fixed critical issue: NEXT_PUBLIC_SUPABASE_URL was stored as "sensitive" type in Vercel, causing it to not be properly decrypted in serverless functions. Recreated as "encrypted" type, which fixed the "Invalid API key" error.
- Cleaned up debug code and removed debug endpoint

Stage Summary:
- Demo-login endpoint works: POST /api/auth/demo-login returns success with credentials
- Root cause of the original "Invalid API key" error: Vercel's "sensitive" env var type was not properly decrypting the NEXT_PUBLIC_SUPABASE_URL value
- All critical API routes now have Supabase REST API fallback when Prisma can't connect
- App URL: https://vali-auto-flow.vercel.app
- Demo credentials: demo@valiautoflow.com / demo123
