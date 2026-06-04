import { createClient } from '@supabase/supabase-js'

let url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

if (!url || !anon) {
  console.warn('Supabase env variables are not set')
}

if (url.endsWith('/rest/v1') || url.endsWith('/rest/v1/')) {
  console.warn('Supabase URL included /rest/v1; stripping it for client initialization')
  url = url.replace(/\/rest\/v1\/?$/, '')
}

export const isSupabaseConfigured = Boolean(url && anon)

// If env vars are present, create a real client. Otherwise export a safe stub
let supabaseClient: any
if (isSupabaseConfigured) {
  supabaseClient = createClient(url, anon)
} else {
  // minimal stub to avoid runtime crashes during development when env vars are missing
  supabaseClient = {
    auth: {
      onAuthStateChange: (_cb: any) => ({ data: { subscription: { unsubscribe: () => {} } } }),
      getSession: async () => ({ data: { session: null } }),
      signInWithOtp: async (_opts: any) => ({ data: null, error: { message: 'Supabase env variables are not set' } }),
      signInWithOAuth: async (_opts: any) => ({ data: null, error: { message: 'Supabase env variables are not set' } }),
      signOut: async () => ({ error: null })
    }
  }
}

export const supabase = supabaseClient

let isUsersTableMissing = false

export async function syncUserSession(user: any) {
  if (!user || !isSupabaseConfigured || isUsersTableMissing) return
  try {
    const { error } = await supabase.from('users').upsert(
      {
        id: user.id,
        email: user.email
      },
      { onConflict: 'id' }
    )
    if (error) {
      if (error.message?.includes("Could not find the table 'public.users'") || error.code === 'PGRST205') {
        isUsersTableMissing = true
      }
      console.warn('Failed to sync user session to public.users table:', error.message)
    }
  } catch (err: any) {
    console.warn('Error syncing user session:', err.message)
  }
}

