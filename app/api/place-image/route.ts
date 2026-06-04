import { NextResponse } from 'next/server'

// ─── Types ────────────────────────────────────────────────────────────────────

type WikiPage = {
  index?: number
  pageid?: number
  title?: string
  thumbnail?: { source?: string }
  original?: { source?: string }
  imageinfo?: Array<{ url?: string; thumburl?: string }>
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Deterministic hash → same image per query across reloads
function lockId(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h) % 1000
}

// Strip itinerary action words so we surface the place name cleanly
function cleanQuery(str: string): string {
  return str
    .replace(/\b(visit|try|eat|walk|explore|start|end|morning|afternoon|evening|night|day\s*\d*|check.?in|hotel|dinner|lunch|breakfast|grab|head|take|spend|enjoy|see|stop)\b/gi, '')
    .replace(/[^a-zA-Z0-9\s',.\-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Convert a query to 1-3 clean Flickr-style tags
function flickrTags(str: string): string {
  const stops = new Set([
    'the','in','a','to','at','for','and','with','on','of','from','an','is',
    'are','its','this','that','there','was','will','can','has','had','have'
  ])
  const words = str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stops.has(w))
  return (words.slice(0, 3).join(',')) || 'travel,landmark'
}

// Upgrade a Wikipedia thumbnail URL to a much larger version
function upgradeWikiThumb(url: string): string {
  // e.g. /320px-foo.jpg  → /1200px-foo.jpg
  return url.replace(/\/\d+px-/, '/1200px-')
}

// ─── Source 1: Wikipedia pageimages (English) ─────────────────────────────────

async function searchWikipedia(query: string, limit = 3): Promise<string | null> {
  const cleaned = cleanQuery(query)
  if (!cleaned) return null

  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    generator: 'search',
    gsrsearch: cleaned,
    gsrlimit: String(limit),
    gsrnamespace: '0',
    prop: 'pageimages',
    piprop: 'thumbnail|original',
    pithumbsize: '1200',
    pilicense: 'any',
    origin: '*',
  })

  try {
    const res = await fetch(`https://en.wikipedia.org/w/api.php?${params}`, {
      headers: { 'User-Agent': 'TripEase/1.0 place-image-lookup' },
      next: { revalidate: 86400 },
    })
    if (!res.ok) return null
    const data = await res.json()
    const pages = Object.values((data.query?.pages || {}) as Record<string, WikiPage>)
    const hit = pages
      .sort((a, b) => (a.index ?? 999) - (b.index ?? 999))
      .find(p => p.original?.source || p.thumbnail?.source)
    if (!hit) return null
    const raw = hit.original?.source || hit.thumbnail?.source || null
    return raw ? upgradeWikiThumb(raw) : null
  } catch {
    return null
  }
}

// ─── Source 2: Wikimedia Commons image search ─────────────────────────────────

async function searchWikimediaCommons(query: string): Promise<string | null> {
  const cleaned = cleanQuery(query)
  if (!cleaned) return null

  // Search for files in Wikimedia Commons (namespace 6 = File:)
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    generator: 'search',
    gsrsearch: `${cleaned} filetype:bitmap`,
    gsrnamespace: '6',
    gsrlimit: '5',
    prop: 'imageinfo',
    iiprop: 'url',
    iiurlwidth: '1200',
    origin: '*',
  })

  try {
    const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
      headers: { 'User-Agent': 'TripEase/1.0 place-image-lookup' },
      next: { revalidate: 86400 },
    })
    if (!res.ok) return null
    const data = await res.json()
    const pages = Object.values((data.query?.pages || {}) as Record<string, WikiPage>)

    // Filter out maps, flags, icons, coats of arms, logos, etc.
    const imageUrl = pages
      .sort((a, b) => (a.index ?? 999) - (b.index ?? 999))
      .map(p => p.imageinfo?.[0]?.thumburl || p.imageinfo?.[0]?.url)
      .find(u => {
        if (!u) return false
        const lower = u.toLowerCase()
        return (
          !lower.includes('flag') &&
          !lower.includes('coat') &&
          !lower.includes('logo') &&
          !lower.includes('icon') &&
          !lower.includes('map') &&
          !lower.includes('blank') &&
          !lower.includes('svg') &&
          (lower.includes('.jpg') || lower.includes('.jpeg') || lower.includes('.png') || lower.includes('.webp'))
        )
      })

    return imageUrl || null
  } catch {
    return null
  }
}

// ─── Source 3: Wikimedia Commons direct title lookup ──────────────────────────
// Many major landmarks have a dedicated Commons category page we can hit directly

async function searchCommonsCategory(query: string): Promise<string | null> {
  const cleaned = cleanQuery(query)
  if (!cleaned) return null

  // Try to get the first image from a Commons category named after the place
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    generator: 'categorymembers',
    gcmtitle: `Category:${cleaned}`,
    gcmtype: 'file',
    gcmlimit: '10',
    prop: 'imageinfo',
    iiprop: 'url',
    iiurlwidth: '1200',
    origin: '*',
  })

  try {
    const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
      headers: { 'User-Agent': 'TripEase/1.0 place-image-lookup' },
      next: { revalidate: 86400 },
    })
    if (!res.ok) return null
    const data = await res.json()
    const pages = Object.values((data.query?.pages || {}) as Record<string, WikiPage>)

    const imageUrl = pages
      .map(p => p.imageinfo?.[0]?.thumburl || p.imageinfo?.[0]?.url)
      .find(u => {
        if (!u) return false
        const lower = u.toLowerCase()
        return (
          !lower.includes('flag') &&
          !lower.includes('map') &&
          !lower.includes('logo') &&
          !lower.includes('svg') &&
          (lower.includes('.jpg') || lower.includes('.jpeg') || lower.includes('.png'))
        )
      })

    return imageUrl || null
  } catch {
    return null
  }
}

// ─── Source 0: Google Places API (New & Legacy) ──────────────────────────────

async function searchGooglePlaces(query: string): Promise<string | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) {
    console.log('[Google Places] Key missing in env, skipping')
    return null
  }

  const cleaned = cleanQuery(query)
  if (!cleaned) return null

  // 1. Try Google Places API (New) first (lowest cost, modern)
  try {
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        // request only basic photo fields to keep costs low
        'X-Goog-FieldMask': 'places.id,places.photos'
      },
      body: JSON.stringify({
        textQuery: cleaned,
        maxResultCount: 1
      }),
      next: { revalidate: 86400 } // Cache for 24h
    })

    if (res.ok) {
      const data = await res.json()
      const photoName = data.places?.[0]?.photos?.[0]?.name // e.g. "places/ChIJ.../photos/sub..."
      if (photoName) {
        // Fetch the photo media URL - redirect manually to catch direct user content URL
        const mediaRes = await fetch(
          `https://places.googleapis.com/v1/${photoName}/media?key=${apiKey}&maxHeightPx=800`,
          { redirect: 'manual' }
        )
        // Extract 307 redirect location header
        const redirectUrl = mediaRes.headers.get('location')
        if (redirectUrl) {
          console.log('[Google Places New] Found image:', redirectUrl)
          return redirectUrl
        }
      }
    } else {
      console.warn('[Google Places New] Response error:', res.status, await res.text())
    }
  } catch (error) {
    console.warn('[Google Places New] Failed, trying legacy API:', error)
  }

  // 2. Fallback: Google Places API (Legacy)
  try {
    const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(cleaned)}&key=${apiKey}`
    const searchRes = await fetch(searchUrl, { next: { revalidate: 86400 } })
    if (searchRes.ok) {
      const searchData = await searchRes.json()
      const photoRef = searchData.results?.[0]?.photos?.[0]?.photo_reference
      if (photoRef) {
        const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxheight=800&photo_reference=${photoRef}&key=${apiKey}`
        // Resolve redirect to get clean public user content URL and avoid leaking API key
        const mediaRes = await fetch(photoUrl, { redirect: 'manual' })
        const redirectUrl = mediaRes.headers.get('location')
        if (redirectUrl) {
          console.log('[Google Places Legacy] Found image:', redirectUrl)
          return redirectUrl
        }
        // If redirect can't be resolved, return the photo endpoint directly as last resort
        return photoUrl
      }
    } else {
      console.warn('[Google Places Legacy] Response error:', searchRes.status)
    }
  } catch (error) {
    console.error('[Google Places Legacy] Failed:', error)
  }

  return null
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const q = url.searchParams.get('q')?.trim()

    if (!q) {
      return NextResponse.json({ ok: false, error: 'q required' }, { status: 400 })
    }

    let imageUrl: string | null = null

    // 0. Google Places API – full query (Phase 0)
    imageUrl = await searchGooglePlaces(q)

    // 0b. Google Places API – place-only portion before any comma
    if (!imageUrl) {
      const mainPart = q.split(/[,;]/)[0].trim()
      if (mainPart !== q) {
        imageUrl = await searchGooglePlaces(mainPart)
      }
    }

    // 1. Wikipedia – full query (e.g. "Eiffel Tower Paris travel landmark")
    if (!imageUrl) {
      imageUrl = await searchWikipedia(q, 5)
    }


    // 2. Wikipedia – first sentence / place-only portion before any comma
    if (!imageUrl) {
      const mainPart = q.split(/[,;]/)[0].trim()
      if (mainPart !== q) imageUrl = await searchWikipedia(mainPart, 5)
    }

    // 3. Wikimedia Commons full-text image search
    if (!imageUrl) {
      imageUrl = await searchWikimediaCommons(q)
    }

    // 4. Wikimedia Commons – place-only query
    if (!imageUrl) {
      const mainPart = q.split(/[,;]/)[0].trim()
      imageUrl = await searchWikimediaCommons(mainPart)
    }

    // 5. Wikimedia Commons category direct lookup (most landmarks have a category)
    if (!imageUrl) {
      const mainPart = q.split(/[,;]/)[0].trim()
      imageUrl = await searchCommonsCategory(mainPart)
    }

    // 6. Wikimedia Commons – destination city only (last 1-2 words of query)
    if (!imageUrl) {
      const words = cleanQuery(q).split(' ')
      const city = words.slice(-2).join(' ')
      if (city) imageUrl = await searchWikimediaCommons(city + ' landmark')
    }

    // 7. Wikipedia – city fallback
    if (!imageUrl) {
      const words = cleanQuery(q).split(' ')
      const city = words.slice(-2).join(' ')
      if (city) imageUrl = await searchWikipedia(city, 3)
    }

    // 8. Last resort: LoremFlickr with deterministic lock for a consistent image
    if (!imageUrl) {
      const tags = flickrTags(q)
      imageUrl = `https://loremflickr.com/1200/800/${tags}?lock=${lockId(q)}`
    }

    return NextResponse.json({ ok: true, imageUrl })
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'image search failed' },
      { status: 500 }
    )
  }
}
