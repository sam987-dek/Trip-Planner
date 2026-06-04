'use client'
import React, { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface PlaceSuggestion {
  name: string
  country: string
  state?: string
  fullName: string
  lat?: number
  lon?: number
}

export default function CreateTrip() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [location, setLocation] = useState('')
  const [dates, setDates] = useState('3')
  const [budget, setBudget] = useState('moderate')
  const [mood, setMood] = useState('relaxed')
  const [travelerType, setTravelerType] = useState('solo')
  const [diet, setDiet] = useState('any')
  const [startDate, setStartDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState('')
  const [selectedCoords, setSelectedCoords] = useState<{ lat?: number; lon?: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const requestIdRef = useRef(0)
  const router = useRouter()

  // Deduplicate cities by coordinate proximity (within ~10km)
  const deduplicateCities = (places: PlaceSuggestion[]): PlaceSuggestion[] => {
    const seen: Set<string> = new Set()
    return places.filter((place) => {
      const key = `${place.name}_${place.country}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  const searchPlaces = async (query: string) => {
    const trimmedQuery = query.trim()
    if (trimmedQuery.length < 2 || trimmedQuery === selectedLocation) {
      setSuggestions([])
      setShowDropdown(false)
      return
    }

    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    setSearchLoading(true)
    setShowDropdown(true)

    try {
      const url = `/api/geocode?q=${encodeURIComponent(trimmedQuery)}&t=${Date.now()}`
      
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()
      if (requestId !== requestIdRef.current) return

      const results: PlaceSuggestion[] = (data.data?.features || [])
        .map((feature: any) => {
          const props = feature.properties
          // Fallback hierarchy for place name (administrative areas often lack props.name)
          const name = props.name || props.address_line1 || props.city || props.state || props.country || ''
          const state = props.state || ''
          const country = props.country || ''
          const lat = feature.geometry?.coordinates?.[1]
          const lon = feature.geometry?.coordinates?.[0]
          
          let fullName = name
          if (state && state !== name && state !== country) {
            fullName += `, ${state}`
          }
          if (country && country !== name) {
            fullName += `, ${country}`
          }
          
          return {
            name,
            state,
            country,
            fullName,
            lat,
            lon
          }
        })
        .filter((r: PlaceSuggestion) => r.name && r.name.trim())

      const deduplicated = deduplicateCities(results)
      
      setSuggestions(deduplicated)
      setShowDropdown(trimmedQuery.length >= 2)
    } catch (err: any) {
      console.error('Place search failed:', err.message)
      setSuggestions([])
      setShowDropdown(false)
    } finally {
      if (requestId === requestIdRef.current) {
        setSearchLoading(false)
      }
    }
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const trimmedLocation = location.trim()
    if (trimmedLocation.length < 2 || trimmedLocation === selectedLocation) {
      setSuggestions([])
      setShowDropdown(false)
      setSearchLoading(false)
      return
    }

    const timeout = window.setTimeout(() => {
      searchPlaces(trimmedLocation)
    }, 250)

    return () => window.clearTimeout(timeout)
  }, [location, selectedLocation])

  const handleSelectPlace = (place: PlaceSuggestion) => {
    requestIdRef.current += 1
    setSelectedLocation(place.fullName)
    setLocation(place.fullName)
    setSelectedCoords(place.lat !== undefined && place.lon !== undefined ? { lat: place.lat, lon: place.lon } : null)
    setShowDropdown(false)
    setSuggestions([])
    setSearchLoading(false)
    inputRef.current?.blur()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    
    const trimmedLoc = location.trim()
    if (!trimmedLoc) {
      setError('Please enter a destination to generate your trip.')
      return
    }

    // Validation: Enforce selecting from dropdown or auto-selecting the first suggestion if it matches
    let finalLocation = trimmedLoc
    let finalCoords = selectedCoords

    if (selectedLocation !== trimmedLoc) {
      // User typed something but did not select from dropdown
      // Let's see if we have suggestions matching or if we can find one
      if (suggestions.length > 0) {
        // Auto-select the first suggestion
        const first = suggestions[0]
        finalLocation = first.fullName
        finalCoords = first.lat !== undefined && first.lon !== undefined ? { lat: first.lat, lon: first.lon } : null
        setLocation(first.fullName)
        setSelectedLocation(first.fullName)
        setSelectedCoords(finalCoords)
      } else {
        setError('Please search and select a valid destination from the dropdown. If you cannot find your specific spot, try searching for the nearest city or region (e.g. "Kolkata" instead of specific shops).')
        return
      }
    }

    setLoading(true)
    try {
      const dietText = diet === 'veg' ? 'Vegetarian ONLY (only vegetarian restaurants, cafes, and street food)' : diet === 'non-veg' ? 'Non-Vegetarian (famous local meats/poultry spots)' : 'Mixed/Any dining options'

      // Derive exact number of days from the dates input
      const numDays = Math.min(Math.max(parseInt(dates, 10) || 3, 1), 15)

      const prompt = `Create a ${numDays}-day trip itinerary for ${finalLocation} starting on ${startDate}.
The traveler type is ${travelerType} and the trip mood is ${mood}.
The traveler's dietary preference is: ${dietText}.
The budget is: ${budget}.

IMPORTANT FORMATTING RULES — follow exactly:
1. You MUST generate exactly ${numDays} days. No more, no less.
2. Each day MUST start with a heading on its own line in this exact format: "## Day X: [Descriptive Title]" where X is the day number (1, 2, 3…).
3. After the heading, write a short 1-2 sentence summary paragraph for that day.
4. Then list 5-7 activities/stops as bullet points starting with "* " (asterisk + space).
5. Each bullet point MUST start with the specific place name in bold: "* **Place Name**: description"
6. You MUST explicitly include recommendations for Breakfast, Lunch, and Dinner every single day.
7. For meals, recommend famous, authentic, "desi" (if applicable) local restaurants. DO NOT recommend big, fancy, or generic restaurant chains that lack good taste. Stay within the ${budget} budget.
8. Do NOT skip any day. Do NOT combine multiple days into one section.
9. Do NOT use the word "Day" inside bullet point descriptions — only use it in the ## Day X headings.

Example format (use this exact structure):
## Day 1: Arrival and Old Town
Begin your journey in the historic quarter with local flavours and iconic sights.
* **Famous Desi Dhaba**: Start the day with an authentic local breakfast.
* **Landmark Square**: Stroll through the main square and soak in the atmosphere.
* **Local Spice Market**: Sample local snacks at the bustling market.
* **Hidden Gem Eatery**: Enjoy a famous local lunch.

Now generate the full ${numDays}-day itinerary for ${finalLocation}, tailored for ${travelerType} with a ${mood} mood. Dietary preference: ${dietText}. Budget: ${budget}.`

      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      })
      const json = await res.json()
      if (!json.ok) {
        setLoading(false)
        return setError(json.error || 'AI failed')
      }
      sessionStorage.setItem('tripease_results', JSON.stringify(json.data))
      sessionStorage.setItem('tripease_destination', finalLocation)
      sessionStorage.setItem('tripease_mood', mood)
      sessionStorage.setItem('tripease_traveler_type', travelerType)
      sessionStorage.setItem('tripease_diet', diet)
      sessionStorage.setItem('tripease_start_date', startDate)
      sessionStorage.setItem('tripease_dates_type', dates)
      sessionStorage.setItem('tripease_budget', budget)

      if (finalCoords) {
        sessionStorage.setItem('tripease_coords', JSON.stringify(finalCoords))
      } else {
        sessionStorage.removeItem('tripease_coords')
      }
      router.push('/ai-results')
    } catch (err: any) {
      setLoading(false)
      setError(err.message || 'unknown error')
    }
  }

  return (
    <>
      <section className="max-w-3xl mx-auto space-y-8 animate-fade-in-up">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-slate-950 via-sky-950 to-slate-900 p-8 text-white shadow-2xl shadow-slate-900/30">
          {/* Background orbs */}
          <div className="absolute top-4 right-8 h-32 w-32 rounded-full bg-sky-400/10 blur-2xl animate-float pointer-events-none" />
          <div className="absolute bottom-2 left-10 h-20 w-20 rounded-full bg-emerald-400/10 blur-xl animate-float delay-300 pointer-events-none" />
          <div className="relative z-10 space-y-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-1 text-sm font-semibold text-sky-200 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              AI Travel Planner
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight">Create your itinerary</h1>
            <p className="text-slate-300 leading-relaxed">Tell TripEase where you want to go and it will craft a personalized travel plan with local gems, food spots, and live weather forecasts.</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6 rounded-[2rem] border border-slate-200/70 bg-white p-8 shadow-lg shadow-slate-200/60 transition hover:-translate-y-1 dark:border-slate-800/70 dark:bg-slate-950 dark:shadow-slate-900/40">
          <div className="grid gap-5">
            <label className="space-y-2 text-sm text-slate-700 dark:text-slate-300 relative z-10">
              <span>Destination</span>
              <div ref={containerRef} className="relative z-50">
                <input
                  ref={inputRef}
                  value={location}
                  onChange={(e) => {
                    setSelectedLocation('')
                    setLocation(e.target.value)
                  }}
                  onFocus={() => {
                    if (location.trim().length >= 2 && location.trim() !== selectedLocation) setShowDropdown(true)
                  }}
                  placeholder="e.g., Kyoto, Japan"
                  className="w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-sky-500 dark:focus:ring-sky-800/40"
                />
                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 pl-2 leading-relaxed">
                  💡 <strong>Search Guidelines:</strong> Please enter a city, state, region, or country (e.g. <em>Kyoto</em> or <em>Rajasthan</em>). Avoid searching for specific shops, hotels, or individual tourist attractions.
                </p>
                {showDropdown && location.trim().length >= 2 && location.trim() !== selectedLocation && (
                  <div className="absolute top-full left-0 right-0 mt-2 rounded-2xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900 z-50 overflow-hidden max-h-80 overflow-y-auto">
                    {suggestions.map((place, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectPlace(place)}
                        className="w-full px-4 py-3 text-left hover:bg-sky-50 dark:hover:bg-slate-800 transition border-b border-slate-100 dark:border-slate-800 last:border-0"
                      >
                        <div className="font-semibold text-slate-900 dark:text-white">{place.name}</div>
                        <div className="text-sm text-slate-600 dark:text-slate-300">
                          {place.state && <span>{place.state}</span>}
                          {place.state && place.country && <span>, </span>}
                          {place.country && <span>{place.country}</span>}
                        </div>
                      </button>
                    ))}
                    {searchLoading && (
                      <div className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 text-center">Searching...</div>
                    )}
                    {!searchLoading && suggestions.length === 0 && (
                      <div className="px-5 py-5 text-sm text-slate-500 dark:text-slate-400 text-center space-y-1">
                        <p className="font-bold text-slate-700 dark:text-slate-300">No destinations found</p>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Try searching for a broader city, state, or region (e.g., <em>"Kolkata"</em> or <em>"Rajasthan"</em>) instead of specific landmarks.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </label>
            <div className="grid gap-5 md:grid-cols-2">
              <label className="space-y-2 text-sm text-slate-700 dark:text-slate-300 relative z-0">
                <span>Date of Travel</span>
                <input
                  type="date"
                  value={startDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-sky-500 dark:focus:ring-sky-800/40 relative z-0"
                />
              </label>
              <label className="space-y-2 text-sm text-slate-700 dark:text-slate-300 relative z-0">
                <span>Trip Duration</span>
                <input 
                  type="number" 
                  min="1" 
                  max="15" 
                  value={dates} 
                  onChange={(e) => setDates(e.target.value)} 
                  className="w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-sky-500 dark:focus:ring-sky-800/40 relative z-0" 
                />
              </label>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              <label className="space-y-2 text-sm text-slate-700 dark:text-slate-300 relative z-0">
                <span>Trip Mood</span>
                <select
                  value={mood}
                  onChange={(e) => setMood(e.target.value)}
                  className="w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-sky-500 dark:focus:ring-sky-800/40 relative z-0"
                >
                  <option value="relaxed">Chill & Relaxed 😌</option>
                  <option value="adventurous">Active & Adventurous 🧗</option>
                  <option value="cultural">Culture & History 🏛️</option>
                  <option value="foodie">Food & Culinary 🍕</option>
                  <option value="romantic">Romantic Getaway 💖</option>
                  <option value="outdoorsy">Outdoorsy & Nature 🚴</option>
                </select>
              </label>
              <label className="space-y-2 text-sm text-slate-700 dark:text-slate-300 relative z-0">
                <span>Traveler Type</span>
                <select
                  value={travelerType}
                  onChange={(e) => setTravelerType(e.target.value)}
                  className="w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-sky-500 dark:focus:ring-sky-800/40 relative z-0"
                >
                  <option value="solo">Solo Traveler 🧑</option>
                  <option value="couple">Couple 👩‍❤️‍👨</option>
                  <option value="family">Family with Kids 👨‍👩‍👧‍👦</option>
                  <option value="friends">Group of Friends 👥</option>
                </select>
              </label>
              <label className="space-y-2 text-sm text-slate-700 dark:text-slate-300 relative z-0">
                <span>Dietary Preference</span>
                <select
                  value={diet}
                  onChange={(e) => setDiet(e.target.value)}
                  className="w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-sky-500 dark:focus:ring-sky-800/40 relative z-0"
                >
                  <option value="any">Both / Any 🍽️</option>
                  <option value="veg">Vegetarian 🥦</option>
                  <option value="non-veg">Non-Vegetarian 🍗</option>
                </select>
              </label>
              <label className="space-y-2 text-sm text-slate-700 dark:text-slate-300 relative z-0">
                <span>Trip Budget</span>
                <select
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-sky-500 dark:focus:ring-sky-800/40 relative z-0"
                >
                  <option value="budget">Budget-Friendly 💸</option>
                  <option value="moderate">Moderate / Mid-range 💵</option>
                  <option value="luxury">Luxury / Premium 💎</option>
                </select>
              </label>
            </div>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <button disabled={loading} type="submit" className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-sky-500 to-emerald-500 px-6 py-3 font-semibold text-white shadow-xl shadow-sky-500/30 transition duration-300 hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60">Generate itinerary</button>
            <div className="text-sm text-slate-500">Recommended for relaxed travel, local food, and hidden gems.</div>
          </div>
          {error && <div className="rounded-3xl bg-red-50 px-4 py-3 text-red-700 shadow-sm dark:bg-red-900/20 dark:text-red-200">{error}</div>}
        </form>
      </section>

      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xl">
          <div className="relative mx-4 w-full max-w-sm overflow-hidden rounded-[2rem] bg-white dark:bg-slate-900 shadow-2xl shadow-slate-900/40">
            {/* Top gradient bar */}
            <div className="h-1.5 w-full bg-gradient-to-r from-sky-500 via-emerald-400 to-sky-500 animate-gradient" />
            
            {/* Content */}
            <div className="p-8 text-center">
              {/* Spinner with orbiting dot */}
              <div className="relative mx-auto mb-6 h-20 w-20">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-sky-500/20 to-emerald-500/20 animate-pulse" />
                <div className="absolute inset-2 rounded-full border-4 border-slate-100 dark:border-slate-800" />
                <div className="absolute inset-2 rounded-full border-4 border-transparent border-t-sky-500 border-r-emerald-500 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center text-2xl">✈️</div>
              </div>
              
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Building Your Trip</h3>
              <p className="mt-2 text-sm font-medium text-sky-600 dark:text-sky-400">{location}</p>
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                AI is crafting your personalized itinerary with local gems, food spots, and weather insights…
              </p>
              
              {/* Progress dots */}
              <div className="mt-6 flex items-center justify-center gap-1.5">
                {[0,1,2,3].map((i) => (
                  <div
                    key={i}
                    className="h-2 w-2 rounded-full bg-sky-400 animate-pulse"
                    style={{ animationDelay: `${i * 200}ms` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
