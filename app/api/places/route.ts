import { NextResponse } from 'next/server'
import { searchPlaces } from '../../../lib/geoapify'

export async function GET(req: Request){
  try{
    const url = new URL(req.url)
    const q = url.searchParams.get('q') || ''
    const lat = url.searchParams.get('lat') ? Number(url.searchParams.get('lat')) : undefined
    const lon = url.searchParams.get('lon') ? Number(url.searchParams.get('lon')) : undefined
    const data = await searchPlaces(q, lon, lat)
    return NextResponse.json({ ok: true, data })
  }catch(err){
    return NextResponse.json({ error: 'places failed' }, { status: 500 })
  }
}
