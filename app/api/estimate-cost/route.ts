import { NextResponse } from 'next/server'
import axios from 'axios'

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY

export async function POST(req: Request) {
  try {
    const { placeName, description, destination, tag } = await req.json()

    if (!placeName || !destination) {
      return NextResponse.json({ ok: false, error: 'placeName and destination are required' }, { status: 400 })
    }

    if (!OPENROUTER_KEY) {
      return NextResponse.json({ ok: false, error: 'AI key not configured' }, { status: 500 })
    }

    const isFood = ['Breakfast', 'Lunch', 'Dinner', 'Snack'].includes(tag)
    const systemPrompt = `You are a precise local cost estimator with deep knowledge of restaurant menus, entry fees, and transport fares across Indian and global cities. You always return accurate, research-based price estimates.`

    const userPrompt = isFood
      ? `Estimate the cost in Indian Rupees (INR) for one person eating at "${placeName}" in ${destination}.
The recommended item/context is: "${description}".
This is a ${tag} stop.

Instructions:
- Use your knowledge of this specific restaurant's actual menu prices if you know them.
- If it is a famous desi/local eatery, use typical prices for that style of restaurant.
- Pick the most likely dishes a traveler would order for ${tag} (e.g. for Breakfast: 2 items + tea/coffee).
- Output ONLY a JSON object with this exact format, no markdown, no explanation:
{"estimatedAmount": 350, "currency": "INR", "breakdown": "Masala dosa ₹120 + Filter coffee ₹60 + service ₹20 + ₹100 buffer", "confidence": "high"}`
      : `Estimate the cost in Indian Rupees (INR) for one person for "${placeName}" in ${destination}.
Context/description: "${description}".
Category: ${tag}.

Instructions:
- For Activity: include entry ticket + any guide fee if applicable.
- For Transport: estimate one-way fare to/from this location.
- For Accommodation: estimate one night per-person cost.
- Use your knowledge of this specific place's actual fees/rates.
- Output ONLY a JSON object with this exact format, no markdown, no explanation:
{"estimatedAmount": 350, "currency": "INR", "breakdown": "Entry ticket ₹200 + guide ₹50 + misc ₹100 buffer", "confidence": "medium"}`

    const body = {
      model: 'deepseek/deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 200,
      temperature: 0.1 // Very low — we want factual, deterministic pricing
    }

    const res = await axios.post('https://openrouter.ai/api/v1/chat/completions', body, {
      headers: {
        Authorization: `Bearer ${OPENROUTER_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000
    })

    const raw = res.data?.choices?.[0]?.message?.content || ''
    // Strip any accidental markdown code fences
    const jsonText = raw.replace(/^```(?:json)?\s*/i, '').replace(/```$/i, '').trim()

    let parsed: { estimatedAmount: number; currency: string; breakdown: string; confidence: string }
    try {
      parsed = JSON.parse(jsonText)
    } catch {
      // If AI didn't return valid JSON, try to extract a number
      const match = raw.match(/\d{2,5}/)
      parsed = {
        estimatedAmount: match ? parseInt(match[0]) : 0,
        currency: 'INR',
        breakdown: raw.slice(0, 120),
        confidence: 'low'
      }
    }

    // Ensure ₹100 buffer is always applied
    const BUFFER = 100
    const finalAmount = (parsed.estimatedAmount || 0) + BUFFER

    return NextResponse.json({
      ok: true,
      estimatedAmount: finalAmount,
      currency: parsed.currency || 'INR',
      breakdown: parsed.breakdown || '',
      bufferApplied: BUFFER,
      confidence: parsed.confidence || 'medium'
    }, {
      headers: { 'Cache-Control': 'no-store' }
    })
  } catch (err: any) {
    console.error('[estimate-cost]', err?.message)
    return NextResponse.json({ ok: false, error: err?.message || 'estimation failed' }, { status: 500 })
  }
}
