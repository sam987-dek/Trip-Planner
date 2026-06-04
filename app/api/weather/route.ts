import { NextResponse } from 'next/server'
import { getForecast } from '../../../lib/openweather'
import { generateSeasonalWeather } from '../../../lib/openrouter'

export async function GET(req: Request){
  try {
    const url = new URL(req.url)
    const lat = Number(url.searchParams.get('lat'))
    const lon = Number(url.searchParams.get('lon'))
    const destination = url.searchParams.get('destination') || ''
    const startDate = url.searchParams.get('startDate') || ''
    const duration = url.searchParams.get('duration') || 'weekend'

    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      return NextResponse.json({ error: 'lat/lon required' }, { status: 400 })
    }

    let days = 2
    if (duration === '3-day') days = 3
    if (duration === '7-day') days = 7

    // Determine if date is within 5 days from today
    let isLiveForecastAvailable = false
    if (startDate) {
      const targetDate = new Date(startDate)
      const today = new Date()
      targetDate.setHours(0,0,0,0)
      today.setHours(0,0,0,0)
      const diffTime = targetDate.getTime() - today.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      if (diffDays >= -1 && diffDays <= 5) {
        isLiveForecastAvailable = true
      }
    }

    if (isLiveForecastAvailable) {
      try {
        const data = await getForecast(lat, lon)
        return NextResponse.json({ ok: true, data })
      } catch (err) {
        console.warn('OpenWeather live forecast failed, falling back to seasonal averages:', err)
      }
    }

    // Retrieve current 5-day weather trend to construct season anomaly projections
    let currentTrendSummary = 'No active live forecast available'
    try {
      const liveData = await getForecast(lat, lon)
      if (liveData && liveData.list && liveData.list.length > 0) {
        const samples = liveData.list.filter((_: any, idx: number) => idx % 8 === 0).slice(0, 5).map((item: any) => {
          const dateStr = item.dt_txt.split(' ')[0]
          const temp = Math.round(item.main.temp)
          const desc = item.weather[0]?.description || 'clear'
          return `${dateStr}: ${temp}°C (${desc})`
        })
        currentTrendSummary = samples.join('; ')
      }
    } catch (e) {
      console.warn('Failed to retrieve live weather trend for future date predictions:', e)
    }

    // Otherwise, generate/fetch seasonal climate weather predicted using current season trend
    if (destination && startDate) {
      try {
        const seasonalData = await generateSeasonalWeather(destination, startDate, days, currentTrendSummary)
        if (seasonalData && seasonalData.list) {
          return NextResponse.json({ ok: true, data: seasonalData })
        }
      } catch (err) {
        console.warn('OpenRouter seasonal weather failed, using fallback generator:', err)
      }
    }

    // Fallback: Default mock seasonal list matching trip length if APIs are down or key is missing
    const fallbackList = []
    const baseDate = startDate ? new Date(startDate) : new Date()
    for (let i = 0; i < days; i++) {
      const currentDate = new Date(baseDate)
      currentDate.setDate(baseDate.getDate() + i)
      const dateStr = currentDate.toISOString().split('T')[0]
      fallbackList.push({
        dt_txt: `${dateStr} 12:00:00`,
        main: { temp: 22, feels_like: 21, humidity: 60 },
        weather: [
          { main: 'Clear', description: 'pleasant seasonal conditions', icon: '01d' }
        ],
        is_seasonal_average: true
      })
    }
    return NextResponse.json({ ok: true, data: { list: fallbackList } })
  } catch(err) {
    return NextResponse.json({ error: 'weather failed' }, { status: 500 })
  }
}
