'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Sparkles, Mail, Lock, User, Building2, Eye, EyeOff } from 'lucide-react'
import { motion } from 'framer-motion'
import Link from 'next/link'

export default function RegisterPage() {
  const router = useRouter()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMessage(null)

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters')
      setIsLoading(false)
      return
    }

    try {
      // Create the user account
      const registerRes = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          businessName,
        }),
      })

      const data = await registerRes.json()

      if (!registerRes.ok) {
        setErrorMessage(data.error || 'Registration failed')
        setIsLoading(false)
        return
      }

      // Sign in with the new credentials
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.ok) {
        router.push('/')
        router.refresh()
      } else {
        // Registration succeeded but auto-login failed
        router.push('/auth/signin?message=Registration+successful,+please+sign+in')
      }
    } catch {
      setErrorMessage('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      {/* Background pattern */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 h-full w-full rounded-full bg-emerald-500/5 blur-3xl" />
        <div className="absolute -bottom-1/2 -right-1/2 h-full w-full rounded-full bg-emerald-500/5 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="rounded-2xl bg-emerald-500/20 p-3">
            <Sparkles className="h-8 w-8 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            ValiAutoFlow
          </h1>
          <p className="text-sm text-zinc-400">
            Create your account
          </p>
        </div>

        <Card className="border-zinc-800 bg-zinc-900/80 shadow-2xl backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl text-white">Get started</CardTitle>
            <CardDescription className="text-zinc-400">
              Create your account and set up your first workspace
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

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-zinc-300">
                  Full name
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="border-zinc-700 bg-zinc-800/50 pl-10 text-white placeholder:text-zinc-500 focus:border-emerald-500 focus:ring-emerald-500/20"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-zinc-300">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="border-zinc-700 bg-zinc-800/50 pl-10 text-white placeholder:text-zinc-500 focus:border-emerald-500 focus:ring-emerald-500/20"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-zinc-300">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min. 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="border-zinc-700 bg-zinc-800/50 pl-10 pr-10 text-white placeholder:text-zinc-500 focus:border-emerald-500 focus:ring-emerald-500/20"
                    required
                    disabled={isLoading}
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="businessName" className="text-zinc-300">
                  Business name
                </Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <Input
                    id="businessName"
                    type="text"
                    placeholder="My Business"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="border-zinc-700 bg-zinc-800/50 pl-10 text-white placeholder:text-zinc-500 focus:border-emerald-500 focus:ring-emerald-500/20"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Creating account...
                  </div>
                ) : (
                  'Create account'
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex justify-center border-t border-zinc-800 pt-4">
            <p className="text-sm text-zinc-400">
              Already have an account?{' '}
              <Link
                href="/auth/signin"
                className="font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                Sign in
              </Link>
            </p>
          </CardFooter>
        </Card>

        <p className="mt-6 text-center text-xs text-zinc-600">
          By creating an account, you agree to our Terms of Service and Privacy Policy
        </p>
      </motion.div>
    </div>
  )
}
