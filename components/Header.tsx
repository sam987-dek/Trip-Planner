'use client'
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import ThemeToggle from './ThemeToggle'
import Auth from './Auth'

const navLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: '⚡' },
  { href: '/create-trip', label: 'Create Trip', icon: '✈️' },
  { href: '/saved', label: 'Saved', icon: '💾' },
]

export default function Header() {
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 12)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'border-b border-white/20 bg-white/70 dark:bg-slate-950/75 backdrop-blur-2xl shadow-lg shadow-slate-200/30 dark:shadow-slate-950/60'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className="container mx-auto max-w-7xl px-4 py-3">
        <div className="flex items-center justify-between">

          {/* Logo */}
          <Link href="/" className="group flex items-center gap-2.5">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-emerald-500 shadow-lg shadow-sky-500/30 transition-all duration-300 group-hover:scale-110 group-hover:shadow-sky-500/50">
              <span className="text-lg">✈️</span>
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent" />
            </div>
            <span className="text-xl font-extrabold tracking-tight">
              <span className="gradient-text">TripEase</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden sm:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`group relative flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 ${
                    isActive
                      ? 'bg-gradient-to-r from-sky-500/15 to-emerald-500/10 text-sky-600 dark:text-sky-400'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-white/5'
                  }`}
                >
                  <span className="text-xs">{link.icon}</span>
                  {link.label}
                  {isActive && (
                    <span className="absolute bottom-1 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-gradient-to-r from-sky-500 to-emerald-500" />
                  )}
                </Link>
              )
            })}
            <div className="ml-3 flex items-center gap-2 border-l border-slate-200/60 dark:border-white/10 pl-3">
              <Auth />
              <ThemeToggle />
            </div>
          </nav>

          {/* Mobile Toggle */}
          <div className="flex items-center gap-2 sm:hidden">
            <ThemeToggle />
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="rounded-xl p-2 text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5"
              aria-label="Toggle menu"
            >
              <span className="block text-xl">{menuOpen ? '✕' : '☰'}</span>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="mt-3 sm:hidden animate-fade-in-down rounded-2xl border border-white/30 bg-white/80 backdrop-blur-xl dark:bg-slate-900/80 dark:border-white/10 shadow-xl p-3 space-y-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium transition ${
                    isActive
                      ? 'bg-gradient-to-r from-sky-500/15 to-emerald-500/10 text-sky-600 dark:text-sky-400'
                      : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/5'
                  }`}
                >
                  <span>{link.icon}</span>
                  {link.label}
                </Link>
              )
            })}
            <div className="pt-2 border-t border-slate-200/50 dark:border-white/10 px-2">
              <Auth />
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
