'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { isSupabaseConfigured, supabase } from '../../lib/supabaseClient'

type SessionStatus = 'loading' | 'signed-in' | 'signed-out'
type AlertType = 'info' | 'success' | 'error' | 'warning'

interface AlertMsg {
  type: AlertType
  message: string
}

export default function SignInPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [alert, setAlert] = useState<AlertMsg | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('loading')
  const [emailLoading, setEmailLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [googleCheckLoading, setGoogleCheckLoading] = useState(false)

  // Check session on mount and handle auth error params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const authDescription = params.get('error_description')
    const authCode = params.get('error_code')

    if (authDescription || authCode) {
      const message = authDescription?.toLowerCase().includes('unable to exchange external code')
        ? 'Google sign-in reached Supabase, but could not exchange the code. Check the Google provider client secret and redirect URI in Supabase.'
        : authDescription || authCode || 'Sign-in could not be completed. Please try again.'
      setAlert({ type: 'error', message })
      window.history.replaceState({}, '', window.location.pathname)
    }

    checkCurrentSession()
  }, [])

  async function checkCurrentSession() {
    setSessionStatus('loading')
    try {
      const { data } = await supabase.auth.getSession()
      const currentUser = data.session?.user ?? null
      if (currentUser) {
        setUserEmail(currentUser.email ?? null)
        setSessionStatus('signed-in')
      } else {
        setSessionStatus('signed-out')
      }
    } catch {
      setSessionStatus('signed-out')
    }
  }

  // Called every time user clicks "Continue with Google"
  async function handleGoogleSignIn() {
    setAlert(null)
    setGoogleCheckLoading(true)

    try {
      // ── Step 1: Always re-check session before opening Google OAuth ──
      const { data } = await supabase.auth.getSession()
      const existingUser = data.session?.user ?? null

      if (existingUser) {
        // User is already signed in — show a clear message, do NOT open Google OAuth
        setUserEmail(existingUser.email ?? null)
        setSessionStatus('signed-in')
        setAlert({
          type: 'warning',
          message: `You're already signed in as ${existingUser.email}. No need to sign in again!`
        })
        setGoogleCheckLoading(false)
        return
      }

      // ── Step 2: Not signed in — proceed with Google OAuth ──
      setGoogleCheckLoading(false)
      setGoogleLoading(true)

      const redirectTo = `${window.location.origin}/dashboard`
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo }
      })

      if (error) {
        setAlert({ type: 'error', message: error.message })
        setGoogleLoading(false)
      }
      // If no error, Google OAuth redirects — no need to set loading back
    } catch (err: any) {
      setGoogleCheckLoading(false)
      setGoogleLoading(false)
      setAlert({ type: 'error', message: err?.message || 'Could not open Google sign-in. Please try again.' })
    }
  }

  async function handleEmailSignIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedEmail = email.trim()

    if (!trimmedEmail) {
      setAlert({ type: 'error', message: 'Please enter your email address.' })
      return
    }

    setEmailLoading(true)
    setAlert(null)

    try {
      const redirectTo = `${window.location.origin}/dashboard`
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmedEmail,
        options: { emailRedirectTo: redirectTo }
      })

      if (error) {
        setAlert({ type: 'error', message: error.message })
        return
      }

      setAlert({ type: 'success', message: `Magic link sent to ${trimmedEmail}. Check your inbox — click the link to sign in.` })
    } catch (err: any) {
      setAlert({ type: 'error', message: err?.message || 'Could not send magic link. Please try again.' })
    } finally {
      setEmailLoading(false)
    }
  }

  async function handleSignOut() {
    try {
      await supabase.auth.signOut()
    } catch { /* ignore */ }
    setUserEmail(null)
    setSessionStatus('signed-out')
    setAlert({ type: 'info', message: 'You have been signed out.' })
  }

  const authDisabled = emailLoading || googleLoading || googleCheckLoading || !isSupabaseConfigured
  const isGoogleBusy = googleLoading || googleCheckLoading

  // Alert color map
  const alertStyles: Record<AlertType, string> = {
    info:    'border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-500/30 dark:bg-sky-950/30 dark:text-sky-200',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-950/30 dark:text-emerald-200',
    error:   'border-red-200 bg-red-50 text-red-900 dark:border-red-500/30 dark:bg-red-950/30 dark:text-red-200',
    warning: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-100',
  }
  const alertIcons: Record<AlertType, string> = {
    info: 'ℹ️', success: '✅', error: '❌', warning: '⚠️'
  }

  return (
    <section className="mx-auto max-w-6xl overflow-hidden rounded-3xl border border-slate-200 bg-[#f8fbff] shadow-2xl shadow-slate-200/70 dark:border-slate-800 dark:bg-slate-950 dark:shadow-slate-900/40 animate-fade-in-up">
      <div className="grid lg:grid-cols-[1.1fr_0.9fr]">

        {/* Left: Hero image panel */}
        <div className="relative min-h-[360px] overflow-hidden bg-slate-950 lg:min-h-[680px]">
          <img
            src="https://images.unsplash.com/photo-1526772662000-3f88f10405ff?auto=format&fit=crop&w=1400&q=80"
            alt="Traveler on a mountain road"
            className="h-full w-full object-cover opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-950/25 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-6 sm:p-10">
            <div className="max-w-xl text-white">
              <p className="text-sm uppercase tracking-[0.26em] text-sky-100">TripEase checkpoint</p>
              <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
                Keep the good routes from disappearing.
              </h1>
              <p className="mt-4 max-w-lg text-base leading-7 text-slate-200">
                Sign in to save your itineraries, sync across devices, and keep your travel plans in one place.
              </p>
            </div>
          </div>

          <div className="absolute left-6 top-6 rounded-2xl border border-white/20 bg-white/15 p-4 text-white shadow-xl backdrop-blur sm:left-10 sm:top-10">
            <p className="text-xs uppercase tracking-[0.22em] text-sky-100">Next stop</p>
            <p className="mt-1 text-lg font-semibold">Dashboard</p>
            <p className="mt-2 text-sm text-slate-200">Saved plans, local finds, calmer days.</p>
          </div>
        </div>

        {/* Right: Sign-in form */}
        <div className="p-5 sm:p-8 lg:p-10">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900 dark:shadow-slate-950/30 sm:p-7">

            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-dashed border-slate-300 pb-6 dark:border-slate-700">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-sky-600">Boarding pass</p>
                <h2 className="mt-2 text-3xl font-semibold text-slate-950 dark:text-white">Access your trip desk</h2>
              </div>
              <div className="rounded-2xl bg-slate-950 px-4 py-3 text-right text-white dark:bg-sky-500">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-300 dark:text-sky-50">Gate</p>
                <p className="text-2xl font-bold">AI</p>
              </div>
            </div>

            {/* Supabase not configured */}
            {!isSupabaseConfigured && (
              <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/20 dark:text-amber-100">
                Supabase is not configured. Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to <code>.env.local</code>.
              </div>
            )}

            {/* Alert banner */}
            {alert && (
              <div className={`mt-5 flex items-start gap-3 rounded-2xl border px-4 py-3.5 text-sm ${alertStyles[alert.type]} animate-fade-in-down`}>
                <span className="mt-0.5 shrink-0">{alertIcons[alert.type]}</span>
                <div className="flex-1">
                  <p>{alert.message}</p>
                  {alert.type === 'warning' && (
                    <div className="mt-3 flex gap-2">
                      <Link
                        href="/dashboard"
                        className="rounded-full bg-amber-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-amber-700 transition"
                      >
                        Go to Dashboard →
                      </Link>
                      <button
                        onClick={handleSignOut}
                        className="rounded-full border border-amber-300 px-4 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 dark:border-amber-600 dark:text-amber-200 transition"
                      >
                        Sign out & switch account
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Session loading skeleton */}
            {sessionStatus === 'loading' && (
              <div className="mt-7 space-y-3">
                <div className="shimmer h-14 rounded-2xl" />
                <div className="shimmer h-10 rounded-xl" />
                <div className="shimmer h-14 rounded-2xl" />
              </div>
            )}

            {/* Already signed in */}
            {sessionStatus === 'signed-in' && !alert && (
              <div className="mt-7 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-950/20 dark:text-emerald-200 animate-fade-in-up">
                <div className="flex items-center gap-2 text-base font-semibold">
                  <span>✅</span>
                  <span>Already signed in</span>
                </div>
                <p className="mt-1 text-sm opacity-80">
                  You're checked in as <strong>{userEmail}</strong>.
                </p>
                <div className="mt-4 flex gap-2">
                  <Link
                    href="/dashboard"
                    className="inline-flex rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                  >
                    Continue to Dashboard →
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="inline-flex rounded-full border border-emerald-300 px-5 py-2 text-sm font-semibold text-emerald-800 dark:text-emerald-200 transition hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            )}

            {/* Sign-in form */}
            {sessionStatus === 'signed-out' && (
              <div className="mt-7 space-y-6 animate-fade-in-up">

                {/* Google button */}
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={authDisabled}
                  className="group flex w-full items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-950 px-5 py-4 text-left text-white shadow-lg shadow-slate-300/40 transition hover:-translate-y-0.5 hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:shadow-slate-950/40"
                >
                  <span>
                    <span className="block text-xs uppercase tracking-[0.22em] text-sky-100">
                      {googleCheckLoading ? 'Checking session...' : 'Fast check-in'}
                    </span>
                    <span className="mt-1 block text-lg font-semibold">
                      {isGoogleBusy ? (googleCheckLoading ? 'Verifying...' : 'Opening Google...') : 'Continue with Google'}
                    </span>
                  </span>
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-white transition group-hover:scale-105">
                    {isGoogleBusy ? (
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-sky-500" />
                    ) : (
                      <svg className="h-5 w-5" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                      </svg>
                    )}
                  </span>
                </button>

                {/* Divider */}
                <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                  <span className="h-px bg-slate-200 dark:bg-slate-800" />
                  <span className="text-xs uppercase tracking-[0.2em] text-slate-400">or magic link</span>
                  <span className="h-px bg-slate-200 dark:bg-slate-800" />
                </div>

                {/* Email magic link form */}
                <form onSubmit={handleEmailSignIn} className="space-y-4">
                  <label className="block space-y-2 text-sm text-slate-700 dark:text-slate-300">
                    <span>Email for your itinerary locker</span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                      className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-sky-500 dark:focus:ring-sky-800/40"
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={authDisabled}
                    className="inline-flex w-full items-center justify-center rounded-2xl bg-sky-600 px-6 py-3 font-semibold text-white shadow-xl shadow-sky-500/25 transition hover:-translate-y-0.5 hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {emailLoading ? 'Sending link...' : 'Send secure travel link'}
                  </button>
                </form>

              </div>
            )}

            {/* Footer stats */}
            <div className="mt-7 grid grid-cols-3 gap-3 border-t border-dashed border-slate-300 pt-5 text-center text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">Saved</p>
                <p>plans</p>
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">Weather</p>
                <p>aware</p>
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">Local</p>
                <p>finds</p>
              </div>
            </div>
          </div>

          <div className="mt-6 text-sm text-slate-500 dark:text-slate-400">
            Just looking around? <Link href="/" className="font-semibold text-sky-600 hover:underline">Return home</Link>.
          </div>
        </div>
      </div>
    </section>
  )
}
