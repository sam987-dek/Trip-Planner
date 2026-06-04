import axios from 'axios'

const KEY = process.env.OPENWEATHER_API_KEY || process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY
if(!KEY) console.warn('OPENWEATHER_API_KEY not set')

export async function getForecast(lat:number, lon:number){
  const url = 'https://api.openweathermap.org/data/2.5/forecast'
  const res = await axios.get(url, { params: { lat, lon, appid: KEY, units: 'metric' } })
  return res.data
}
