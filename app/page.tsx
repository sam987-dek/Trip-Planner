'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'

const destinations = [
  { name: 'Kyoto', emoji: '⛩️', color: 'from-rose-400 to-orange-400' },
  { name: 'Paris',  emoji: '🗼', color: 'from-violet-400 to-purple-400' },
  { name: 'Bali',   emoji: '🌴', color: 'from-emerald-400 to-teal-400' },
  { name: 'New York', emoji: '🗽', color: 'from-sky-400 to-blue-400' },
  { name: 'Tokyo',  emoji: '🏙️', color: 'from-pink-400 to-rose-400' },
  { name: 'Rome',   emoji: '🏛️', color: 'from-amber-400 to-orange-400' },
]

const features = [
  {
    icon: '🤖',
    title: 'AI-Crafted Itineraries',
    description: 'Gemini AI generates personalized day-by-day plans with local food, hidden gems, and mood-matched pacing.',
    color: 'bg-sky-50 dark:bg-sky-950/30',
    border: 'border-sky-100 dark:border-sky-900/30',
    iconBg: 'bg-sky-100 dark:bg-sky-900/60'
  },
  {
    icon: '🌦️',
    title: 'Live Weather Forecasts',
    description: 'Get accurate 5-day forecasts for your trip dates. Seasonal predictions for trips further in the future.',
    color: 'bg-emerald-50 dark:bg-emerald-950/30',
    border: 'border-emerald-100 dark:border-emerald-900/30',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/60'
  },
  {
    icon: '📍',
    title: 'One-Tap Directions',
    description: 'Every activity links to Google Maps with your current location pre-filled as the starting point.',
    color: 'bg-violet-50 dark:bg-violet-950/30',
    border: 'border-violet-100 dark:border-violet-900/30',
    iconBg: 'bg-violet-100 dark:bg-violet-900/60'
  },
  {
    icon: '☁️',
    title: 'Cloud Sync & Save',
    description: 'Sign in to sync trips across devices. Or save locally in your browser without an account.',
    color: 'bg-orange-50 dark:bg-orange-950/30',
    border: 'border-orange-100 dark:border-orange-900/30',
    iconBg: 'bg-orange-100 dark:bg-orange-900/60'
  },
]

function DestinationChip({ name, emoji, color, delay }: { name: string; emoji: string; color: string; delay: number }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => { const t = setTimeout(() => setVisible(true), delay); return () => clearTimeout(t) }, [delay])
  return (
    <div className={`transition-all duration-500 ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
      <div className={`group flex items-center gap-2 rounded-full bg-gradient-to-r ${color} px-4 py-2 shadow-lg text-white text-sm font-semibold cursor-default transition-transform duration-300 hover:scale-105 hover:-translate-y-1`}>
        <span>{emoji}</span>
        <span>{name}</span>
      </div>
    </div>
  )
}

function FeatureCard({ icon, title, description, color, border, iconBg, delay }: {
  icon: string; title: string; description: string; color: string; border: string; iconBg: string; delay: number
}) {
  const [visible, setVisible] = useState(false)
  useEffect(() => { const t = setTimeout(() => setVisible(true), delay); return () => clearTimeout(t) }, [delay])
  return (
    <div className={`group rounded-3xl border p-6 transition-all duration-500 hover:-translate-y-2 hover:shadow-xl ${color} ${border} ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
      <div className={`inline-flex h-13 w-13 items-center justify-center rounded-2xl ${iconBg} text-2xl mb-4 p-3 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
        {icon}
      </div>
      <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{description}</p>
    </div>
  )
}

export default function Home() {
  const [heroVisible, setHeroVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 100)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="space-y-20 pb-16">

      {/* ─── Hero Section ─── */}
      <section className="relative overflow-hidden rounded-[3rem] -mx-4 px-4 sm:-mx-0 sm:px-0">
        {/* Background */}
        <div className="absolute inset-0 rounded-[3rem] bg-gradient-to-br from-slate-950 via-sky-950/80 to-indigo-950" />
        <div className="absolute inset-0 rounded-[3rem]" style={{
          backgroundImage: 'radial-gradient(circle at 15% 40%, rgba(14,165,233,0.4) 0%, transparent 40%), radial-gradient(circle at 85% 20%, rgba(99,102,241,0.3) 0%, transparent 35%), radial-gradient(circle at 60% 80%, rgba(16,185,129,0.2) 0%, transparent 35%)'
        }} />

        {/* Animated grid */}
        <div className="absolute inset-0 rounded-[3rem] opacity-[0.07]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)',
            backgroundSize: '50px 50px'
          }}
        />

        {/* Floating orbs */}
        <div className="absolute top-12 right-16 h-40 w-40 rounded-full bg-sky-500/15 blur-3xl animate-float pointer-events-none" />
        <div className="absolute bottom-16 left-10 h-32 w-32 rounded-full bg-emerald-500/10 blur-2xl animate-float delay-400 pointer-events-none" />
        <div className="absolute top-1/2 right-1/3 h-24 w-24 rounded-full bg-violet-500/10 blur-xl animate-float delay-200 pointer-events-none" />

        <div className="relative z-10 px-8 py-16 sm:px-12 sm:py-20 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-2 items-center">

            {/* Left: Text */}
            <div className={`space-y-7 transition-all duration-1000 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-400/10 px-4 py-1.5 text-sm font-semibold text-sky-300 backdrop-blur-sm">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  AI-Powered Travel Planner
                </span>
              </div>

              <h1 className="text-5xl font-extrabold tracking-tight text-white leading-[1.1] sm:text-6xl lg:text-7xl">
                Travel smarter,
                <br />
                <span className="gradient-text">stress less.</span>
              </h1>

              <p className="text-lg text-slate-300 leading-relaxed max-w-lg">
                Create personalized itineraries with AI — packed with hidden gems, local food spots, and weather-smart planning. Ready in seconds.
              </p>

              <div className="flex flex-wrap gap-3 pt-2">
                <Link
                  href="/create-trip"
                  className="glow-btn inline-flex items-center gap-2.5 rounded-full bg-gradient-to-r from-sky-500 to-emerald-500 px-8 py-4 text-base font-bold text-white shadow-2xl shadow-sky-500/40"
                >
                  <span>✈️</span>
                  <span>Generate Itinerary</span>
                  <span className="text-white/70">→</span>
                </Link>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-8 py-4 text-base font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
                >
                  <span>View Dashboard</span>
                </Link>
              </div>

              {/* Social proof */}
              <div className="flex items-center gap-4 pt-2">
                <div className="flex -space-x-2">
                  {['🧑', '👩', '👨', '🧑'].map((emoji, i) => (
                    <div key={i} className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-slate-800 bg-gradient-to-br from-sky-400 to-indigo-500 text-sm">
                      {emoji}
                    </div>
                  ))}
                </div>
                <p className="text-sm text-slate-400">
                  <span className="font-semibold text-white">1,000+</span> trips planned this week
                </p>
              </div>
            </div>

            {/* Right: Destination chips + floating card */}
            <div className={`relative flex flex-col items-center gap-6 transition-all duration-1000 delay-300 ${heroVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}>
              {/* Destination chips */}
              <div className="flex flex-wrap justify-center gap-3">
                {destinations.map((dest, i) => (
                  <DestinationChip key={dest.name} {...dest} delay={300 + i * 80} />
                ))}
              </div>

              {/* Preview card */}
              <div className="w-full max-w-sm animate-float delay-500">
                <div className="glass-card rounded-3xl overflow-hidden shadow-2xl">
                  <div className="relative h-44 bg-gradient-to-br from-sky-400 to-emerald-400 overflow-hidden">
                    <img
                      src="https://images.unsplash.com/photo-1492571350019-22de08371fd3?auto=format&fit=crop&w=600&q=80"
                      alt="Kyoto travel"
                      className="h-full w-full object-cover opacity-60 mix-blend-overlay"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <div className="absolute bottom-3 left-4">
                      <p className="text-xs text-white/70 uppercase tracking-widest">AI Itinerary</p>
                      <p className="text-lg font-bold text-white">Kyoto, Japan</p>
                    </div>
                    <div className="absolute top-3 right-3 rounded-full bg-white/20 backdrop-blur px-2.5 py-1 text-xs text-white font-semibold">
                      3-day trip
                    </div>
                  </div>
                  <div className="p-5 space-y-3">
                    {['⛩️ Fushimi Inari Shrine', '🍜 Nishiki Market lunch', '🌸 Arashiyama Bamboo Grove'].map((item, i) => (
                      <div key={i} className="flex items-center gap-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-sm text-slate-700 dark:text-slate-300">
                        <span className="text-sky-500 text-xs font-bold">Day 1</span>
                        <span>{item}</span>
                      </div>
                    ))}
                    <div className="text-center text-xs text-slate-400 pt-1">+ more activities generated by AI</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Features Grid ─── */}
      <section>
        <div className="text-center mb-10">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-sky-600 dark:text-sky-400 animate-fade-in-up">Why TripEase</p>
          <h2 className="mt-3 text-4xl font-extrabold text-slate-900 dark:text-white animate-fade-in-up delay-100">
            Everything you need to travel smarter
          </h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <FeatureCard key={f.title} {...f} delay={200 + i * 100} />
          ))}
        </div>
      </section>

      {/* ─── CTA Banner ─── */}
      <section className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-violet-600 via-indigo-600 to-sky-600 p-1 shadow-2xl shadow-indigo-500/30">
        <div className="rounded-[2.2rem] px-8 py-12 sm:px-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-20"
            style={{backgroundImage:'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.5) 0%, transparent 40%), radial-gradient(circle at 80% 30%, rgba(255,255,255,0.3) 0%, transparent 35%)'}}
          />
          <div className="relative z-10">
            <p className="text-5xl mb-4">🌏</p>
            <h2 className="text-3xl font-extrabold text-white">Your next adventure awaits</h2>
            <p className="mt-3 text-white/75 max-w-lg mx-auto leading-relaxed">
              Tell us where you want to go and TripEase will craft the perfect plan — personalized, weather-aware, and packed with local magic.
            </p>
            <Link
              href="/create-trip"
              className="mt-7 inline-flex items-center gap-2 rounded-full bg-white px-8 py-3.5 text-base font-bold text-indigo-600 shadow-xl transition hover:shadow-2xl hover:-translate-y-0.5 hover:scale-[1.02]"
            >
              <span>Start Planning Free</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      </section>

    </div>
  )
}
