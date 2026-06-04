// Server Component — no 'use client'
import React from 'react'
import Link from 'next/link'
import { WelcomeHero, StatCard, ActionCard, TipItem } from './DashboardClient'

function getParam(params: Record<string, string | string[] | undefined> | undefined, key: string) {
  const value = params?.[key]
  return Array.isArray(value) ? value[0] : value
}

function formatAuthError(description?: string, code?: string) {
  if (!description && !code) return null
  if (description?.toLowerCase().includes('unable to exchange external code')) {
    return 'Google sign-in reached Supabase, but could not exchange the code. Check provider settings in your Supabase project.'
  }
  return description || code || 'Sign-in could not be completed. Please try again.'
}

export default async function Dashboard({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const resolvedSearchParams = await searchParams
  const authError = formatAuthError(
    getParam(resolvedSearchParams, 'error_description'),
    getParam(resolvedSearchParams, 'error_code')
  )

  const stats = [
    { icon: '🌍', value: '150+', label: 'Destinations supported',    color: 'bg-sky-100 dark:bg-sky-950/60',      delay: 400 },
    { icon: '🤖', value: 'AI',   label: 'Personalized itineraries',   color: 'bg-violet-100 dark:bg-violet-950/60', delay: 500 },
    { icon: '🌦️', value: '5-day', label: 'Live weather forecasts',    color: 'bg-emerald-100 dark:bg-emerald-950/60', delay: 600 },
    { icon: '📍', value: 'Maps',  label: 'GPS directions to each stop', color: 'bg-orange-100 dark:bg-orange-950/60', delay: 700 },
  ]

  const actions = [
    {
      title: 'Plan a Trip',
      description: 'AI crafts a personalized day-by-day plan with hidden gems, local food, and weather-aware pacing.',
      href: '/create-trip',
      gradient: 'bg-gradient-to-br from-sky-500 via-cyan-500 to-teal-600',
      icon: '✈️',
      badge: 'AI Powered',
      delay: 400,
    },
    {
      title: 'Saved Trips',
      description: 'Browse your saved itineraries. Pick up where you left off or relive a favourite journey.',
      href: '/saved',
      gradient: 'bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-600',
      icon: '💾',
      badge: 'Your Library',
      delay: 550,
    },
    {
      title: 'Manage Profile',
      description: 'View your account, sync trips across devices, and customise your experience.',
      href: '/profile',
      gradient: 'bg-gradient-to-br from-rose-500 via-pink-500 to-orange-500',
      icon: '👤',
      delay: 700,
    },
  ]

  const tips = [
    { icon: '🌤️', text: 'Get accurate 5-day weather forecasts automatically embedded in your itinerary.', delay: 900 },
    { icon: '📍', text: 'Each activity links to Google Maps with your current location pre-filled.', delay: 1050 },
    { icon: '🤖', text: 'AI picks authentic local food, hidden gems, and smart pacing for your mood.', delay: 1200 },
  ]

  return (
    <section className="space-y-10 pb-10">

      {/* Hero + error banner (client-animated) */}
      <WelcomeHero authError={authError} />

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* Action Cards */}
      <div>
        <h2 className="mb-5 text-sm font-bold uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500">
          Quick Actions
        </h2>
        <div className="grid gap-5 md:grid-cols-3">
          {actions.map((a) => (
            <ActionCard key={a.href} {...a} />
          ))}
        </div>
      </div>

      {/* Tips + CTA */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Tips */}
        <div className="glass-card rounded-3xl p-7">
          <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-5">
            ✨ What TripEase Does
          </h3>
          <div className="space-y-4">
            {tips.map((tip, i) => (
              <TipItem key={i} {...tip} />
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-7">
          <div className="absolute inset-0 opacity-20"
            style={{ backgroundImage: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4) 0%, transparent 50%)' }}
          />
          <div className="absolute -right-6 -bottom-6 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
          <div className="relative z-10">
            <span className="text-4xl block mb-4">🗺️</span>
            <h3 className="text-xl font-bold text-white">Ready for your next adventure?</h3>
            <p className="mt-2 text-sm text-white/75 leading-relaxed">
              Let our AI craft a personalised travel plan in seconds — with real weather forecasts and local insights.
            </p>
            <Link
              href="/create-trip"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-bold text-indigo-600 shadow-xl transition hover:shadow-2xl hover:-translate-y-0.5"
            >
              <span>Start Planning</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      </div>

    </section>
  )
}
