# Task 4 — Dynamic Prompt Compiler & Business Configuration API Routes

## Summary

Created 2 major deliverables for ValiAutoFlow:

### 1. Dynamic Prompt Compiler (`src/lib/engine/prompt-compiler.ts`)

Rewrote the prompt compiler to support dynamic business config injection. Key changes:

- **Business config injection**: `compile()` now accepts `BusinessConfig` and `answeredQuestions` params
- **New method `compileMARK()`**: Dedicated prompt builder for MARK marketing agent
- **Master prompt setters**: `setJHONMasterPrompt()` and `setMARKMasterPrompt()` for injecting agent master prompts
- **11 compiled blocks**: JHON master prompt → business config → loss formula → pending questions → stage → archetype → temperature → policies → behavioral history → lead context → objective
- **Business config blocks**: `buildBusinessConfigBlock()`, `buildLossFormulaBlock()`, `buildPendingQuestionsBlock()` — all dynamic per workspace
- **Fallback prompts**: Graceful defaults when master prompts aren't injected
- **Temperature type**: Changed from `string` to `LeadTemperature` for type safety

### 2. Business Configuration API Routes (5 route files)

| Route | Methods | Description |
|-------|---------|-------------|
| `/api/workspaces/[id]/config` | GET, PUT | Workspace business config (CRUD with upsert) |
| `/api/campaigns` | GET, POST | Campaign listing and creation |
| `/api/campaigns/[campaignId]` | GET, PATCH | Single campaign detail and update |
| `/api/segments` | GET, POST | Segment listing and creation |
| `/api/calendar-events` | GET, POST | Calendar event listing and creation |

All routes use:
- `NextRequest`/`NextResponse` from Next.js
- `db` from `@/lib/db` (Prisma client)
- JSON serialization for complex fields (schedule, products, leadFormula, customQuestions, policies, channels)
- Proper error handling with status codes

### Lint Result
✅ `bun run lint` passed with no issues.

### Dev Server
✅ Server running on port 3000, no errors in logs.
