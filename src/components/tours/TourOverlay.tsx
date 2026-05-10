'use client'

import { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { X, ChevronLeft, ChevronRight, Play, Sparkles } from 'lucide-react'
import type { TourDefinition, TourState } from '@/lib/tours/types'
import { TOUR_STORAGE_KEY } from '@/lib/tours/types'
import { getTour, getToursForView, getAutoStartTours } from '@/lib/tours/tours'
import type { ViewType } from '@/components/dashboard/dashboard-shell'

// ============================================================
// Tour Context
// ============================================================

interface TourContextType {
  /** Start a specific tour */
  startTour: (tourId: string) => void
  /** End the current tour */
  endTour: () => void
  /** Check if a tour is active */
  isTourActive: boolean
  /** Get available tours for the current view */
  availableTours: TourDefinition[]
  /** Current active tour */
  activeTour: TourDefinition | null
  /** Current step index */
  currentStepIndex: number
  /** Total steps in current tour */
  totalSteps: number
  /** Check if a tour has been completed */
  isTourCompleted: (tourId: string) => boolean
  /** Set the view change callback */
  setViewChangeCallback: (cb: (view: ViewType) => void) => void
}

const TourContext = createContext<TourContextType>({
  startTour: () => {},
  endTour: () => {},
  isTourActive: false,
  availableTours: [],
  activeTour: null,
  currentStepIndex: 0,
  totalSteps: 0,
  isTourCompleted: () => false,
  setViewChangeCallback: () => {},
})

export function useTour() {
  return useContext(TourContext)
}

// ============================================================
// Tour Provider
// ============================================================

interface TourProviderProps {
  children: React.ReactNode
  currentView?: ViewType
  isDemoUser?: boolean
}

function loadTourStateFromStorage(): TourState {
  if (typeof window === 'undefined') {
    return { completedTours: [], activeTourId: null, currentStepIndex: 0, dismissed: false }
  }
  try {
    const stored = localStorage.getItem(TOUR_STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch {}
  return { completedTours: [], activeTourId: null, currentStepIndex: 0, dismissed: false }
}

export function TourProvider({ children, currentView, isDemoUser }: TourProviderProps) {
  const [tourState, setTourState] = useState<TourState>(loadTourStateFromStorage)
  const isClient = typeof window !== 'undefined'
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
  const viewChangeCallback = useRef<((view: ViewType) => void) | null>(null)
  const autoStartTriggered = useRef(false)

  // Save state to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify(tourState))
    } catch {}
  }, [tourState])

  const startTour = useCallback((tourId: string) => {
    const tour = getTour(tourId)
    if (!tour) return

    setTourState(prev => ({
      ...prev,
      activeTourId: tourId,
      currentStepIndex: 0,
    }))

    // Switch view if the first step requires it
    if (tour.steps[0]?.switchToView && viewChangeCallback.current) {
      viewChangeCallback.current(tour.steps[0].switchToView)
    }
  }, [])

  const activeTour = tourState.activeTourId ? getTour(tourState.activeTourId) ?? null : null
  const currentStep = activeTour?.steps[tourState.currentStepIndex] ?? null

  // Auto-start welcome tour for demo users
  useEffect(() => {
    if (!isClient || !isDemoUser || autoStartTriggered.current || tourState.activeTourId || tourState.dismissed) return

    const autoStartTours = getAutoStartTours()
    const uncompletedAutoStart = autoStartTours.find(t => !tourState.completedTours.includes(t.id))

    if (uncompletedAutoStart) {
      autoStartTriggered.current = true
      // Small delay to let the dashboard render
      const timer = setTimeout(() => {
        startTour(uncompletedAutoStart.id)
      }, 1500)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [isClient, isDemoUser, tourState.activeTourId, tourState.dismissed, tourState.completedTours, startTour])

  const endTour = useCallback(() => {
    setTourState(prev => {
      if (prev.activeTourId) {
        return {
          ...prev,
          completedTours: [...new Set([...prev.completedTours, prev.activeTourId!])],
          activeTourId: null,
          currentStepIndex: 0,
        }
      }
      return prev
    })
  }, [])

  const dismissTour = useCallback(() => {
    setTourState(prev => ({
      ...prev,
      activeTourId: null,
      currentStepIndex: 0,
      dismissed: true,
    }))
  }, [])

  const goToNextStep = useCallback(() => {
    if (!activeTour) return
    const nextIndex = tourState.currentStepIndex + 1

    if (nextIndex >= activeTour.steps.length) {
      endTour()
      return
    }

    const nextStep = activeTour.steps[nextIndex]
    if (nextStep?.switchToView && viewChangeCallback.current) {
      viewChangeCallback.current(nextStep.switchToView)
    }

    setTourState(prev => ({
      ...prev,
      currentStepIndex: nextIndex,
    }))
  }, [activeTour, tourState.currentStepIndex, endTour])

  const goToPrevStep = useCallback(() => {
    if (tourState.currentStepIndex <= 0) return
    const prevIndex = tourState.currentStepIndex - 1
    const prevStep = activeTour?.steps[prevIndex]

    if (prevStep?.switchToView && viewChangeCallback.current) {
      viewChangeCallback.current(prevStep.switchToView)
    }

    setTourState(prev => ({
      ...prev,
      currentStepIndex: prevIndex,
    }))
  }, [tourState.currentStepIndex, activeTour])

  const isTourCompleted = useCallback((tourId: string) => {
    return tourState.completedTours.includes(tourId)
  }, [tourState.completedTours])

  const setViewChangeCallbackFn = useCallback((cb: (view: ViewType) => void) => {
    viewChangeCallback.current = cb
  }, [])

  const availableTours = currentView ? getToursForView(currentView) : []

  // Calculate target element position
  useEffect(() => {
    if (!currentStep || !isClient) return

    const updatePosition = () => {
      const element = document.querySelector(currentStep.target)
      if (!element) {
        setTargetRect(null)
        // Position in center if target not found
        setTooltipPosition({
          top: window.innerHeight / 2 - 100,
          left: window.innerWidth / 2 - 200,
        })
        return
      }

      const rect = element.getBoundingClientRect()
      setTargetRect(rect)

      // Calculate tooltip position based on step position preference
      const position = currentStep.position ?? 'bottom'
      const tooltipWidth = 400
      const tooltipHeight = 200
      const gap = 12

      let top = 0
      let left = 0

      switch (position) {
        case 'top':
          top = rect.top - tooltipHeight - gap
          left = rect.left + rect.width / 2 - tooltipWidth / 2
          break
        case 'bottom':
          top = rect.bottom + gap
          left = rect.left + rect.width / 2 - tooltipWidth / 2
          break
        case 'left':
          top = rect.top + rect.height / 2 - tooltipHeight / 2
          left = rect.left - tooltipWidth - gap
          break
        case 'right':
          top = rect.top + rect.height / 2 - tooltipHeight / 2
          left = rect.right + gap
          break
        case 'center':
          top = window.innerHeight / 2 - tooltipHeight / 2
          left = window.innerWidth / 2 - tooltipWidth / 2
          break
      }

      // Clamp to viewport
      top = Math.max(16, Math.min(top, window.innerHeight - tooltipHeight - 16))
      left = Math.max(16, Math.min(left, window.innerWidth - tooltipWidth - 16))

      setTooltipPosition({ top, left })
    }

    updatePosition()

    // Update on scroll/resize
    const observer = new ResizeObserver(updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    observer.observe(document.body)

    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
      observer.disconnect()
    }
  }, [currentStep, isClient])

  const contextValue: TourContextType = {
    startTour,
    endTour,
    isTourActive: !!tourState.activeTourId,
    availableTours,
    activeTour,
    currentStepIndex: tourState.currentStepIndex,
    totalSteps: activeTour?.steps.length ?? 0,
    isTourCompleted,
    setViewChangeCallback: setViewChangeCallbackFn,
  }

  return (
    <TourContext.Provider value={contextValue}>
      {children}

      {/* Tour Overlay */}
      {isClient && tourState.activeTourId && currentStep && createPortal(
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999]"
          >
            {/* Semi-transparent backdrop with cutout */}
            {targetRect && (
              <svg className="absolute inset-0 h-full w-full">
                <defs>
                  <mask id="tour-cutout">
                    <rect x="0" y="0" width="100%" height="100%" fill="white" />
                    <rect
                      x={targetRect.left - 6}
                      y={targetRect.top - 6}
                      width={targetRect.width + 12}
                      height={targetRect.height + 12}
                      rx="8"
                      fill="black"
                    />
                  </mask>
                </defs>
                <rect
                  x="0" y="0" width="100%" height="100%"
                  fill="rgba(0,0,0,0.6)"
                  mask="url(#tour-cutout)"
                />
                {/* Highlight border */}
                <rect
                  x={targetRect.left - 6}
                  y={targetRect.top - 6}
                  width={targetRect.width + 12}
                  height={targetRect.height + 12}
                  rx="8"
                  fill="none"
                  stroke="rgba(16, 185, 129, 0.8)"
                  strokeWidth="2"
                />
              </svg>
            )}

            {/* Fallback backdrop if no target */}
            {!targetRect && (
              <div className="absolute inset-0 bg-black/60" />
            )}

            {/* Tooltip */}
            <motion.div
              key={`${tourState.activeTourId}-${tourState.currentStepIndex}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute"
              style={{
                top: tooltipPosition.top,
                left: tooltipPosition.left,
                maxWidth: 400,
                width: '90vw',
              }}
            >
              <div className="rounded-xl border border-emerald-500/30 bg-zinc-900 p-5 shadow-2xl shadow-emerald-500/10">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-emerald-500/20 p-1.5">
                      <Sparkles className="h-4 w-4 text-emerald-400" />
                    </div>
                    <h3 className="text-sm font-semibold text-white">{currentStep.title}</h3>
                  </div>
                  <button
                    onClick={dismissTour}
                    className="rounded-md p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Content */}
                <p className="text-sm text-zinc-300 leading-relaxed mb-4">
                  {currentStep.content}
                </p>

                {/* Progress dots */}
                {activeTour && activeTour.steps.length > 1 && (
                  <div className="flex items-center gap-1.5 mb-4">
                    {activeTour.steps.map((_, i) => (
                      <div
                        key={i}
                        className={`h-1.5 rounded-full transition-all duration-200 ${
                          i === tourState.currentStepIndex
                            ? 'w-6 bg-emerald-400'
                            : i < tourState.currentStepIndex
                              ? 'w-1.5 bg-emerald-500/40'
                              : 'w-1.5 bg-zinc-700'
                        }`}
                      />
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <div className="text-xs text-zinc-500">
                    {tourState.currentStepIndex + 1} / {activeTour?.steps.length ?? 0}
                  </div>
                  <div className="flex items-center gap-2">
                    {tourState.currentStepIndex > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-zinc-400 hover:text-white"
                        onClick={goToPrevStep}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Anterior
                      </Button>
                    )}
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-500 text-white"
                      onClick={goToNextStep}
                    >
                      {tourState.currentStepIndex < (activeTour?.steps.length ?? 1) - 1 ? (
                        <>
                          Siguiente
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </>
                      ) : (
                        'Entendido'
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </TourContext.Provider>
  )
}

// ============================================================
// Tour Launcher Button - can be placed anywhere
// ============================================================

interface TourLauncherProps {
  tourId?: string
  currentView?: ViewType
  className?: string
}

export function TourLauncher({ tourId, currentView: _currentView, className }: TourLauncherProps) {
  const { startTour, isTourActive, availableTours, isTourCompleted } = useTour()

  if (isTourActive) return null

  // If a specific tour ID is given, launch that tour
  if (tourId) {
    if (isTourCompleted(tourId)) return null
    return (
      <Button
        variant="ghost"
        size="icon"
        className={className ?? "h-8 w-8 text-muted-foreground hover:text-foreground"}
        onClick={() => startTour(tourId)}
        title="Iniciar tour guiado"
      >
        <Play className="h-3.5 w-3.5" />
      </Button>
    )
  }

  // Otherwise, show launcher for available tours in the current view
  const uncompletedTours = availableTours.filter(t => !isTourCompleted(t.id))
  if (uncompletedTours.length === 0) return null

  return (
    <Button
      variant="ghost"
      size="sm"
      className={className ?? "h-8 gap-1.5 text-muted-foreground hover:text-foreground"}
      onClick={() => startTour(uncompletedTours[0].id)}
      title="Iniciar tour guiado"
    >
      <Play className="h-3.5 w-3.5" />
      <span className="hidden sm:inline text-xs">Tour</span>
    </Button>
  )
}
