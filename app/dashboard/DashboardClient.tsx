'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'

// ─── Stat Card ─────────────────────────────────────────────────────
export function StatCard({ icon, value, label, color, delay }: {
  icon: string; value: string; label: string; color: string; delay: number
}) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(t)
  }, [delay])

  return (
    <div
      className={`glass-card rounded-2xl p-5 transition-all duration-500 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <div className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${color} mb-3 text-xl`}>
        {icon}
      </div>
      <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{value}</p>
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">{label}</p>
    </div>
  )
}

// ─── Action Card ────────────────────────────────────────────────────
export function ActionCard({
  title, description, href, gradient, icon, badge, delay
}: {
  title: string; description: string; href: string
  gradient: string; icon: string; badge?: string; delay: number
}) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(t)
  }, [delay])

  return (
    <Link
      href={href}
      className={`group relative overflow-hidden rounded-3xl transition-all duration-500 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      }`}
    >
      <div className={`absolute inset-0 ${gradient} opacity-90 transition-all duration-500 group-hover:opacity-100`} />
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 60%)' }}
      />
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl transition-transform duration-500 group-hover:scale-150" />
      <div className="absolute -left-8 -bottom-8 h-24 w-24 rounded-full bg-white/5 blur-xl transition-transform duration-500 group-hover:translate-x-2 group-hover:translate-y-2" />

      <div className="relative z-10 p-7 h-full flex flex-col justify-between min-h-[200px]">
        <div className="flex items-start justify-between">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 text-3xl shadow-inner backdrop-blur-sm transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3">
            {icon}
          </div>
          {badge && (
            <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white backdrop-blur-sm">
              {badge}
            </span>
          )}
        </div>
        <div>
          <h3 className="text-xl font-bold text-white mt-4">{title}</h3>
          <p className="mt-1.5 text-sm text-white/75 leading-relaxed">{description}</p>
          <div className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-white/90 transition-all duration-300 group-hover:gap-3">
            <span>Get started</span>
            <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
          </div>
        </div>
      </div>
    </Link>
  )
}

// ─── Tip Item ────────────────────────────────────────────────────────
export function TipItem({ icon, text, delay }: { icon: string; text: string; delay: number }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(t)
  }, [delay])

  return (
    <div className={`flex items-start gap-3 transition-all duration-500 ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}>
      <span className="mt-0.5 text-lg">{icon}</span>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{text}</p>
    </div>
  )
}

// ─── Welcome Hero (client-animated) ─────────────────────────────────
export function WelcomeHero({ authError }: { authError: string | null }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(t)
  }, [])

  return (
    <>
      {authError && (
        <div className="animate-fade-in-down rounded-2xl border border-amber-200 bg-amber-50/80 backdrop-blur p-5 text-amber-950 shadow-md dark:border-amber-500/30 dark:bg-amber-950/20 dark:text-amber-100">
          <div className="flex items-start gap-3">
            <span className="text-xl mt-0.5">⚠️</span>
            <div>
              <p className="font-semibold">Google sign-in needs attention</p>
              <p className="mt-1 text-sm leading-6 opacity-80">{authError}</p>
              <Link href="/sign-in" className="mt-3 inline-flex rounded-full bg-amber-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-amber-700 transition">
                Back to sign in
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Hero Banner */}
      <div className={`relative overflow-hidden rounded-[2.5rem] transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-sky-950 to-slate-950" />
        <div className="absolute inset-0 bg-gradient-to-tr from-sky-500/20 via-transparent to-emerald-500/20" />
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(14,165,233,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 30%, rgba(16,185,129,0.2) 0%, transparent 40%)'
        }} />

        {/* Floating orbs */}
        <div className="absolute top-6 right-10 h-20 w-20 rounded-full bg-sky-400/10 blur-xl animate-float pointer-events-none" />
        <div className="absolute bottom-6 right-24 h-14 w-14 rounded-full bg-emerald-400/10 blur-lg animate-float delay-300 pointer-events-none" />
        <div className="absolute top-10 left-1/2 h-40 w-40 rounded-full bg-indigo-400/5 blur-2xl animate-float delay-500 pointer-events-none" />

        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }}
        />

        <div className="relative z-10 px-8 py-12 sm:px-12 sm:py-14">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-4 flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-1 text-xs font-semibold text-sky-300 backdrop-blur-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse" />
                  AI-Powered Travel
                </span>
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl leading-tight">
                Your Trip
                <br />
                <span className="gradient-text">Command Center</span>
              </h1>
              <p className="mt-3 max-w-md text-slate-300 leading-relaxed">
                Plan, explore, and remember every journey. Powered by AI with live weather, local secrets, and guided navigation.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/create-trip"
                className="glow-btn inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-500 to-emerald-500 px-7 py-3.5 text-sm font-bold text-white shadow-2xl shadow-sky-500/30"
              >
                <span>✈️</span>
                <span>Plan New Trip</span>
              </Link>
              <Link
                href="/saved"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
              >
                <span>💾</span>
                <span>View Saved</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
