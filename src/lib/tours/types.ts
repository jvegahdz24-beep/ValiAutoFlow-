import type { ViewType } from '@/components/dashboard/dashboard-shell'

export type { ViewType }

/**
 * Tour step definition.
 * Each step highlights a DOM element and shows a tooltip.
 */
export interface TourStep {
  /** Unique step ID */
  id: string
  /** CSS selector for the element to highlight */
  target: string
  /** Step title shown in the tooltip */
  title: string
  /** Step description shown in the tooltip */
  content: string
  /** Position of the tooltip relative to the target */
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center'
  /** Optional: switch to this view before showing the step */
  switchToView?: ViewType
  /** Optional: action label for a CTA button */
  actionLabel?: string
  /** Optional: action to perform when CTA is clicked */
  onAction?: () => void
}

/**
 * Tour definition.
 * Each tour is associated with a view or context.
 */
export interface TourDefinition {
  /** Unique tour ID */
  id: string
  /** Display name */
  name: string
  /** Tour description */
  description: string
  /** Which view this tour belongs to (null = always available) */
  view?: ViewType | null
  /** Ordered list of steps */
  steps: TourStep[]
  /** Whether this tour should auto-start for demo users */
  autoStartForDemo?: boolean
}

/**
 * Tour state stored in localStorage.
 */
export interface TourState {
  /** Set of completed tour IDs */
  completedTours: string[]
  /** Currently active tour ID (null if none) */
  activeTourId: string | null
  /** Current step index */
  currentStepIndex: number
  /** Whether tours are dismissed globally */
  dismissed: boolean
}

export const TOUR_STORAGE_KEY = 'valiautoflow_tour_state'

export function getTourState(): TourState {
  if (typeof window === 'undefined') {
    return { completedTours: [], activeTourId: null, currentStepIndex: 0, dismissed: false }
  }
  try {
    const stored = localStorage.getItem(TOUR_STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch {}
  return { completedTours: [], activeTourId: null, currentStepIndex: 0, dismissed: false }
}

export function saveTourState(state: TourState) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify(state))
  } catch {}
}
