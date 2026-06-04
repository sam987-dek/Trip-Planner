'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'

type SavedTrip = {
  id: number | string
  destination: string
  createdAt: string
  text: string
  source: 'local' | 'cloud'
}

function stripMarkdown(text: string): string {
  if (!text) return ''
  return text
    .replace(/#+/g, '') // remove headings hashes
    .replace(/(?:^|\n)[-*]\s+/g, ' ') // remove list bullets at start of lines
    .replace(/\*\*/g, '') // remove bold
    .replace(/\*/g, '') // remove italic
    .replace(/_/g, '') // remove italic underscores
    .replace(/`/g, '') // remove backticks
    .trim()
}

function TripCoverImage({ destination }: { destination: string }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let active = true
    async function fetchImage() {
      try {
        const response = await fetch(`/api/place-image?q=${encodeURIComponent(`${destination} travel landmark`)}`)
        const json = await response.json()
        if (active && json.imageUrl) {
          setImageUrl(json.imageUrl)
        }
      } catch (err) {
        console.error('Failed to load cover image:', err)
      }
    }
    fetchImage()
    return () => {
      active = false
    }
  }, [destination])

  return (
    <div className="relative aspect-[16/8] w-full overflow-hidden bg-slate-100 dark:bg-slate-900">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={destination}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          className={`h-full w-full object-cover transition duration-750 ease-out group-hover:scale-105 ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-sky-50 to-emerald-50 text-slate-400 dark:from-slate-900 dark:to-slate-800">
          <svg className="h-8 w-8 animate-pulse text-sky-400/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      )}
    </div>
  )
}

export default function Saved(){
  const [trips, setTrips] = useState<SavedTrip[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function loadTrips() {
      setLoading(true)
      const localRaw = JSON.parse(localStorage.getItem('tripease_saved_trips') || '[]')
      const localTrips: SavedTrip[] = localRaw.map((t: any) => ({
        ...t,
        source: 'local'
      }))

      let mergedTrips = [...localTrips]

      try {
        const isTripsTableMissing = sessionStorage.getItem('tripease_trips_table_missing') === 'true'
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user && !isTripsTableMissing) {
          const { data: dbTrips, error: tripsError } = await supabase
            .from('trips')
            .select('id, title, created_at')
            .order('created_at', { ascending: false })

          if (tripsError) {
            if (tripsError.message?.includes("Could not find the table 'public.trips'") || tripsError.code === 'PGRST205') {
              sessionStorage.setItem('tripease_trips_table_missing', 'true')
            }
            throw tripsError
          }

          if (dbTrips && dbTrips.length > 0) {
            const { data: dbItins, error: itinsError } = await supabase
              .from('itineraries')
              .select('trip_id, content')

            if (itinsError) throw itinsError

            const mappedDbTrips: SavedTrip[] = dbTrips.map((t: any) => {
              const itin = dbItins?.find((i: any) => i.trip_id === t.id)
              return {
                id: t.id,
                destination: t.title,
                createdAt: t.created_at,
                text: itin?.content?.text || '',
                source: 'cloud'
              }
            })

            mergedTrips = [...mappedDbTrips, ...localTrips]
          }
        }
      } catch (err: any) {
        console.warn('Failed to fetch trips from Supabase:', err.message)
      } finally {
        setTrips(mergedTrips)
        setLoading(false)
      }
    }

    loadTrips()
  }, [])

  const handleViewTrip = (trip: SavedTrip) => {
    // Save to sessionStorage so ai-results can display it page-by-page
    sessionStorage.setItem('tripease_results', JSON.stringify({ content: trip.text }))
    sessionStorage.setItem('tripease_destination', trip.destination)
    
    // Clear out stale parameters to let pagination read the saved text content directly
    sessionStorage.removeItem('tripease_coords')
    sessionStorage.removeItem('tripease_mood')
    sessionStorage.removeItem('tripease_traveler_type')
    sessionStorage.removeItem('tripease_diet')
    sessionStorage.removeItem('tripease_start_date')
    sessionStorage.removeItem('tripease_dates_type')

    router.push('/ai-results')
  }

  async function clearTrips() {
    const isTripsTableMissing = sessionStorage.getItem('tripease_trips_table_missing') === 'true'
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user && !isTripsTableMissing) {
        const { error } = await supabase
          .from('trips')
          .delete()
          .eq('user_id', session.user.id)
        if (error) throw error
      }
    } catch (err: any) {
      console.warn('Failed to clear cloud trips:', err.message)
    }

    localStorage.removeItem('tripease_saved_trips')
    setTrips([])
  }

  async function deleteTrip(id: number | string, source: 'local' | 'cloud') {
    const isTripsTableMissing = sessionStorage.getItem('tripease_trips_table_missing') === 'true'
    if (source === 'cloud' && !isTripsTableMissing) {
      try {
        const { error } = await supabase.from('trips').delete().eq('id', id)
        if (error) throw error
        setTrips(trips.filter((t) => t.id !== id))
      } catch (err: any) {
        console.warn('Failed to delete cloud trip:', err.message)
      }
    } else {
      const local = JSON.parse(localStorage.getItem('tripease_saved_trips') || '[]')
      const updated = local.filter((t: any) => t.id !== id)
      localStorage.setItem('tripease_saved_trips', JSON.stringify(updated))
      setTrips(trips.filter((t) => t.id !== id))
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-sky-600 font-semibold">Saved plans</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">Saved Trips</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-300">Your saved AI itineraries from your cloud account and this browser.</p>
        </div>
        {trips.length > 0 && (
          <button onClick={clearTrips} className="rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-700 transition hover:border-red-300 hover:text-red-600 dark:border-slate-700 dark:text-slate-300">
            Clear saved
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-sky-500 dark:border-slate-700 dark:border-t-sky-400"></div>
        </div>
      ) : trips.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-950">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">No saved trips yet</h2>
          <p className="mx-auto mt-2 max-w-xl text-slate-600 dark:text-slate-300">Generate an itinerary, then use the save button on the results page to keep it here.</p>
          <Link href="/create-trip" className="mt-5 inline-flex rounded-full bg-sky-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-sky-700">
            Create a trip
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {trips.map((trip) => (
            <article 
              key={trip.id} 
              onClick={() => handleViewTrip(trip)}
              className="group relative cursor-pointer overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-lg shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-950 dark:shadow-slate-900/40 transition hover:border-sky-300 dark:hover:border-sky-900 hover:shadow-xl hover:shadow-slate-200/80 dark:hover:shadow-slate-900/60 duration-300"
            >
              <TripCoverImage destination={trip.destination} />
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-semibold text-slate-900 dark:text-white group-hover:text-sky-500 transition duration-300">{trip.destination}</h2>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        trip.source === 'cloud' 
                          ? 'bg-purple-50 text-purple-700 border border-purple-100 dark:bg-purple-950/20 dark:text-purple-300 dark:border-purple-900/30' 
                          : 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800'
                      }`}>
                        {trip.source === 'cloud' ? 'Cloud' : 'Local'}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{new Date(trip.createdAt).toLocaleDateString()}</p>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation() // Avoid triggering handleViewTrip
                      deleteTrip(trip.id, trip.source)
                    }} 
                    className="rounded-full p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30 transition"
                    title="Delete trip"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
                <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-600 dark:text-slate-355">{stripMarkdown(trip.text)}</p>
                <div className="mt-4 text-xs font-semibold text-sky-500 dark:text-sky-400 group-hover:underline flex items-center gap-1">
                  View Itinerary <span>→</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
