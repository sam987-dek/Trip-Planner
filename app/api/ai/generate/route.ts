import { NextResponse } from 'next/server'
import { generateItinerary } from '../../../../lib/openrouter'

export async function POST(req: Request){
  try {
    const { prompt } = await req.json()
    if (!prompt) {
      return NextResponse.json({ error: 'prompt required' }, { status: 400 })
    }

    const data = await generateItinerary(prompt)
    return NextResponse.json({ ok: true, data })
  } catch (err: any) {
    console.error('[AI generation error]', err?.message || err)
    const errorMessage = err?.message?.includes('OPENROUTER_API_KEY')
      ? 'OpenRouter API key is not configured. Check your environment variables.'
      : err?.message || 'AI generation failed'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
