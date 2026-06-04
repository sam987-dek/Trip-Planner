'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabaseClient'

interface UserStats {
  savedTrips: number
  localTrips: number
  cloudTrips: number
  memberSince: string | null
}

function getInitials(email: string | null): string {
  if (!email) return '?'
  const name = email.split('@')[0]
  const parts = name.split(/[._-]/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function getAvatarColor(email: string | null): string {
  if (!email) return 'from-slate-400 to-slate-600'
  const colors = [
    'from-sky-400 to-blue-600',
    'from-violet-400 to-purple-600',
    'from-emerald-400 to-teal-600',
    'from-rose-400 to-pink-600',
    'from-amber-400 to-orange-600',
    'from-indigo-400 to-indigo-600',
    'from-cyan-400 to-sky-600',
  ]
  let hash = 0
  for (let i = 0; i < email.length; i++) hash = email.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

function StatCard({ icon, value, label, sub, color }: { icon: string; value: string | number; label: string; sub?: string; color: string }) {
  return (
    <div className={`rounded-2xl p-5 border ${color} transition-all duration-300 hover:-translate-y-1`}>
      <div className="text-2xl mb-2">{icon}</div>
      <p className="text-3xl font-extrabold text-slate-900 dark:text-white">{value}</p>
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-slate-500 dark:text-slate-500 mt-0.5">{sub}</p>}
    </div>
  )
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-4 py-3.5 border-b border-slate-100 dark:border-slate-800/60 last:border-0">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-lg">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{label}</p>
        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{value}</p>
      </div>
    </div>
  )
}

export default function Profile() {
  const [email, setEmail] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [provider, setProvider] = useState<string>('email')
  const [stats, setStats] = useState<UserStats>({ savedTrips: 0, localTrips: 0, cloudTrips: 0, memberSince: null })
  const [loading, setLoading] = useState(true)
  const [signedOut, setSignedOut] = useState(false)

  useEffect(() => {
    async function loadProfile() {
      try {
        const { data } = await supabase.auth.getSession()
        const user = data.session?.user ?? null

        if (user) {
          setEmail(user.email ?? null)
          setUserId(user.id ?? null)
          const identities = user.identities ?? []
          const googleId = identities.find((i: any) => i.provider === 'google')
          setProvider(googleId ? 'google' : 'email')

          // Member since
          const createdAt = user.created_at ?? null

          // Count local trips
          const local = JSON.parse(localStorage.getItem('tripease_saved_trips') || '[]')
          const localCount = local.length

          // Count cloud trips
          let cloudCount = 0
          const isMissing = sessionStorage.getItem('tripease_trips_table_missing') === 'true'
          if (!isMissing) {
            try {
              const { data: dbTrips } = await supabase
                .from('trips')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', user.id)
              cloudCount = (dbTrips as any)?.length ?? 0
            } catch { /* ignore */ }
          }

          setStats({
            savedTrips: localCount + cloudCount,
            localTrips: localCount,
            cloudTrips: cloudCount,
            memberSince: createdAt
              ? new Date(createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
              : null
          })
        }
      } catch { /* ignore */ }
      finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [])

  async function handleSignOut() {
    try {
      await supabase.auth.signOut()
    } catch { /* ignore */ }
    setSignedOut(true)
    setEmail(null)
    setUserId(null)
  }

  const initials = getInitials(email)
  const avatarColor = getAvatarColor(email)
  const providerLabel = provider === 'google' ? 'Google OAuth' : 'Email Magic Link'
  const providerIcon = provider === 'google' ? '🔵' : '📧'
  const shortId = userId ? userId.slice(0, 8) + '...' : '—'

  // ── Loading skeleton ──────────────────────────────────────────────
  if (loading) {
    return (
      <section className="mx-auto max-w-3xl space-y-6 animate-fade-in-up">
        <div className="glass-card rounded-[2rem] p-8">
          <div className="flex items-center gap-5">
            <div className="shimmer h-20 w-20 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="shimmer h-5 w-40 rounded-full" />
              <div className="shimmer h-4 w-60 rounded-full" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="shimmer h-28 rounded-2xl" />)}
        </div>
      </section>
    )
  }

  // ── Not signed in ─────────────────────────────────────────────────
  if (!email || signedOut) {
    return (
      <section className="mx-auto max-w-2xl animate-fade-in-up">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-slate-950 via-sky-950 to-slate-900 p-12 text-center text-white shadow-2xl">
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(14,165,233,0.6) 0%, transparent 60%)'
          }} />
          <div className="absolute top-8 right-10 h-28 w-28 rounded-full bg-sky-400/10 blur-2xl animate-float pointer-events-none" />

          <div className="relative z-10 space-y-5">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/10 backdrop-blur text-4xl">
              👤
            </div>
            <h1 className="text-3xl font-extrabold">
              {signedOut ? 'You\'ve signed out' : 'No account connected'}
            </h1>
            <p className="text-slate-300 max-w-sm mx-auto leading-relaxed">
              {signedOut
                ? 'Sign back in to access your saved trips, weather forecasts, and travel plans.'
                : 'Sign in with Google or email to sync your itineraries across devices and unlock your full travel profile.'}
            </p>
            <Link
              href="/sign-in"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-500 to-emerald-500 px-8 py-3.5 font-bold text-white shadow-xl shadow-sky-500/30 transition hover:-translate-y-0.5 hover:brightness-110"
            >
              <span>Sign In Now</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      </section>
    )
  }

  // ── Signed-in profile ─────────────────────────────────────────────
  return (
    <section className="mx-auto max-w-3xl space-y-6 pb-10 animate-fade-in-up">

      {/* ── Hero Profile Card ── */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-slate-950 via-sky-950 to-indigo-950 p-8 text-white shadow-2xl">
        {/* Background decoration */}
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 80% 20%, rgba(14,165,233,0.25) 0%, transparent 45%), radial-gradient(circle at 20% 80%, rgba(99,102,241,0.2) 0%, transparent 40%)'
        }} />
        <div className="absolute top-6 right-12 h-32 w-32 rounded-full bg-sky-400/10 blur-2xl animate-float pointer-events-none" />
        <div className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }}
        />

        <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-center">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className={`flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br ${avatarColor} text-3xl font-extrabold text-white shadow-2xl ring-4 ring-white/20`}>
              {initials}
            </div>
            <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400 text-xs shadow-lg ring-2 ring-slate-950">
              ✓
            </span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1 rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-0.5 text-xs font-semibold text-sky-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Active Account
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-3 py-0.5 text-xs font-semibold text-slate-300">
                {providerIcon} {providerLabel}
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-white truncate">{email}</h1>
            {stats.memberSince && (
              <p className="mt-1 text-sm text-slate-400">Member since {stats.memberSince}</p>
            )}
          </div>

          {/* Sign out */}
          <button
            onClick={handleSignOut}
            className="shrink-0 rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-red-500/20 hover:border-red-400/30 hover:text-red-300"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          icon="🗺️"
          value={stats.savedTrips}
          label="Total Trips"
          sub="saved itineraries"
          color="bg-sky-50 border-sky-100 dark:bg-sky-950/30 dark:border-sky-900/30"
        />
        <StatCard
          icon="☁️"
          value={stats.cloudTrips}
          label="Cloud Saved"
          sub="synced to account"
          color="bg-violet-50 border-violet-100 dark:bg-violet-950/30 dark:border-violet-900/30"
        />
        <StatCard
          icon="💻"
          value={stats.localTrips}
          label="Local Saved"
          sub="in this browser"
          color="bg-emerald-50 border-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-900/30"
        />
        <StatCard
          icon="✈️"
          value="AI"
          label="Itineraries"
          sub="powered by Gemini"
          color="bg-orange-50 border-orange-100 dark:bg-orange-950/30 dark:border-orange-900/30"
        />
      </div>

      {/* ── Account Details + Quick Actions ── */}
      <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]">

        {/* Account Info */}
        <div className="glass-card rounded-3xl p-6">
          <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-4">
            Account Details
          </h2>
          <div>
            <InfoRow icon="📧" label="Email Address" value={email} />
            <InfoRow icon="🔑" label="User ID" value={shortId} />
            <InfoRow icon={providerIcon} label="Sign-in Method" value={providerLabel} />
            <InfoRow icon="📅" label="Member Since" value={stats.memberSince ?? 'Unknown'} />
            <InfoRow icon="🔒" label="Account Status" value="Active & Verified" />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <div className="glass-card rounded-3xl p-6">
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-4">
              Quick Actions
            </h2>
            <div className="space-y-2.5">
              {[
                { href: '/create-trip', icon: '✈️', label: 'Create New Trip', color: 'bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/30 dark:hover:bg-sky-900/40 border-sky-100 dark:border-sky-900/30' },
                { href: '/saved', icon: '💾', label: 'View Saved Trips', color: 'bg-violet-50 hover:bg-violet-100 dark:bg-violet-950/30 dark:hover:bg-violet-900/40 border-violet-100 dark:border-violet-900/30' },
                { href: '/dashboard', icon: '⚡', label: 'Go to Dashboard', color: 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/40 border-emerald-100 dark:border-emerald-900/30' },
              ].map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white transition-all duration-200 hover:-translate-y-0.5 ${action.color}`}
                >
                  <span className="text-base">{action.icon}</span>
                  <span>{action.label}</span>
                  <span className="ml-auto text-slate-400">→</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Danger Zone */}
          <div className="glass-card rounded-3xl p-6 border border-red-100 dark:border-red-900/20 bg-red-50/30 dark:bg-red-950/10">
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-red-400 dark:text-red-500 mb-3">
              Danger Zone
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
              Signing out will end your session. Your cloud-saved trips stay safe in your account.
            </p>
            <button
              onClick={handleSignOut}
              className="w-full rounded-2xl border border-red-200 bg-white dark:bg-transparent dark:border-red-800/50 px-4 py-2.5 text-sm font-semibold text-red-600 dark:text-red-400 transition hover:bg-red-600 hover:text-white hover:border-red-600 dark:hover:bg-red-950/50"
            >
              Sign Out of TripEase
            </button>
          </div>
        </div>
      </div>

      {/* ── Features You're Using ── */}
      <div className="glass-card rounded-3xl p-7">
        <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-5">
          What Your Account Unlocks
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { icon: '☁️', title: 'Cloud Sync', desc: 'Trips saved to your account are accessible from any device.' },
            { icon: '🌦️', title: 'Weather Forecasts', desc: 'Live 5-day weather embedded in every itinerary you create.' },
            { icon: '📍', title: 'Smart Directions', desc: 'One-tap Google Maps directions from your current location.' },
          ].map((feat) => (
            <div key={feat.title} className="flex items-start gap-3 rounded-2xl bg-white/50 dark:bg-white/5 border border-slate-100 dark:border-white/5 p-4">
              <span className="text-2xl shrink-0">{feat.icon}</span>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white text-sm">{feat.title}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{feat.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

    </section>
  )
}
