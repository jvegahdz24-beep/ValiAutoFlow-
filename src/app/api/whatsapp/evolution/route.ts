// ============================================================
// EVOLUTION API PROXY — QR Code & Instance Management
// ============================================================
// POST with { action, instanceName, workspaceId }
// Actions: 'create', 'connect', 'status', 'logout', 'delete'
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireWorkspaceAccess } from '@/lib/auth'
import {
  createInstance,
  connectInstance,
  getInstanceStatus,
  logoutInstance,
  deleteInstance,
  isEvolutionConfigured,
} from '@/lib/whatsapp/evolution-api'
import { isPrismaReachable, findWhatsAppConfig, upsertWhatsAppConfig } from '@/lib/db-supabase'

// Reject unsupported methods with a helpful error
function methodNotAllowed(allowed: string[]) {
  return NextResponse.json(
    { error: `Método no permitido. Usa: ${allowed.join(', ')}` },
    { status: 405 }
  )
}

export async function GET() {
  return NextResponse.json({
    endpoint: '/api/whatsapp/evolution',
    methods: ['POST'],
    actions: ['create', 'connect', 'status', 'logout', 'delete'],
    message: 'Envía un POST con { action, instanceName, workspaceId }',
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, instanceName, workspaceId } = body

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 })
    }

    await requireWorkspaceAccess(workspaceId)

    if (!isEvolutionConfigured()) {
      return NextResponse.json(
        { error: 'Evolution API no configurada. Agrega EVOLUTION_API_URL y EVOLUTION_API_KEY en las variables de entorno de Vercel.' },
        { status: 400 }
      )
    }

    switch (action) {
      case 'create': {
        const name = instanceName || `ws_${workspaceId.slice(0, 8)}`
        const result = await createInstance(name, workspaceId)
        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 })
        }

        // Save instance name to WhatsApp config
        if (await isPrismaReachable()) {
          const { db } = await import('@/lib/db')
          await db.whatsAppConfig.upsert({
            where: { workspaceId },
            create: {
              workspaceId,
              phoneNumberId: '',
              accessToken: '',
              verifyToken: `evolution_${Date.now()}`,
              isActive: false,
              evolutionInstanceName: name,
              connectionType: 'evolution',
            },
            update: {
              evolutionInstanceName: name,
              connectionType: 'evolution',
            },
          })
        } else {
          const existing = await findWhatsAppConfig(workspaceId)
          if (existing) {
            await upsertWhatsAppConfig(workspaceId, {
              evolutionInstanceName: name,
              connectionType: 'evolution',
            })
          } else {
            await upsertWhatsAppConfig(workspaceId, {
              phoneNumberId: '',
              accessToken: '',
              verifyToken: `evolution_${Date.now()}`,
              isActive: false,
              evolutionInstanceName: name,
              connectionType: 'evolution',
            })
          }
        }

        // Immediately connect to get QR code
        const connectResult = await connectInstance(name)
        return NextResponse.json({
          instance: result.data,
          qrcode: connectResult.qrcode,
          pairingCode: connectResult.code,
          status: connectResult.status,
        })
      }

      case 'connect': {
        if (!instanceName) {
          return NextResponse.json({ error: 'instanceName is required' }, { status: 400 })
        }
        const result = await connectInstance(instanceName)
        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 })
        }

        // Update connection status in DB
        const isConnected = result.status === 'open'
        if (await isPrismaReachable()) {
          const { db } = await import('@/lib/db')
          await db.whatsAppConfig.update({
            where: { workspaceId },
            data: {
              isActive: isConnected,
              evolutionConnected: isConnected,
              ...(isConnected ? { lastSyncAt: new Date() } : {}),
            },
          })
        } else {
          await upsertWhatsAppConfig(workspaceId, {
            isActive: isConnected,
            evolutionConnected: isConnected,
          })
        }

        return NextResponse.json({
          qrcode: result.qrcode,
          pairingCode: result.code,
          status: result.status,
        })
      }

      case 'status': {
        if (!instanceName) {
          return NextResponse.json({ error: 'instanceName is required' }, { status: 400 })
        }
        const result = await getInstanceStatus(instanceName)
        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 })
        }
        return NextResponse.json({ status: result.status })
      }

      case 'logout': {
        if (!instanceName) {
          return NextResponse.json({ error: 'instanceName is required' }, { status: 400 })
        }
        const result = await logoutInstance(instanceName)
        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 })
        }

        // Update DB
        if (await isPrismaReachable()) {
          const { db } = await import('@/lib/db')
          await db.whatsAppConfig.update({
            where: { workspaceId },
            data: { isActive: false, evolutionConnected: false },
          })
        } else {
          await upsertWhatsAppConfig(workspaceId, {
            isActive: false,
            evolutionConnected: false,
          })
        }

        return NextResponse.json({ message: 'Instancia desconectada' })
      }

      case 'delete': {
        if (!instanceName) {
          return NextResponse.json({ error: 'instanceName is required' }, { status: 400 })
        }
        await logoutInstance(instanceName)
        const result = await deleteInstance(instanceName)
        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 })
        }
        return NextResponse.json({ message: 'Instancia eliminada' })
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: create, connect, status, logout, delete' },
          { status: 400 }
        )
    }
  } catch (error: any) {
    if (error?.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (error?.message === 'You do not have access to this workspace') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    console.error('[EvolutionAPI] Error:', error)
    return NextResponse.json({ error: `Internal server error: ${error.message}` }, { status: 500 })
  }
}

export async function PUT() { return methodNotAllowed(['POST']) }
export async function DELETE() { return methodNotAllowed(['POST']) }
export async function PATCH() { return methodNotAllowed(['POST']) }
