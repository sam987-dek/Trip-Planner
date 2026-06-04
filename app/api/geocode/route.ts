import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const q = url.searchParams.get('q')?.trim()

    if (!q) {
      return NextResponse.json({ ok: false, error: 'q required' }, { status: 400 })
    }

    const apiKey = process.env.GEOAPIFY_API_KEY || process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY
    if (!apiKey) {
      return NextResponse.json({ ok: false, error: 'Geoapify API key is not configured' }, { status: 500 })
    }

    const params = new URLSearchParams({
      text: q,
      limit: '15',
      type: 'locality',
      apiKey
    })

    const response = await fetch(`https://api.geoapify.com/v1/geocode/autocomplete?${params.toString()}`, {
      cache: 'no-store'
    })
    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json({ ok: false, error: data?.message || 'geocode failed' }, { status: response.status })
    }

    // Filter out shops, streets, buildings, etc.
    // We only want: country, state, county, city, town, village, municipality, district, suburb, island
    const allowedTypes = [
      'country', 'state', 'county', 'city', 'town', 'village',
      'municipality', 'district', 'suburb', 'island'
    ]

    if (data.features) {
      data.features = data.features.filter((f: any) => {
        return allowedTypes.includes(f.properties?.result_type)
      })
    }

    return NextResponse.json({ ok: true, data })
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'geocode failed' }, { status: 500 })
  }
}
