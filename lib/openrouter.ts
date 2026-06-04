import axios from 'axios'

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY

if (!OPENROUTER_KEY) {
  console.warn('OPENROUTER_API_KEY not set')
}

export async function generateItinerary(prompt: string){
  if (!OPENROUTER_KEY) {
    throw new Error('OPENROUTER_API_KEY is not configured on the server')
  }

  const body = {
    model: 'deepseek/deepseek-chat',
    messages: [
      { role: 'system', content: 'You are an AI travel planner that creates calm low-stress itineraries with local experiences.' },
      { role:'user', content: prompt }
    ],
    max_tokens: 800,
    temperature: 0.7
  }

  const endpoints = [
    'https://openrouter.ai/api/v1/chat/completions',
    'https://openrouter.ai/api/v1/completions',
    'https://api.openrouter.ai/v1/chat/completions',
    'https://api.openrouter.ai/v1/completions'
  ]

  for (const endpoint of endpoints) {
    try {
      const res = await axios.post(endpoint, body, {
        headers: {
          Authorization: `Bearer ${OPENROUTER_KEY}`,
          'Content-Type': 'application/json'
        }
      })
      return res.data
    } catch (error: any) {
      const message = error?.response?.data?.error || error?.message || 'OpenRouter request failed'
      console.warn(`[OpenRouter] failed ${endpoint}:`, message)
      if (endpoint === endpoints[endpoints.length - 1]) {
        throw new Error(message)
      }
    }
  }
}

export async function generateSeasonalWeather(destination: string, startDate: string, days: number, currentTrendSummary: string) {
  if (!OPENROUTER_KEY) {
    throw new Error('OPENROUTER_API_KEY is not configured on the server')
  }

  const prompt = `Predict the weather forecast for a trip to "${destination}" starting on ${startDate} for a duration of ${days} days.
Because the trip is in the future, please make an accurate prediction by combining:
1. Historical climate data for "${destination}" on the same dates (e.g. typical temperatures and conditions from last year on these dates).
2. The current weather trend we are observing right now: "${currentTrendSummary}".

Generate a realistic weather prediction for each of the ${days} days (Day 1 to Day ${days}) using the above inputs to determine if there are active seasonal anomalies or changes.
Format the output strictly as a JSON object containing a "list" array. Each item in the "list" array must represent one day of the trip and match this schema:
{
  "dt_txt": "YYYY-MM-DD 12:00:00", // where YYYY-MM-DD corresponds to that specific day date
  "main": {
    "temp": predicted_temperature_celsius_number,
    "feels_like": predicted_feels_like_celsius_number,
    "humidity": predicted_humidity_percentage_number
  },
  "weather": [
    {
      "main": "one of: Rain, Drizzle, Thunderstorm, Snow, Clear, Clouds, Mist",
      "description": "short description of typical seasonal weather on this day",
      "icon": "one of: 01d, 02d, 03d, 04d, 09d, 10d, 11d, 13d, 50d"
    }
  ],
  "is_seasonal_average": true
}
Do not include any other text, markdown blocks, or explanation. Return ONLY the valid JSON object.`

  const body = {
    model: 'deepseek/deepseek-chat',
    messages: [
      { role: 'system', content: 'You are a helpful travel weather assistant that returns clean JSON weather data.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.2
  }

  const endpoints = [
    'https://openrouter.ai/api/v1/chat/completions',
    'https://openrouter.ai/api/v1/completions',
    'https://api.openrouter.ai/v1/chat/completions',
    'https://api.openrouter.ai/v1/completions'
  ]

  for (const endpoint of endpoints) {
    try {
      const res = await axios.post(endpoint, body, {
        headers: {
          Authorization: `Bearer ${OPENROUTER_KEY}`,
          'Content-Type': 'application/json'
        }
      })
      const content = res.data?.choices?.[0]?.message?.content || res.data?.content || ''
      const jsonText = content.replace(/^```json\s*/, '').replace(/```$/, '').trim()
      return JSON.parse(jsonText)
    } catch (error: any) {
      console.warn(`[OpenRouter Weather] failed ${endpoint}:`, error?.message)
      if (endpoint === endpoints[endpoints.length - 1]) {
        throw error
      }
    }
  }
}


