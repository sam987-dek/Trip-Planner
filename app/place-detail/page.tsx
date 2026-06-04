'use client'
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// Helper to strip markdown
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

// Clean image query
function cleanImageQuery(text: string, destination: string) {
  const withoutMarkdown = text
    .replace(/\*\*/g, '')
    .replace(/[`*_>#\-]/g, '')
    .replace(/\b(visit|try|eat|walk|explore|start|end|morning|afternoon|evening|night|day\s+\d+|grab|head|take|spend|enjoy|see|stop|dinner|lunch|breakfast)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()

  const focused = withoutMarkdown.split(/[.:;(|]/)[0].trim()
  return [focused, destination].filter(Boolean).join(', ')
}

function PlaceDetailCoverImage({ text, destination }: { text: string; destination: string }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setImageUrl(null)
    setLoaded(false)
    const controller = new AbortController()
    const query = cleanImageQuery(text, destination)

    async function loadImage() {
      if (!query) return
      try {
        const response = await fetch(`/api/place-image?q=${encodeURIComponent(query)}`, {
          signal: controller.signal
        })
        const json = await response.json()
        if (json.imageUrl) {
          setImageUrl(json.imageUrl)
        }
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          setImageUrl(null)
        }
      }
    }

    loadImage()
    return () => controller.abort()
  }, [text, destination])

  return (
    <div className="relative h-[300px] md:h-[450px] w-full bg-slate-900 overflow-hidden rounded-[2rem] shadow-2xl">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={text}
          onLoad={() => setLoaded(true)}
          className={`h-full w-full object-cover transition duration-1000 ${loaded ? 'scale-100 opacity-45' : 'scale-105 opacity-0'}`}
        />
      ) : (
        <div className="h-full w-full animate-pulse bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent" />
      
      <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-10 z-10 space-y-3">
        <Link href="/ai-results" className="absolute top-6 left-6 inline-flex items-center gap-2 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md px-4 py-2 text-xs font-semibold border border-white/15 transition duration-200">
          ← Back to Itinerary
        </Link>
        <span className="inline-flex max-w-max rounded-full bg-sky-500/20 border border-sky-400/30 px-3 py-1 text-xs font-bold text-sky-300 backdrop-blur-sm uppercase tracking-widest">
          📍 Destination Stop
        </span>
        <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight leading-tight">{text}</h1>
      </div>
    </div>
  )
}

function PlaceThumbnail({ text, destination }: { text: string; destination: string }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    const query = cleanImageQuery(text, destination)

    async function loadImage() {
      if (!query) return
      try {
        const response = await fetch(`/api/place-image?q=${encodeURIComponent(query)}`, {
          signal: controller.signal
        })
        const json = await response.json()
        if (json.imageUrl) {
          setImageUrl(json.imageUrl)
        }
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          setImageUrl(null)
        }
      }
    }

    loadImage()
    return () => controller.abort()
  }, [text, destination])

  return imageUrl ? (
    <img src={imageUrl} alt={text} className="h-full w-full object-cover" />
  ) : (
    <div className="h-full w-full bg-slate-300 dark:bg-slate-800 animate-pulse" />
  )
}

function getReachAdvice(title: string, destination: string, mood: string) {
  const destinationName = destination.split(',')[0].trim()
  let baseAdvice = `To reach ${title} in ${destinationName}, standard transport options are available. `
  
  if (mood === 'relaxed') {
    return baseAdvice + `Since this is a relaxed trip, we highly recommend taking a local cab (such as Uber or Ola) or hiring a private auto-rickshaw directly to the entrance. This minimizes walking fatigue and keeps transit stress-free.`
  } else if (mood === 'adventurous' || mood === 'outdoorsy') {
    return baseAdvice + `For an active adventure, consider renting a scooter, taking a local bicycle ride, or walking if it's nearby. It gives you maximum flexibility to explore the alleys and enjoy the surrounding scenery.`
  } else if (mood === 'romantic') {
    return baseAdvice + `We recommend booking a private air-conditioned taxi or a scenic auto-rickshaw ride for a comfortable, private journey together to the destination.`
  } else if (mood === 'cultural') {
    return baseAdvice + `To absorb the local culture, try taking public transit (such as local buses or metro) to the nearest stop, and then walk the last mile to explore historic streets.`
  } else {
    return baseAdvice + `Ridesharing apps, local cabs, or auto-rickshaws are the most efficient ways to travel. Plan ~15-20 minutes travel time depending on local traffic.`
  }
}

// Custom parser to split activity text into title and description
function parseActivityText(activityText: string) {
  let title = ''
  let description = ''

  const boldMatch = activityText.match(/^\*\*([^*]+)\*\*[:.-]?\s*(.*)/)
  if (boldMatch) {
    title = boldMatch[1].trim()
    description = boldMatch[2].trim()
  } else {
    const parts = activityText.split(':')
    if (parts.length > 1) {
      title = parts[0].trim()
      description = parts.slice(1).join(':').trim()
    } else {
      title = activityText.trim()
      description = ''
    }
  }

  return {
    title: stripMarkdown(title),
    description: stripMarkdown(description)
  }
}

export default function PlaceDetail() {
  const [placeTitle, setPlaceTitle] = useState('')
  const [placeDescription, setPlaceDescription] = useState('')
  const [placeIndex, setPlaceIndex] = useState(0)
  const [destination, setDestination] = useState('')
  const [mood, setMood] = useState('relaxed')
  const [dayActivities, setDayActivities] = useState<string[]>([])
  
  const router = useRouter()

  useEffect(() => {
    const title = sessionStorage.getItem('tripease_place_title')
    const desc = sessionStorage.getItem('tripease_place_description')
    const idx = sessionStorage.getItem('tripease_place_index')
    const dest = sessionStorage.getItem('tripease_destination')
    const savedMood = sessionStorage.getItem('tripease_mood')
    const actsRaw = sessionStorage.getItem('tripease_day_activities')

    if (title) setPlaceTitle(title)
    if (desc) setPlaceDescription(desc)
    if (idx) setPlaceIndex(Number(idx))
    if (dest) setDestination(dest)
    if (savedMood) setMood(savedMood)
    if (actsRaw) setDayActivities(JSON.parse(actsRaw))
  }, [])

  if (!placeTitle) {
    return (
      <div className="text-center py-20 text-slate-500">
        <p>No details found for this place.</p>
        <Link href="/ai-results" className="mt-4 inline-block text-sky-500 font-semibold hover:underline">
          Go to Itinerary
        </Link>
      </div>
    )
  }

  const handleSwitchPlace = (index: number, rawActivity: string) => {
    const { title, description } = parseActivityText(rawActivity)
    setPlaceTitle(title)
    setPlaceDescription(description)
    setPlaceIndex(index)
    
    // Sync to session storage as well
    sessionStorage.setItem('tripease_place_title', title)
    sessionStorage.setItem('tripease_place_description', description)
    sessionStorage.setItem('tripease_place_index', String(index))
  }

  const reachAdvice = getReachAdvice(placeTitle, destination, mood)

  return (
    <section className="space-y-8 pb-16">
      
      {/* ─── Hero Header Banner ─── */}
      <PlaceDetailCoverImage text={placeTitle} destination={destination} />

      {/* ─── Creative Two-Column Layout ─── */}
      <div className="grid gap-8 lg:grid-cols-[1fr_380px] items-start">
        
        {/* Left Column: Details & Directions */}
        <div className="space-y-8">
          
          {/* About / Description Card */}
          <div className="rounded-3xl border border-slate-200/60 bg-white p-8 shadow-md dark:border-slate-800/40 dark:bg-slate-950 space-y-4">
            <h2 className="text-xs uppercase tracking-[0.25em] font-bold text-slate-400 dark:text-slate-500">
              ℹ️ Spot Overview
            </h2>
            <div className="relative border-l-4 border-sky-500 pl-4 py-1 italic text-slate-500 dark:text-slate-405 text-sm">
              Stop {placeIndex + 1} of {dayActivities.length} on your itinerary
            </div>
            <p className="text-slate-700 dark:text-slate-300 text-base leading-8">
              {placeDescription}
            </p>
          </div>

          {/* Transport / How to Reach Card */}
          <div className="rounded-3xl border border-slate-200/60 bg-white p-8 shadow-md dark:border-slate-800/40 dark:bg-slate-950 space-y-5">
            <div className="space-y-2">
              <h2 className="text-xs uppercase tracking-[0.25em] font-bold text-slate-400 dark:text-slate-500">
                🚗 Transportation & Access Advice
              </h2>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-7">
                {reachAdvice}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <a
                href={`https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=${encodeURIComponent(placeTitle + ', ' + destination)}&travelmode=driving&dir_action=navigate`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-sky-500 hover:bg-sky-600 text-white font-semibold text-sm px-6 py-3 shadow-lg shadow-sky-500/20 transition duration-200"
              >
                🗺️ Open Google Maps Directions
              </a>
              <Link href="/ai-results" className="inline-flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-sm px-6 py-3 transition duration-200">
                Back to Timeline View
              </Link>
            </div>
          </div>

        </div>

        {/* Right Column: Location Map */}
        <div className="space-y-6">
          <div className="rounded-[2rem] border border-slate-200/60 bg-white p-6 shadow-lg dark:border-slate-800/40 dark:bg-slate-950 space-y-4">
            <h3 className="text-xs uppercase tracking-[0.2em] font-bold text-slate-400 dark:text-slate-500">
              📍 Interactive Map Location
            </h3>
            
            <div className="relative group cursor-pointer overflow-hidden rounded-2xl border border-slate-200/60 dark:border-slate-800 aspect-[4/3] bg-slate-100 dark:bg-slate-900 shadow-inner">
              <iframe
                src={`https://maps.google.com/maps?q=${encodeURIComponent(placeTitle + ', ' + destination)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                className="rounded-2xl pointer-events-none"
              />
              <a
                href={`https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=${encodeURIComponent(placeTitle + ', ' + destination)}&travelmode=driving&dir_action=navigate`}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute inset-0 z-10 flex items-center justify-center bg-black/0 group-hover:bg-black/10 transition duration-300"
                title="Click to get directions on Google Maps"
              >
                <span className="opacity-0 group-hover:opacity-100 rounded-full bg-slate-900/85 backdrop-blur-md px-4 py-2 text-xs font-semibold text-white transition duration-300 shadow-lg border border-white/10">
                  🗺️ View on Google Maps
                </span>
              </a>
            </div>

            <div className="text-[11px] text-slate-500 dark:text-slate-450 leading-relaxed text-center italic">
              Map centered on {placeTitle}, {destination.split(',')[0]}
            </div>
          </div>
        </div>

      </div>

      {/* ─── Bottom Timeline Slider ─── */}
      {dayActivities.length > 0 && (
        <div className="rounded-[2rem] border border-slate-200/60 bg-white p-6 shadow-lg dark:border-slate-800/40 dark:bg-slate-950 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs uppercase tracking-[0.2em] font-bold text-slate-400 dark:text-slate-500">
              🧭 Browse Stops Timeline
            </h3>
            <span className="text-xs font-bold text-sky-500 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/30 px-3 py-1 rounded-full">
              Day Route
            </span>
          </div>

          <div className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-none">
            {dayActivities.map((rawAct, idx) => {
              const { title: otherTitle } = parseActivityText(rawAct)
              const isActive = idx === placeIndex
              return (
                <button
                  key={idx}
                  onClick={() => handleSwitchPlace(idx, rawAct)}
                  className={`flex items-center gap-3 min-w-[210px] max-w-[260px] flex-shrink-0 rounded-2xl border p-3 text-left transition duration-300 ${
                    isActive
                      ? 'border-sky-500 bg-gradient-to-br from-sky-500/10 to-emerald-500/5 shadow-md dark:border-sky-500 dark:from-sky-950/40 dark:to-emerald-950/20'
                      : 'border-slate-200 hover:border-slate-350 dark:border-slate-850 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30'
                  }`}
                >
                  <div className="flex-shrink-0 h-12 w-12 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-800 shadow-sm">
                    <PlaceThumbnail text={otherTitle} destination={destination} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? 'text-sky-500 dark:text-sky-400' : 'text-slate-400 dark:text-slate-500'}`}>
                      Stop {idx + 1}
                    </span>
                    <h4 className={`text-xs font-bold truncate mt-0.5 ${isActive ? 'text-slate-950 dark:text-white' : 'text-slate-700 dark:text-slate-355'}`}>
                      {otherTitle}
                    </h4>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

    </section>
  )
}
