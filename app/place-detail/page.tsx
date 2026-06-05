'use client'
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// ─── Tag Config ───────────────────────────────────────────────────────────────
type TagKey = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack' | 'Activity' | 'Transport' | 'Accommodation' | 'Default'

interface TagConfig {
  bg: string
  text: string
  border: string
  heroBg: string
  emoji: string
  label: string
}

const TAG_STYLES: Record<TagKey, TagConfig> = {
  Breakfast:     { bg: 'bg-orange-100/80 dark:bg-orange-950/50', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-700/40', heroBg: 'from-orange-900/70',    emoji: '🍳', label: 'Breakfast'     },
  Lunch:         { bg: 'bg-yellow-100/80 dark:bg-yellow-950/50', text: 'text-yellow-700 dark:text-yellow-300', border: 'border-yellow-200 dark:border-yellow-700/40', heroBg: 'from-yellow-900/70',    emoji: '🍱', label: 'Lunch'         },
  Dinner:        { bg: 'bg-red-100/80 dark:bg-red-950/50',       text: 'text-red-700 dark:text-red-300',       border: 'border-red-200 dark:border-red-700/40',       heroBg: 'from-red-900/70',       emoji: '🍽️', label: 'Dinner'        },
  Snack:         { bg: 'bg-pink-100/80 dark:bg-pink-950/50',     text: 'text-pink-700 dark:text-pink-300',     border: 'border-pink-200 dark:border-pink-700/40',     heroBg: 'from-pink-900/70',      emoji: '🧁', label: 'Snack / Tea'   },
  Activity:      { bg: 'bg-sky-100/80 dark:bg-sky-950/50',       text: 'text-sky-700 dark:text-sky-300',       border: 'border-sky-200 dark:border-sky-700/40',       heroBg: 'from-sky-900/70',       emoji: '🎯', label: 'Activity'      },
  Transport:     { bg: 'bg-purple-100/80 dark:bg-purple-950/50', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-700/40', heroBg: 'from-purple-900/70',    emoji: '🚌', label: 'Transport'     },
  Accommodation: { bg: 'bg-emerald-100/80 dark:bg-emerald-950/50', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-700/40', heroBg: 'from-emerald-900/70', emoji: '🏨', label: 'Accommodation' },
  Default:       { bg: 'bg-slate-100/80 dark:bg-slate-800/50',   text: 'text-slate-600 dark:text-slate-300',   border: 'border-slate-200 dark:border-slate-700/40',   heroBg: 'from-slate-900/70',     emoji: '📍', label: 'Stop'          },
}

function getTagConfig(tag: string): TagConfig {
  return TAG_STYLES[tag as TagKey] ?? TAG_STYLES.Default
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function stripMarkdown(text: string): string {
  if (!text) return ''
  return text
    .replace(/#+/g, '')
    .replace(/(?:^|\n)[-*]\s+/g, ' ')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/_/g, '')
    .replace(/`/g, '')
    .trim()
}

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

function parseActivityText(activityText: string) {
  let title = ''
  let description = ''
  let tag = ''

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

  const tagMatch = title.match(/^\[(.*?)\]\s*(.*)/)
  if (tagMatch) {
    tag = tagMatch[1].trim()
    title = tagMatch[2].trim()
  }

  return {
    title: stripMarkdown(title),
    description: stripMarkdown(description),
    tag,
  }
}

function getReachAdvice(title: string, destination: string, mood: string) {
  const destinationName = destination.split(',')[0].trim()
  let baseAdvice = `To reach ${title} in ${destinationName}, standard transport options are available. `
  if (mood === 'relaxed') return baseAdvice + `Since this is a relaxed trip, we highly recommend taking a local cab (such as Uber or Ola) or hiring a private auto-rickshaw directly to the entrance.`
  if (mood === 'adventurous' || mood === 'outdoorsy') return baseAdvice + `For an active adventure, consider renting a scooter, taking a local bicycle ride, or walking if it's nearby.`
  if (mood === 'romantic') return baseAdvice + `We recommend booking a private air-conditioned taxi or a scenic auto-rickshaw ride for a comfortable, private journey together.`
  if (mood === 'cultural') return baseAdvice + `To absorb the local culture, try taking public transit (such as local buses or metro) to the nearest stop, and then walk the last mile.`
  return baseAdvice + `Ridesharing apps, local cabs, or auto-rickshaws are the most efficient ways to travel. Plan ~15-20 minutes travel time.`
}

// ─── Cost Estimate Card ───────────────────────────────────────────────────────
interface CostItem {
  name: string
  price: number
}

interface CostEstimate {
  placeType: string
  items: CostItem[]
  totalAmount: number
  currency: string
  confidence: string
  bufferApplied: number
}

// ─── Sub-Components ───────────────────────────────────────────────────────────
function PlaceDetailCoverImage({ text, destination, tagConfig }: { text: string; destination: string; tagConfig: TagConfig }) {
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
        const response = await fetch(`/api/place-image?q=${encodeURIComponent(query)}`, { signal: controller.signal })
        const json = await response.json()
        if (json.imageUrl) setImageUrl(json.imageUrl)
      } catch (error: any) {
        if (error.name !== 'AbortError') setImageUrl(null)
      }
    }

    loadImage()
    return () => controller.abort()
  }, [text, destination])

  return (
    <div className="relative h-[320px] md:h-[460px] w-full bg-slate-900 overflow-hidden rounded-[2rem] shadow-2xl">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={text}
          onLoad={() => setLoaded(true)}
          className={`h-full w-full object-cover transition duration-1000 ${loaded ? 'scale-100 opacity-50' : 'scale-105 opacity-0'}`}
        />
      ) : (
        <div className="h-full w-full animate-pulse bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800" />
      )}
      <div className={`absolute inset-0 bg-gradient-to-t ${tagConfig.heroBg} via-slate-950/40 to-transparent`} />
      <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-10 z-10 space-y-3">
        <Link href="/ai-results" className="absolute top-6 left-6 inline-flex items-center gap-2 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md px-4 py-2 text-xs font-semibold border border-white/15 transition duration-200">
          ← Back to Itinerary
        </Link>
        <span className={`inline-flex max-w-max items-center gap-2 rounded-full ${tagConfig.bg} ${tagConfig.text} border ${tagConfig.border} px-4 py-1.5 text-xs font-bold backdrop-blur-sm uppercase tracking-widest shadow-lg`}>
          {tagConfig.emoji} {tagConfig.label}
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
        const response = await fetch(`/api/place-image?q=${encodeURIComponent(query)}`, { signal: controller.signal })
        const json = await response.json()
        if (json.imageUrl) setImageUrl(json.imageUrl)
      } catch (error: any) {
        if (error.name !== 'AbortError') setImageUrl(null)
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

// ─── Cost Estimate Card ───────────────────────────────────────────────────────
function CostEstimateCard({
  placeName, description, destination, tag, tagConfig
}: {
  placeName: string; description: string; destination: string; tag: string; tagConfig: TagConfig
}) {
  const [estimate, setEstimate] = useState<CostEstimate | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!placeName || !destination) return
    setEstimate(null)
    setError('')
    setLoading(true)

    fetch('/api/estimate-cost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ placeName, description, destination, tag })
    })
      .then(r => r.json())
      .then(data => {
        if (data.ok) setEstimate(data)
        else setError(data.error || 'Could not estimate cost')
      })
      .catch(() => setError('Could not estimate cost'))
      .finally(() => setLoading(false))
  }, [placeName, destination, tag, description])

  const confidenceColor = estimate?.confidence === 'high'
    ? 'text-emerald-600 dark:text-emerald-400'
    : estimate?.confidence === 'medium'
    ? 'text-yellow-600 dark:text-yellow-400'
    : 'text-slate-400'

  const confidenceLabel = estimate?.confidence === 'high'
    ? '✅ Price verified from known menu'
    : estimate?.confidence === 'medium'
    ? '⚡ Estimated from similar places'
    : '⚠️ Rough estimate'

  return (
    <div className={`rounded-2xl border ${tagConfig.border} ${tagConfig.bg} p-5 space-y-4`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <h3 className={`text-xs font-bold uppercase tracking-wider ${tagConfig.text}`}>
          {tagConfig.emoji} Estimated Cost Breakdown
        </h3>
        {estimate && (
          <span className={`text-[10px] font-semibold ${confidenceColor} text-right`}>
            {confidenceLabel}
          </span>
        )}
      </div>

      {/* Place type label */}
      {estimate?.placeType && (
        <p className="text-[11px] text-slate-500 dark:text-slate-400 italic capitalize">
          📌 {estimate.placeType}
        </p>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-3 py-2">
          <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin opacity-60" />
          <span className="text-xs text-slate-500 dark:text-slate-400">Checking menu prices and fees…</span>
        </div>
      )}

      {/* Receipt-style itemized list */}
      {!loading && estimate?.items && estimate.items.length > 0 && (
        <div className="space-y-0 rounded-xl overflow-hidden border border-current/10">
          {estimate.items.map((item, i) => {
            const isBuffer = item.name.toLowerCase().includes('buffer') || item.name.toLowerCase().includes('misc')
            return (
              <div
                key={i}
                className={`flex items-center justify-between px-3 py-2 text-sm
                  ${isBuffer
                    ? 'bg-slate-100/60 dark:bg-slate-800/40 border-t border-current/10'
                    : i % 2 === 0
                    ? 'bg-white/60 dark:bg-slate-900/40'
                    : 'bg-white/30 dark:bg-slate-900/20'
                  }`}
              >
                <span className={`${isBuffer ? 'text-slate-400 dark:text-slate-500 text-xs italic' : 'text-slate-700 dark:text-slate-300 font-medium'}`}>
                  {isBuffer ? '+ ' : ''}{item.name}
                </span>
                <span className={`font-bold tabular-nums ${isBuffer ? 'text-slate-400 dark:text-slate-500 text-xs' : tagConfig.text}`}>
                  ₹{item.price}
                </span>
              </div>
            )
          })}
          {/* Total row */}
          <div className={`flex items-center justify-between px-3 py-3 ${tagConfig.bg} border-t-2 ${tagConfig.border}`}>
            <span className={`text-sm font-extrabold uppercase tracking-wide ${tagConfig.text}`}>
              Total (1 person)
            </span>
            <span className={`text-xl font-extrabold tabular-nums ${tagConfig.text}`}>
              ₹{estimate.totalAmount.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      )}

      {!loading && error && (
        <p className="text-xs text-slate-400 dark:text-slate-500 italic">{error}</p>
      )}
    </div>
  )
}


// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PlaceDetail() {
  const [placeTitle, setPlaceTitle] = useState('')
  const [placeDescription, setPlaceDescription] = useState('')
  const [placeIndex, setPlaceIndex] = useState(0)
  const [placeTag, setPlaceTag] = useState('')
  const [destination, setDestination] = useState('')
  const [mood, setMood] = useState('relaxed')
  const [budget, setBudget] = useState('')
  const [dayActivities, setDayActivities] = useState<string[]>([])

  const router = useRouter()

  useEffect(() => {
    const title = sessionStorage.getItem('tripease_place_title')
    const desc = sessionStorage.getItem('tripease_place_description')
    const idx = sessionStorage.getItem('tripease_place_index')
    const dest = sessionStorage.getItem('tripease_destination')
    const savedMood = sessionStorage.getItem('tripease_mood')
    const savedBudget = sessionStorage.getItem('tripease_budget')
    const actsRaw = sessionStorage.getItem('tripease_day_activities')
    const savedTag = sessionStorage.getItem('tripease_place_tag')

    if (title) setPlaceTitle(title)
    if (desc) setPlaceDescription(desc)
    if (idx) setPlaceIndex(Number(idx))
    if (dest) setDestination(dest)
    if (savedMood) setMood(savedMood)
    if (savedBudget) setBudget(savedBudget)
    if (actsRaw) setDayActivities(JSON.parse(actsRaw))
    if (savedTag) setPlaceTag(savedTag)
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

  const tagConfig = getTagConfig(placeTag)

  const handleSwitchPlace = (index: number, rawActivity: string) => {
    const { title, description, tag } = parseActivityText(rawActivity)
    setPlaceTitle(title)
    setPlaceDescription(description)
    setPlaceIndex(index)
    setPlaceTag(tag)
    sessionStorage.setItem('tripease_place_title', title)
    sessionStorage.setItem('tripease_place_description', description)
    sessionStorage.setItem('tripease_place_index', String(index))
    sessionStorage.setItem('tripease_place_tag', tag)
  }

  const reachAdvice = getReachAdvice(placeTitle, destination, mood)

  return (
    <section className="space-y-8 pb-16">

      {/* ─── Hero ─── */}
      <PlaceDetailCoverImage text={placeTitle} destination={destination} tagConfig={tagConfig} />

      {/* ─── Quick Info Pills ─── */}
      <div className="flex flex-wrap gap-3">
        <span className={`inline-flex items-center gap-2 rounded-full ${tagConfig.bg} ${tagConfig.text} border ${tagConfig.border} px-4 py-2 text-sm font-bold shadow-sm`}>
          {tagConfig.emoji} {tagConfig.label}
        </span>
        <span className="inline-flex items-center gap-2 rounded-full bg-slate-100/80 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/40 px-4 py-2 text-sm font-semibold">
          🗓️ Stop {placeIndex + 1} of {dayActivities.length}
        </span>
        {budget && (
          <span className="inline-flex items-center gap-2 rounded-full bg-sky-100/80 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-700/40 px-4 py-2 text-sm font-semibold">
            🎒 Trip Budget: {budget}
          </span>
        )}
      </div>

      {/* ─── Two-Column Layout ─── */}
      <div className="grid gap-8 lg:grid-cols-[1fr_380px] items-start">

        {/* Left Column */}
        <div className="space-y-8">

          {/* About Card */}
          <div className="rounded-3xl border border-slate-200/60 bg-white p-8 shadow-md dark:border-slate-800/40 dark:bg-slate-950 space-y-5">
            <h2 className="text-xs uppercase tracking-[0.25em] font-bold text-slate-400 dark:text-slate-500">
              ℹ️ Spot Overview
            </h2>
            <div className={`relative border-l-4 ${tagConfig.text.replace('text-', 'border-').split(' ')[0]} pl-4 py-1 italic text-slate-500 dark:text-slate-400 text-sm`}>
              Stop {placeIndex + 1} of {dayActivities.length} on your itinerary
            </div>
            <p className="text-slate-700 dark:text-slate-300 text-base leading-8">
              {placeDescription}
            </p>

            {/* ── Real Price Estimate ── */}
            <CostEstimateCard
              placeName={placeTitle}
              description={placeDescription}
              destination={destination}
              tag={placeTag}
              tagConfig={tagConfig}
            />
          </div>

          {/* Transport Card */}
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

        {/* Right Column: Map */}
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
              const { title: otherTitle, tag: otherTag } = parseActivityText(rawAct)
              const otherConfig = getTagConfig(otherTag)
              const isActive = idx === placeIndex
              return (
                <button
                  key={idx}
                  onClick={() => handleSwitchPlace(idx, rawAct)}
                  className={`flex items-center gap-3 min-w-[220px] max-w-[270px] flex-shrink-0 rounded-2xl border p-3 text-left transition duration-300 ${
                    isActive
                      ? `${otherConfig.border} ${otherConfig.bg} shadow-md`
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex-shrink-0 h-12 w-12 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-800 shadow-sm">
                    <PlaceThumbnail text={otherTitle} destination={destination} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? otherConfig.text : 'text-slate-400 dark:text-slate-500'}`}>
                      {otherConfig.emoji} {otherTag || `Stop ${idx + 1}`}
                    </span>
                    <h4 className={`text-xs font-bold truncate mt-0.5 ${isActive ? 'text-slate-950 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
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
