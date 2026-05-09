// ============================================================
// REDIS / BULLMQ — Production Configuration for Upstash
// ============================================================
// Supports both local Redis and Upstash Redis (REST API).
// BullMQ queues for: message sending, follow-up sequences,
// campaign dispatch, and engine processing.
// ============================================================

import { Queue, Worker, type ConnectionOptions } from 'bullmq'

// ============================================================
// Connection Configuration
// ============================================================

function getRedisConnection(): ConnectionOptions {
  const redisUrl = process.env.REDIS_URL

  if (!redisUrl) {
    // No Redis configured — return a placeholder that will fail gracefully
    console.warn('[Redis] REDIS_URL not configured. Queue features disabled. Set REDIS_URL for production.')
    return {
      host: 'localhost',
      port: 6379,
      maxRetriesPerRequest: null,
    }
  }

  // Parse Redis URL (supports both redis:// and rediss://)
  try {
    const url = new URL(redisUrl)
    const isUpstash = url.hostname.includes('upstash.io') || url.hostname.includes('upstash')

    return {
      host: url.hostname,
      port: parseInt(url.port || '6379', 10),
      password: url.password || undefined,
      username: url.username || undefined,
      db: parseInt(url.pathname.slice(1) || '0', 10),
      tls: url.protocol === 'rediss:' ? {} : undefined,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      // Upstash-specific: longer timeouts for REST API proxy
      ...(isUpstash ? {
        connectTimeout: 10000,
        commandTimeout: 5000,
      } : {}),
    }
  } catch {
    console.error('[Redis] Invalid REDIS_URL format. Using default localhost.')
    return {
      host: 'localhost',
      port: 6379,
      maxRetriesPerRequest: null,
    }
  }
}

const redisConnection = getRedisConnection()

// ============================================================
// Check if Redis is available
// ============================================================

let redisAvailable = false

export async function checkRedisConnection(): Promise<boolean> {
  if (!process.env.REDIS_URL) return false

  try {
    const IORedis = (await import('ioredis')).default
    const testClient = new IORedis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      connectTimeout: 5000,
    })

    await testClient.ping()
    testClient.disconnect()
    redisAvailable = true
    return true
  } catch {
    console.warn('[Redis] Connection failed. Queues will operate in fallback mode.')
    redisAvailable = false
    return false
  }
}

export function isRedisAvailable(): boolean {
  return redisAvailable
}

// ============================================================
// Queue Definitions
// ============================================================

export const QUEUE_NAMES = {
  MESSAGE_SEND: 'valiautoflow:message-send',
  FOLLOW_UP: 'valiautoflow:follow-up',
  CAMPAIGN_DISPATCH: 'valiautoflow:campaign-dispatch',
  ENGINE_PROCESS: 'valiautoflow:engine-process',
  CALENDAR_SYNC: 'valiautoflow:calendar-sync',
} as const

// Lazy-initialized queues (only created when Redis is available)
let messageQueue: Queue | null = null
let followUpQueue: Queue | null = null
let campaignQueue: Queue | null = null
let engineQueue: Queue | null = null
let calendarQueue: Queue | null = null

function getQueue(name: string): Queue {
  return new Queue(name, {
    connection: redisConnection,
    defaultJobOptions: {
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 5000 },
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    },
  })
}

/**
 * Get the message sending queue.
 * Use this for WhatsApp/Telegram message dispatch to ensure
 * rate limits are respected and messages aren't lost on failure.
 */
export function getMessageQueue(): Queue {
  if (!messageQueue) {
    messageQueue = getQueue(QUEUE_NAMES.MESSAGE_SEND)
  }
  return messageQueue
}

/**
 * Get the follow-up sequence queue.
 * Schedules delayed follow-up messages based on sequence steps.
 */
export function getFollowUpQueue(): Queue {
  if (!followUpQueue) {
    followUpQueue = getQueue(QUEUE_NAMES.FOLLOW_UP)
  }
  return followUpQueue
}

/**
 * Get the campaign dispatch queue.
 * Handles bulk message sending for marketing campaigns.
 */
export function getCampaignQueue(): Queue {
  if (!campaignQueue) {
    campaignQueue = getQueue(QUEUE_NAMES.CAMPAIGN_DISPATCH)
  }
  return campaignQueue
}

/**
 * Get the engine processing queue.
 * Offloads cognitive pipeline processing from the webhook handler.
 */
export function getEngineQueue(): Queue {
  if (!engineQueue) {
    engineQueue = getQueue(QUEUE_NAMES.ENGINE_PROCESS)
  }
  return engineQueue
}

/**
 * Get the calendar sync queue.
 * Handles Google Calendar event creation and updates.
 */
export function getCalendarQueue(): Queue {
  if (!calendarQueue) {
    calendarQueue = getQueue(QUEUE_NAMES.CALENDAR_SYNC)
  }
  return calendarQueue
}

// ============================================================
// Fallback: Direct execution when Redis is unavailable
// ============================================================

/**
 * If Redis is available, add job to queue. Otherwise, execute directly.
 * This ensures the system works without Redis (degraded mode).
 */
export async function enqueueOrDirect<T>(
  queueGetter: () => Queue,
  jobName: string,
  data: T,
  directFn: (data: T) => Promise<void>,
  opts?: { delay?: number; priority?: number }
): Promise<void> {
  if (redisAvailable && process.env.REDIS_URL) {
    try {
      const queue = queueGetter()
      await queue.add(jobName, data, {
        delay: opts?.delay,
        priority: opts?.priority,
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
      })
      return
    } catch (error) {
      console.warn('[Redis] Queue add failed, falling back to direct execution:', error)
    }
  }

  // Fallback: execute directly (synchronous, no retry)
  await directFn(data)
}

// ============================================================
// Worker Factory (for use in separate worker process)
// ============================================================

export function createWorker<T>(
  queueName: string,
  processor: (job: { data: T }) => Promise<void>,
  concurrency: number = 5
): Worker<T> {
  return new Worker<T>(queueName, processor, {
    connection: redisConnection,
    concurrency,
    limiter: {
      max: 10,
      duration: 1000,
    },
  })
}
