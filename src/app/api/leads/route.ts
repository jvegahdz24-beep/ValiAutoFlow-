import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { requireWorkspaceAccess } from '@/lib/auth'
import { isPrismaReachable, findMany } from '@/lib/db-supabase'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const workspaceId = searchParams.get('workspaceId')

  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })
  }

  try {
    await requireWorkspaceAccess(workspaceId)
  } catch (error: any) {
    if (error?.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  try {
    const status = searchParams.get('status')
    const temperature = searchParams.get('temperature')
    const archetype = searchParams.get('archetype')
    const search = searchParams.get('search')

    // Supabase REST API fallback when Prisma can't connect
    if (!(await isPrismaReachable())) {
      const filters: Record<string, any> = { workspaceId }
      if (status) filters.status = status
      if (temperature) filters.temperature = temperature
      if (archetype) filters.archetype = archetype
      // Note: text search (contains) is not supported via simple filters;
      // Supabase fallback returns all matching leads without search filtering.
      // The frontend can perform client-side search if needed.
      const leads = await findMany('leads', filters, { orderBy: 'updatedAt', orderAsc: false })
      // Return simplified data without nested includes (cognitiveStates, conversations)
      return NextResponse.json(leads.map((lead: any) => ({
        ...lead,
        cognitiveStates: [],
        conversations: [],
      })))
    }

    const where: Record<string, unknown> = { workspaceId }

    if (status) where.status = status
    if (temperature) where.temperature = temperature
    if (archetype) where.archetype = archetype
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { company: { contains: search } },
      ]
    }

    const leads = await db.lead.findMany({
      where,
      include: {
        cognitiveStates: true,
        conversations: {
          take: 1,
          orderBy: { lastMessageAt: 'desc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json(leads)
  } catch (error: any) {
    if (error?.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (error?.message === 'You do not have access to this workspace') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    console.error('[Leads] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
