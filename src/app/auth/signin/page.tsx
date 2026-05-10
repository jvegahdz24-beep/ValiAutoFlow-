'use client'

import { Suspense, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Sparkles, Mail, Lock, Eye, EyeOff, Zap, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import Link from 'next/link'

function SignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/'
  const error = searchParams.get('error')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isDemoLoading, setIsDemoLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(
    error === 'CredentialsSignin'
      ? 'Email o contrase\u00f1a incorrectos'
      : error
        ? 'Ocurri\u00f3 un error al iniciar sesi\u00f3n'
        : null
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl,
      })

      if (result?.error) {
        setErrorMessage(
          result.error === 'CredentialsSignin'
            ? 'Email o contrase\u00f1a incorrectos'
            : result.error
        )
      } else if (result?.ok) {
        router.push(callbackUrl)
        router.refresh()
      }
    } catch {
      setErrorMessage('Ocurri\u00f3 un error inesperado')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDemoLogin = async () => {
    setIsDemoLoading(true)
    setErrorMessage(null)

    try {
      const demoRes = await fetch('/api/auth/demo-login', { method: 'POST' })

      if (!demoRes.ok) {
        setErrorMessage('Error al preparar la cuenta demo')
        return
      }

      const demoData = await demoRes.json()

      if (!demoData.success || !demoData.credentials) {
        setErrorMessage('Error al crear cuenta demo')
        return
      }

      const result = await signIn('credentials', {
        email: demoData.credentials.email,
        password: demoData.credentials.password,
        redirect: false,
        callbackUrl: '/',
      })

      if (result?.ok) {
        if (demoData.workspaceId) {
          localStorage.setItem('valiautoflow_workspace_id', demoData.workspaceId)
        }
        localStorage.setItem('valiautoflow_demo_user', 'true')
        router.push('/')
        router.refresh()
      } else {
        setErrorMessage('Error al iniciar sesi\u00f3n demo')
      }
    } catch {
      setErrorMessage('Error de conexi\u00f3n')
    } finally {
      setIsDemoLoading(false)
    }
  }

  const handleGoogleSignIn = () => {
    signIn('google', { callbackUrl })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-gray-dark px-4">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 h-full w-full rounded-full bg-brand-mint/5 blur-3xl" />
        <div className="absolute -bottom-1/2 -right-1/2 h-full w-full rounded-full bg-brand-blue/5 blur-3xl" />
        <div className="absolute top-1/4 right-1/4 h-64 w-64 rounded-full bg-brand-blue/3 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="rounded-2xl bg-brand-mint/20 p-3">
            <Sparkles className="h-8 w-8 text-brand-mint" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">ValiAutoFlow</h1>
          <p className="text-sm text-zinc-400">Sistema Operativo Comercial Cognitivo</p>
        </div>

        <Card className="border-zinc-800 bg-zinc-900/80 shadow-2xl backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl text-white">Iniciar Sesi&oacute;n</CardTitle>
            <CardDescription className="text-zinc-400">
              Ingresa tus credenciales o prueba la demo en un clic
            </CardDescription>
          </CardHeader>

          <CardContent>
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
              >
                {errorMessage}
              </motion.div>
            )}

            {/* Demo Login Button - Featured */}
            <Button
              variant="default"
              size="lg"
              className="w-full mb-6 bg-gradient-to-r from-brand-blue to-brand-mint-dark hover:from-brand-blue-deep hover:to-brand-mint-dark text-white font-semibold shadow-lg shadow-brand-blue/20 transition-all duration-200 hover:shadow-brand-blue/30 hover:scale-[1.02]"
              onClick={handleDemoLogin}
              disabled={isDemoLoading || isLoading}
            >
              {isDemoLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Preparando demo...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Entrar como Demo (un clic)
                </div>
              )}
            </Button>

            <div className="relative my-4">
              <Separator className="bg-zinc-700" />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-zinc-900 px-3 text-xs text-zinc-500">
                o inicia sesi&oacute;n
              </span>
            </div>

            {/* Credentials Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-zinc-300">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="border-zinc-700 bg-zinc-800/50 pl-10 text-white placeholder:text-zinc-500 focus:border-brand-mint focus:ring-brand-mint/20"
                    required
                    disabled={isLoading || isDemoLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-zinc-300">Contrase&ntilde;a</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Tu contrase\u00f1a"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="border-zinc-700 bg-zinc-800/50 pl-10 pr-10 text-white placeholder:text-zinc-500 focus:border-brand-mint focus:ring-brand-mint/20"
                    required
                    disabled={isLoading || isDemoLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-brand-blue text-white hover:bg-brand-blue-deep transition-colors"
                disabled={isLoading || isDemoLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Ingresando...
                  </div>
                ) : (
                  'Ingresar'
                )}
              </Button>
            </form>

            <div className="relative my-4">
              <Separator className="bg-zinc-700" />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-zinc-900 px-3 text-xs text-zinc-500">
                o continuar con
              </span>
            </div>

            <Button
              variant="outline"
              className="w-full border-zinc-700 bg-zinc-800/50 text-white hover:bg-zinc-700 hover:text-white transition-colors"
              onClick={handleGoogleSignIn}
              disabled={isLoading || isDemoLoading}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Ingresar con Google
            </Button>
          </CardContent>

          <CardFooter className="flex justify-center border-t border-zinc-800 pt-4">
            <p className="text-sm text-zinc-400">
              &iquest;No tienes cuenta?{' '}
              <Link href="/auth/register" className="font-medium text-brand-mint hover:text-brand-mint-light transition-colors">
                Crear una
              </Link>
            </p>
          </CardFooter>
        </Card>

        <p className="mt-6 text-center text-xs text-zinc-600">
          Al iniciar sesi&oacute;n, aceptas nuestros T&eacute;rminos de Servicio y Pol&iacute;tica de Privacidad
        </p>
      </motion.div>
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-brand-gray-dark">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-mint/30 border-t-brand-mint" />
      </div>
    }>
      <SignInForm />
    </Suspense>
  )
}
