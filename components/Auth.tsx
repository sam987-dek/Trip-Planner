'use client'
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase, syncUserSession } from '../lib/supabaseClient'

export default function Auth() {
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event: string, session: any) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)
      if (currentUser) syncUserSession(currentUser)
    })

    supabase.auth
      .getSession()
      .then((r: any) => {
        const currentUser = r.data.session?.user ?? null
        setUser(currentUser)
        if (currentUser) syncUserSession(currentUser)
      })
      .catch(() => setUser(null))

    return () => {
      data.subscription?.unsubscribe()
    }
  }, [])


  async function signOut() {
    try {
      await supabase.auth.signOut()
    } catch {
      // Keep local navigation usable even if auth is temporarily unavailable.
    }
    setUser(null)
  }

  if (user) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Link href="/profile" className="max-w-32 truncate text-slate-700 hover:text-sky-700 dark:text-slate-200 dark:hover:text-sky-300">
          {user.email}
        </Link>
        <button onClick={signOut} className="rounded-full border border-slate-200 px-3 py-1 text-slate-600 transition hover:border-sky-300 hover:text-sky-700 dark:border-slate-700 dark:text-slate-300">
          Sign out
        </button>
      </div>
    )
  }

  return (
    <Link href="/sign-in" className="text-sm font-medium text-slate-600 hover:text-sky-600 transition dark:text-slate-300 dark:hover:text-sky-300">
      Sign in
    </Link>
  )
}
