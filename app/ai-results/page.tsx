'use client'
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getItineraryText(data: any) {
  return data?.choices?.[0]?.message?.content || data?.content || JSON.stringify(data, null, 2)
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

// Custom parser to split activity text into title and description
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

  // Extract [Tag] from title if present
  const tagMatch = title.match(/^\[(.*?)\]\s*(.*)/)
  if (tagMatch) {
    tag = tagMatch[1].trim()
    title = tagMatch[2].trim()
  }

  return {
    title: stripMarkdown(title),
    description: stripMarkdown(description),
    tag: tag
  }
}

// Helper to calculate the date of a specific day
function getDayDate(startDateStr: string, dayIndex: number): Date {
  const baseDate = new Date(startDateStr)
  if (isNaN(baseDate.getTime())) {
    const today = new Date()
    today.setDate(today.getDate() + dayIndex)
    return today
  }
  baseDate.setDate(baseDate.getDate() + dayIndex)
  return baseDate
}

function formatDateToReadable(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  })
}

// Find matching weather forecast from OpenWeather 5-day list
function getWeatherForDate(weatherData: any, targetDate: Date): any {
  if (!weatherData || !weatherData.list) return null
  const targetDateStr = targetDate.toISOString().split('T')[0] // YYYY-MM-DD

  // Find midday (12:00:00) forecast on that date
  const middayForecast = weatherData.list.find((item: any) => {
    return item.dt_txt.startsWith(targetDateStr) && item.dt_txt.includes('12:00:00')
  })
  if (middayForecast) return middayForecast

  // Fallback: first forecast available on that day
  const anyForecast = weatherData.list.find((item: any) => {
    return item.dt_txt.startsWith(targetDateStr)
  })
  return anyForecast || null
}

// ─── Sub-Components ───────────────────────────────────────────────────────────

function SuggestionImage({ text, destination }: { text: string; destination: string }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

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

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/60 bg-slate-100 dark:border-slate-800/40 dark:bg-slate-900 aspect-[16/10] w-full">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={cleanImageQuery(text, destination)}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          className={`h-full w-full object-cover transition duration-700 hover:scale-105 ${loaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}`}
        />
      ) : (
        <div className="h-full w-full animate-pulse bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800" />
      )}
    </div>
  )
}

function ModalPlaceImage({ text, destination }: { text: string; destination: string }) {
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
    <div className="relative aspect-[21/9] w-full bg-slate-100 dark:bg-slate-900 overflow-hidden">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={text}
          onLoad={() => setLoaded(true)}
          className={`h-full w-full object-cover transition duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        />
      ) : (
        <div className="h-full w-full animate-pulse bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 to-transparent" />
    </div>
  )
}

function ModalThumbnailImage({ text, destination }: { text: string; destination: string }) {
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
    <div className="h-full w-full bg-slate-300 dark:bg-slate-700 animate-pulse" />
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


// Day Itinerary Parser
interface DayData {
  dayNum: number
  title: string
  intro?: string
  activities: string[]
}

function parseItinerary(text: string): { days: DayData[], budgetLines: string[] } {
  const lines = text.split('\n')
  const days: DayData[] = []
  const budgetLines: string[] = []
  let currentDay: DayData | null = null
  let inBudgetSection = false

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue

    // Detect Budget Section
    if (line.match(/^#{2,4}\s*Trip Budget Estimate/i)) {
      inBudgetSection = true
      continue
    }

    if (inBudgetSection) {
      if (line.match(/^(?:#{1,4}\s*)?(?:\*{1,2}\s*)?Day\s+(\d+)/i)) {
        inBudgetSection = false // Left budget section
      } else {
        budgetLines.push(line.replace(/^[-*]\s*/, '').replace(/\*\*/g, '').trim())
        continue
      }
    }

    // ── Strict day-heading detection ──────────────────────────────────────────
    const dayMatch = line.match(/^(?:#{1,4}\s*)?(?:\*{1,2}\s*)?Day\s+(\d+)\s*(?:\*{1,2})?\s*[:–—-]\s*(.*)/i)
    if (dayMatch) {
      const dayNum = parseInt(dayMatch[1], 10)
      const title = stripMarkdown(dayMatch[2].trim())
      currentDay = {
        dayNum,
        title: title || `Day ${dayNum}`,
        activities: [],
        intro: ''
      }
      days.push(currentDay)
      continue
    }

    if (currentDay) {
      if (line.startsWith('* ') || line.startsWith('- ')) {
        currentDay.activities.push(line.replace(/^[-*]\s*/, '').trim())
      } else if (!line.startsWith('#')) {
        // Append to intro paragraph
        if ((currentDay.intro?.length ?? 0) < 600) {
          if (currentDay.intro) {
            currentDay.intro += ' ' + line
          } else {
            currentDay.intro = line
          }
        }
      }
    } else {
      // Activities before any day heading — put them in a default Day 1
      if (line.startsWith('* ') || line.startsWith('- ')) {
        currentDay = {
          dayNum: 1,
          title: 'Day 1',
          activities: [line.replace(/^[-*]\s*/, '').trim()],
          intro: ''
        }
        days.push(currentDay)
      }
    }
  }

  // Fallback: if the parser found nothing, treat the whole text as one day
  if (days.length === 0 && budgetLines.length === 0) {
    const allActivities = lines
      .filter(l => l.trim().startsWith('* ') || l.trim().startsWith('- '))
      .map(l => l.replace(/^[-*]\s*/, '').trim())
    days.push({
      dayNum: 1,
      title: 'Itinerary Plan',
      activities: allActivities,
      intro: text.split('\n').find(l => l.trim() && !l.trim().startsWith('*') && !l.trim().startsWith('-')) || ''
    })
  }

  // Clean markdown from intros and titles of each day
  for (const d of days) {
    if (d.intro) d.intro = stripMarkdown(d.intro)
    if (d.title) d.title = stripMarkdown(d.title)
  }

  return { days, budgetLines }
}

// Helper to map mood to descriptive emoji and text
function getMoodInfo(mood: string) {
  switch (mood.toLowerCase()) {
    case 'relaxed': return { emoji: '😌', label: 'Chill & Relaxed' }
    case 'adventurous': return { emoji: '🧗', label: 'Active & Adventurous' }
    case 'cultural': return { emoji: '🏛️', label: 'Culture & History' }
    case 'foodie': return { emoji: '🍕', label: 'Food & Culinary' }
    case 'romantic': return { emoji: '💖', label: 'Romantic Getaway' }
    case 'outdoorsy': return { emoji: '🚴', label: 'Outdoors & Nature' }
    default: return { emoji: '✈️', label: mood }
  }
}

// Helper to map traveler type
function getTravelerInfo(type: string) {
  switch (type.toLowerCase()) {
    case 'solo': return { emoji: '🧑', label: 'Solo Traveler' }
    case 'couple': return { emoji: '👩‍❤️‍👨', label: 'Couple Trip' }
    case 'family': return { emoji: '👨‍👩‍👧‍👦', label: 'Family Vacation' }
    case 'friends': return { emoji: '👥', label: 'Friends Getaway' }
    default: return { emoji: '🧭', label: type }
  }
}

// Helper to map dietary preference
function getDietInfo(diet: string) {
  switch (diet.toLowerCase()) {
    case 'veg': return { emoji: '🥦', label: 'Vegetarian Only' }
    case 'non-veg': return { emoji: '🍗', label: 'Non-Vegetarian' }
    default: return { emoji: '🍽️', label: 'Any Diet' }
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AIResults() {
  const [data, setData] = useState<any>(null)
  const router = useRouter()
  const [destination, setDestination] = useState('')
  const [coverUrl, setCoverUrl] = useState('')
  const [coverLoaded, setCoverLoaded] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveStatus, setSaveStatus] = useState<string>('')
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null)
  
  const [mood, setMood] = useState('relaxed')
  const [travelerType, setTravelerType] = useState('solo')
  const [diet, setDiet] = useState('any')
  const [startDate, setStartDate] = useState('')
  const [datesType, setDatesType] = useState('3')
  const [activeDayIndex, setActiveDayIndex] = useState(0)

  const [weatherData, setWeatherData] = useState<any>(null)
  const [weatherLoading, setWeatherLoading] = useState(false)

  // Load state from sessionStorage
  useEffect(() => {
    const raw = sessionStorage.getItem('tripease_results')
    const dest = sessionStorage.getItem('tripease_destination')
    const rawCoords = sessionStorage.getItem('tripease_coords')
    const savedMood = sessionStorage.getItem('tripease_mood')
    const savedType = sessionStorage.getItem('tripease_traveler_type')
    const savedDiet = sessionStorage.getItem('tripease_diet')
    const savedStart = sessionStorage.getItem('tripease_start_date')
    const savedDatesType = sessionStorage.getItem('tripease_dates_type')

    if (raw) setData(JSON.parse(raw))
    if (dest) setDestination(dest)
    if (rawCoords) setCoords(JSON.parse(rawCoords))
    if (savedMood) setMood(savedMood)
    if (savedType) setTravelerType(savedType)
    if (savedDiet) setDiet(savedDiet)
    if (savedStart) setStartDate(savedStart)
    if (savedDatesType) setDatesType(savedDatesType)
  }, [])

  // Load Destination Cover Image
  useEffect(() => {
    if (destination) {
      const controller = new AbortController()
      async function loadDestinationImage() {
        try {
          const response = await fetch(`/api/place-image?q=${encodeURIComponent(`${destination} travel landmark`)}`, {
            signal: controller.signal
          })
          const json = await response.json()
          if (json.imageUrl) setCoverUrl(json.imageUrl)
        } catch (error: any) {
          if (error.name !== 'AbortError') setCoverUrl('')
        }
      }
      loadDestinationImage()
      return () => controller.abort()
    }
  }, [destination])

  // Load Weather Forecast (Live or Seasonal Fallback)
  useEffect(() => {
    if (coords && destination) {
      setWeatherLoading(true)
      const queryParams = new URLSearchParams({
        lat: String(coords.lat),
        lon: String(coords.lon),
        destination: destination,
        startDate: startDate || new Date().toISOString().split('T')[0],
        duration: (datesType || '3') + ' Days'
      })
      fetch(`/api/weather?${queryParams.toString()}`)
        .then((res) => res.json())
        .then((json) => {
          if (json.ok && json.data) {
            setWeatherData(json.data)
          }
        })
        .catch((err) => console.warn('Failed to fetch weather forecast:', err))
        .finally(() => setWeatherLoading(false))
    }
  }, [coords, destination, startDate, datesType])

  if (!data) return <div className="text-center py-20 text-slate-500">No results found. Create a trip first.</div>

  const { days: parsedDays, budgetLines } = data ? parseItinerary(getItineraryText(data)) : { days: [], budgetLines: [] }
  const activeDay = parsedDays[activeDayIndex] || parsedDays[0]
  
  // Calculate active day calendar date
  const activeDayDate = getDayDate(startDate || new Date().toISOString(), activeDayIndex)
  const formattedActiveDate = formatDateToReadable(activeDayDate)

  // Find active day weather forecast
  const activeDayWeather = getWeatherForDate(weatherData, activeDayDate)

  async function saveTrip() {
    try {
      const isTripsTableMissing = sessionStorage.getItem('tripease_trips_table_missing') === 'true'
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user

      if (user && !isTripsTableMissing) {
        setSaveStatus('Saving to cloud...')
        
        // Fail-safe: Upsert public user profile to avoid foreign key violations in Supabase if database trigger didn't run
        const { error: userSyncError } = await supabase.from('users').upsert({
          id: user.id,
          email: user.email
        }, { onConflict: 'id' })

        if (userSyncError) {
          if (userSyncError.message?.includes("Could not find the table 'public.users'") || userSyncError.code === 'PGRST205') {
            sessionStorage.setItem('tripease_trips_table_missing', 'true')
          }
          console.warn('Failsafe user session sync failed:', userSyncError.message)
        }

        const tripId = crypto.randomUUID()
        const itineraryId = crypto.randomUUID()

        const { error: tripError } = await supabase.from('trips').insert({
          id: tripId,
          user_id: user.id,
          title: destination || 'AI itinerary',
          start_date: startDate || new Date().toISOString().split('T')[0],
          end_date: startDate || new Date().toISOString().split('T')[0],
        })

        if (tripError) {
          if (tripError.message?.includes("Could not find the table 'public.trips'") || tripError.code === 'PGRST205') {
            sessionStorage.setItem('tripease_trips_table_missing', 'true')
          }
          throw new Error(tripError.message)
        }

        const { error: itinError } = await supabase.from('itineraries').insert({
          id: itineraryId,
          trip_id: tripId,
          content: { text: getItineraryText(data) }
        })

        if (itinError) throw new Error(itinError.message)

        setSaved(true)
        setSaveStatus('Saved to your cloud account!')
      } else {
        const trips = JSON.parse(localStorage.getItem('tripease_saved_trips') || '[]')
        const trip = {
          id: Date.now(),
          destination: destination || 'AI itinerary',
          createdAt: new Date().toISOString(),
          text: getItineraryText(data)
        }

        localStorage.setItem('tripease_saved_trips', JSON.stringify([trip, ...trips].slice(0, 20)))
        setSaved(true)
        if (isTripsTableMissing) {
          setSaveStatus('Cloud save bypassed (schema missing). Saved locally!')
        } else {
          setSaveStatus('Saved locally in browser!')
        }
      }
    } catch (err: any) {
      console.warn('Failed to save trip to cloud, falling back to local storage:', err.message)
      try {
        const trips = JSON.parse(localStorage.getItem('tripease_saved_trips') || '[]')
        const trip = {
          id: Date.now(),
          destination: destination || 'AI itinerary',
          createdAt: new Date().toISOString(),
          text: getItineraryText(data)
        }

        localStorage.setItem('tripease_saved_trips', JSON.stringify([trip, ...trips].slice(0, 20)))
        setSaved(true)
        
        if (err.message?.includes("Could not find the table 'public.trips'") || err.message?.includes("PGRST205")) {
          sessionStorage.setItem('tripease_trips_table_missing', 'true')
          setSaveStatus("Cloud save failed (schema missing). Saved locally in browser!")
        } else {
          setSaveStatus(`Cloud save failed. Saved locally in browser!`)
        }
      } catch (localErr: any) {
        setSaveStatus(`Failed to save locally: ${localErr.message}`)
      }
    }
  }

  const moodInfo = getMoodInfo(mood)
  const travelerInfo = getTravelerInfo(travelerType)
  const dietInfo = getDietInfo(diet)

  return (
    <section className="space-y-8 pb-12">
      
      {/* ─── Premium Header Cover Card ─── */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-950 text-white shadow-2xl">
        {coverUrl ? (
          <div className="absolute inset-0">
            <img
              src={coverUrl}
              alt={destination}
              onLoad={() => setCoverLoaded(true)}
              className={`h-full w-full object-cover transition duration-1000 ${coverLoaded ? 'scale-100 opacity-30' : 'scale-105 opacity-0'}`}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-sky-950 opacity-40" />
        )}

        <div className="relative z-10 p-8 sm:p-10 flex flex-col justify-end min-h-[220px] md:min-h-[260px] space-y-6">
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2 text-xs font-semibold text-sky-300">
              <span className="rounded-full bg-sky-500/10 border border-sky-400/20 px-3 py-1 backdrop-blur-md">
                ✨ Custom AI Itinerary
              </span>
              <span className="rounded-full bg-emerald-500/10 border border-emerald-400/20 px-3 py-1 backdrop-blur-md capitalize">
                ⏱️ {datesType} Days
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white">{destination}</h1>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-white/10">
            {/* Info Grid */}
            <div className="flex flex-wrap gap-4 text-sm text-slate-200">
              <div className="flex items-center gap-2 rounded-2xl bg-white/5 border border-white/10 px-4 py-2 backdrop-blur-md">
                <span>📅</span>
                <span>Starts: {startDate ? new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Today'}</span>
              </div>
              <div className="flex items-center gap-2 rounded-2xl bg-white/5 border border-white/10 px-4 py-2 backdrop-blur-md">
                <span>{moodInfo.emoji}</span>
                <span>{moodInfo.label}</span>
              </div>
              <div className="flex items-center gap-2 rounded-2xl bg-white/5 border border-white/10 px-4 py-2 backdrop-blur-md">
                <span>{travelerInfo.emoji}</span>
                <span>{travelerInfo.label}</span>
              </div>
              <div className="flex items-center gap-2 rounded-2xl bg-white/5 border border-white/10 px-4 py-2 backdrop-blur-md">
                <span>{dietInfo.emoji}</span>
                <span>{dietInfo.label}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={saved && !saveStatus.includes('Failed')}
                onClick={saveTrip}
                className="rounded-full bg-gradient-to-r from-sky-500 to-emerald-500 hover:brightness-110 px-6 py-2.5 text-sm font-semibold text-white shadow-xl shadow-sky-500/20 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saved ? 'Saved ✓' : 'Save Trip'}
              </button>
              {saveStatus && (
                <span className="text-xs font-semibold px-3 py-1.5 bg-white/10 text-white rounded-full border border-white/15 backdrop-blur-md">
                  {saveStatus}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Horizontal Day-by-Day Pagination Tabs ─── */}
      <div className="flex flex-col gap-2">
        <div className="text-xs uppercase tracking-[0.25em] font-semibold text-slate-400 dark:text-slate-500 pl-1">
          Select Day
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {parsedDays.map((day, idx) => {
            const isActive = idx === activeDayIndex
            const dayDate = getDayDate(startDate || new Date().toISOString(), idx)
            return (
              <button
                key={day.dayNum}
                onClick={() => setActiveDayIndex(idx)}
                className={`flex flex-col items-start min-w-[110px] rounded-2xl border px-4 py-3 text-left transition duration-300 ${
                  isActive
                    ? 'border-sky-500 bg-gradient-to-br from-sky-500/10 to-emerald-500/5 shadow-md shadow-sky-500/10 dark:border-sky-500 dark:from-sky-950/40 dark:to-emerald-950/20'
                    : 'border-slate-200 hover:border-slate-350 dark:border-slate-800 dark:hover:border-slate-700 bg-white dark:bg-slate-950'
                }`}
              >
                <span className={`text-xs font-bold uppercase tracking-wider ${isActive ? 'text-sky-500 dark:text-sky-400' : 'text-slate-400 dark:text-slate-500'}`}>
                  Day {day.dayNum}
                </span>
                <span className={`text-sm font-semibold mt-1 truncate w-full ${isActive ? 'text-slate-950 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                  {day.title}
                </span>
                <span className="text-[10px] text-slate-500 mt-0.5">
                  {formatDateToReadable(dayDate)}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ─── Main Content Layout Grid ─── */}
      <div className="grid gap-8 lg:grid-cols-[1fr_350px] items-start">
        
        {/* Left Column: Active Day Details */}
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200/60 bg-white p-6 shadow-md dark:border-slate-800/40 dark:bg-slate-950">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 font-bold text-sm">
                {activeDay.dayNum}
              </div>
              <div>
                <span className="text-xs font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-widest">Active Schedule</span>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{activeDay.title}</h2>
              </div>
            </div>

            {activeDay.intro && (
              <p className="text-slate-600 dark:text-slate-300 text-sm leading-6 mb-6 pb-6 border-b border-slate-100 dark:border-slate-800/50 italic">
                "{activeDay.intro.replace(/^"|"$/g, '')}"
              </p>
            )}

            {/* List of Place Cards */}
            <div className="space-y-6">
              {activeDay.activities.length > 0 ? (
                activeDay.activities.map((act, index) => {
                  const { title, description, tag } = parseActivityText(act)
                  
                  // Color palette per tag
                  const tagStyle: Record<string, { bg: string; text: string; border: string; emoji: string }> = {
                    Breakfast: { bg: 'bg-orange-100/70 dark:bg-orange-950/40', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-800/50', emoji: '🍳' },
                    Lunch:     { bg: 'bg-yellow-100/70 dark:bg-yellow-950/40', text: 'text-yellow-600 dark:text-yellow-400', border: 'border-yellow-200 dark:border-yellow-800/50', emoji: '🍱' },
                    Dinner:    { bg: 'bg-red-100/70 dark:bg-red-950/40',    text: 'text-red-600 dark:text-red-400',    border: 'border-red-200 dark:border-red-800/50',    emoji: '🍽️' },
                    Snack:     { bg: 'bg-pink-100/70 dark:bg-pink-950/40',   text: 'text-pink-600 dark:text-pink-400',  border: 'border-pink-200 dark:border-pink-800/50',  emoji: '🧁' },
                    Activity:  { bg: 'bg-sky-100/70 dark:bg-sky-950/40',    text: 'text-sky-600 dark:text-sky-400',    border: 'border-sky-200 dark:border-sky-800/50',    emoji: '🎯' },
                    Transport: { bg: 'bg-purple-100/70 dark:bg-purple-950/40', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800/50', emoji: '🚌' },
                    Accommodation: { bg: 'bg-emerald-100/70 dark:bg-emerald-950/40', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800/50', emoji: '🏨' },
                  }
                  const style = (tag && tagStyle[tag]) ? tagStyle[tag] : { bg: 'bg-slate-100/70 dark:bg-slate-800/50', text: 'text-slate-600 dark:text-slate-400', border: 'border-slate-200 dark:border-slate-700/50', emoji: '📍' }

                  return (
                    <article
                      key={index}
                      onClick={() => {
                        sessionStorage.setItem('tripease_place_title', title)
                        sessionStorage.setItem('tripease_place_description', description)
                        sessionStorage.setItem('tripease_place_index', String(index))
                        sessionStorage.setItem('tripease_day_activities', JSON.stringify(activeDay.activities))
                        sessionStorage.setItem('tripease_place_tag', tag || '')
                        sessionStorage.setItem('tripease_budget', sessionStorage.getItem('tripease_budget') || '')
                        router.push('/place-detail')
                      }}
                      className="group overflow-hidden rounded-[2rem] border border-slate-200/60 bg-slate-50/40 dark:bg-slate-900/30 hover:bg-white dark:hover:bg-slate-950 dark:border-slate-800/40 p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-md cursor-pointer"
                    >
                      <div className="grid gap-5 md:grid-cols-[200px_1fr] items-center">
                        <SuggestionImage text={title} destination={destination} />
                        <div className="space-y-2">
                          <span className={`inline-flex items-center gap-1.5 rounded-full ${style.bg} ${style.text} border ${style.border} px-3 py-1 text-xs font-bold`}>
                            {style.emoji} {tag || `Stop ${index + 1}`}
                          </span>
                          <h4 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-sky-500 transition">
                            {title}
                          </h4>
                          {description && (
                            <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">
                              {description}
                            </p>
                          )}
                        </div>
                      </div>
                    </article>
                  )
                })
              ) : (
                <div className="text-center py-8 text-slate-500 text-sm">No scheduled activities for this day. Enjoy free roaming!</div>
              )}
            </div>
          </div>

          {/* Navigation Page-by-Page Buttons */}
          <div className="flex justify-between items-center pt-2">
            <button
              onClick={() => setActiveDayIndex(prev => Math.max(0, prev - 1))}
              disabled={activeDayIndex === 0}
              className="rounded-full bg-white dark:bg-slate-900 border border-slate-200 hover:border-slate-350 dark:border-slate-800 dark:hover:border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ← Previous Day
            </button>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Page {activeDayIndex + 1} of {parsedDays.length}
            </span>
            <button
              onClick={() => setActiveDayIndex(prev => Math.min(parsedDays.length - 1, prev + 1))}
              disabled={activeDayIndex === parsedDays.length - 1}
              className="rounded-full bg-white dark:bg-slate-900 border border-slate-200 hover:border-slate-350 dark:border-slate-800 dark:hover:border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next Day →
            </button>
          </div>
        </div>

        {/* Right Column: Daily Weather Forecast & Advice */}
        <div className="space-y-6">

          {budgetLines && budgetLines.length > 0 && (
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-md dark:border-slate-800 dark:bg-slate-950">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
                  💰
                </span>
                Budget Estimate
              </h3>
              <ul className="space-y-3">
                {budgetLines.map((line, idx) => (
                  <li key={idx} className="flex items-start text-sm text-slate-600 dark:text-slate-400">
                    <span className="mr-2 mt-0.5 text-emerald-500">•</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {weatherLoading && (
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-md dark:border-slate-800 dark:bg-slate-950 flex items-center justify-center min-h-[200px]">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-sky-500"></div>
              <span className="ml-3 text-sm text-slate-500">Loading Weather...</span>
            </div>
          )}

          {!weatherLoading && (
            <div className="rounded-[2rem] border border-slate-200/70 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900/40 dark:to-slate-950 p-6 shadow-lg dark:border-slate-850">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-sky-600 dark:text-sky-400 font-semibold">
                    {activeDayWeather?.is_seasonal_average ? 'Seasonal Average' : 'Forecast Weather'}
                  </p>
                  <h3 className="mt-1 text-md font-bold text-slate-900 dark:text-white capitalize">
                    {formattedActiveDate}
                  </h3>
                </div>
                {activeDayWeather?.weather?.[0]?.icon ? (
                  <img
                    src={`https://openweathermap.org/img/wn/${activeDayWeather.weather[0].icon}@2x.png`}
                    alt={activeDayWeather.weather[0].description}
                    className="h-14 w-14 drop-shadow-md"
                  />
                ) : (
                  <span className="text-2xl">🌦️</span>
                )}
              </div>

              {activeDayWeather ? (
                <div className="space-y-5 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-950 border border-slate-100 dark:border-slate-800/40">
                      <p className="text-xs text-slate-500 dark:text-slate-400">Temperature</p>
                      <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                        {Math.round(activeDayWeather.main.temp)}°C
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                        Feels like {Math.round(activeDayWeather.main.feels_like)}°
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-950 border border-slate-100 dark:border-slate-800/40">
                      <p className="text-xs text-slate-500 dark:text-slate-400">Condition</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white capitalize mt-2 truncate">
                        {activeDayWeather.weather?.[0]?.description || 'N/A'}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                        Humidity: {activeDayWeather.main.humidity}%
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white/70 p-4 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/40">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>💡</span> Weather Pacing Suggestion
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                      {activeDayWeather.weather?.[0]?.main === 'Rain' || activeDayWeather.weather?.[0]?.main === 'Drizzle' || activeDayWeather.weather?.[0]?.main === 'Thunderstorm'
                        ? 'Expected rainfall today. Prioritize indoor museum stops, local cozy cafes, or shopping galleries. Pack an umbrella!'
                        : activeDayWeather.weather?.[0]?.main === 'Snow'
                        ? 'Snowy day ahead. Dress in warm layers. Ideal for cozy fireside dining, scenic snowy viewpoints, or indoor craft markets.'
                        : activeDayWeather.main.temp > 30
                        ? 'Hot day forecast. Plan outdoor monuments for early morning or post-sunset. Rest during midday peaks, and stay hydrated!'
                        : 'Perfect outdoor sightseeing conditions. Great day for local parks, walking tours, and open-air viewpoints.'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="pt-6 text-center space-y-2">
                  <span className="text-3xl block">📅</span>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No live forecast available yet</p>
                  <p className="text-xs text-slate-500 dark:text-slate-500 max-w-[240px] mx-auto leading-relaxed">
                    Live weather predictions are available for dates within 5 days from today.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </section>
  )
}
