'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw } from 'lucide-react'

/**
 * Next.js Error Boundary for the /dashboard route.
 * Catches any unhandled errors in the dashboard page and its children,
 * displaying a friendly error UI instead of a blank/broken page.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to the console for debugging
    console.error('[DashboardError] Unhandled error:', error.message, error.digest)
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-8">
      <div className="flex flex-col items-center gap-6 text-center max-w-md">
        <div className="rounded-2xl bg-orange-500/10 p-4">
          <AlertTriangle className="h-10 w-10 text-orange-400" />
        </div>

        <div>
          <h2 className="text-xl font-bold tracking-tight">Algo salió mal</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Ocurrió un error inesperado en el dashboard. Esto puede deberse a un problema
            temporal de conexión o un error en la aplicación.
          </p>
          {error.message && (
            <p className="text-xs text-muted-foreground mt-2 font-mono bg-muted/50 rounded p-2">
              {error.message}
            </p>
          )}
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => window.location.href = '/'}
          >
            Ir al inicio
          </Button>
          <Button
            onClick={reset}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Reintentar
          </Button>
        </div>
      </div>
    </div>
  )
}
