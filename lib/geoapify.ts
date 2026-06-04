import axios from 'axios'

const KEY = process.env.GEOAPIFY_API_KEY || process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY
if(!KEY) console.warn('GEOAPIFY_API_KEY not set')

export async function searchPlaces(q: string, lon?: number, lat?: number){
  const base = 'https://api.geoapify.com/v2/places'
  const params: any = { apiKey: KEY, limit: 20, categories: 'catering.restaurant|tourism.sights' }
  if(q) params.text = q
  if(lon && lat) params.lon = lon, params.lat = lat
  const res = await axios.get(base,{ params })
  return res.data
}
