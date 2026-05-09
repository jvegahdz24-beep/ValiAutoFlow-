/**
 * Campaign Queue Module
 *
 * Uses BullMQ when Redis is available, falls back to direct execution for MVP.
 * In production, configure REDIS_URL env var.
 */

let campaignQueue: any = null
let isQueueAvailable = false

try {
  const { Queue } = await import('bullmq')
  const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'

  campaignQueue = new Queue('campaigns', {
    connection: { url: REDIS_URL },
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: true,
    },
  })
  isQueueAvailable = true
} catch {
  console.log('[CampaignQueue] BullMQ/Redis not available. Using direct execution mode.')
  isQueueAvailable = false
}

export interface CampaignJobData {
  campaignId: string
  workspaceId: string
  channel: string
  templateBody: string
  segmentQuery: Record<string, unknown>
}

export async function addToCampaignQueue(name: string, data: CampaignJobData): Promise<{ queued: boolean; method: string }> {
  if (isQueueAvailable && campaignQueue) {
    await campaignQueue.add(name, data)
    return { queued: true, method: 'bullmq' }
  }

  // Fallback: direct execution (API endpoint handles the actual send)
  return { queued: false, method: 'direct' }
}

export function isQueueReady(): boolean {
  return isQueueAvailable
}
