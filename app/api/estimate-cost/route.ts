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

    const systemPrompt = `You are a hyperlocal India travel cost expert with deep knowledge of actual restaurant menu prices, street food rates, entry fees, and transport fares across Indian cities. You are known for being extremely accurate and granular — you think like a local who has eaten at these exact places and knows their exact menu prices. Never round up unnecessarily. Famous budget local eateries in India (like Udupi joints, dhabas, street stalls) are CHEAP — a full breakfast might cost ₹50-120 total, not hundreds. Be honest about the price level of each place.`

    const userPrompt = isFood
      ? `Give me an itemized cost estimate for eating at "${placeName}" in ${destination} for ONE person.
The recommended context is: "${description}"
Meal type: ${tag}

Think carefully:
1. What TYPE of place is this? (street stall / budget Udupi / casual dhaba / mid-range restaurant / fine dining)
2. Based on that, what are realistic menu prices at this specific place?
3. List 2-4 specific items a person would order for this ${tag}, with ACTUAL realistic prices for this specific restaurant.
4. Add ₹100 as a buffer for misc (water, tip, etc).

Return ONLY valid JSON. No markdown, no explanation. Format:
{
  "placeType": "budget Udupi breakfast joint",
  "items": [
    { "name": "Masala Dosa", "price": 45 },
    { "name": "Filter Coffee", "price": 15 },
    { "name": "Misc / Buffer", "price": 100 }
  ],
  "totalAmount": 160,
  "currency": "INR",
  "confidence": "high"
}`
      : `Give me an itemized cost estimate for visiting "${placeName}" in ${destination} for ONE person.
Context: "${description}"
Category: ${tag}

Think carefully:
1. What is the actual entry fee / fare / rate for this specific place?
2. Break it down into real line items (ticket, guide, transport fare, etc).
3. Add ₹100 as a buffer.

Return ONLY valid JSON. No markdown, no explanation. Format:
{
  "placeType": "historical monument",
  "items": [
    { "name": "Entry Ticket", "price": 50 },
    { "name": "Audio Guide", "price": 30 },
    { "name": "Misc / Buffer", "price": 100 }
  ],
  "totalAmount": 180,
  "currency": "INR",
  "confidence": "high"
}`

    const body = {
      model: 'deepseek/deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 300,
      temperature: 0.1
    }

    const res = await axios.post('https://openrouter.ai/api/v1/chat/completions', body, {
      headers: {
        Authorization: `Bearer ${OPENROUTER_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000
    })

    const raw = res.data?.choices?.[0]?.message?.content || ''
    const jsonText = raw.replace(/^```(?:json)?\s*/i, '').replace(/```$/i, '').trim()

    let parsed: {
      placeType: string
      items: { name: string; price: number }[]
      totalAmount: number
      currency: string
      confidence: string
    }

    try {
      parsed = JSON.parse(jsonText)
    } catch {
      return NextResponse.json({ ok: false, error: 'Could not parse AI response' }, { status: 500 })
    }

    // Recalculate total from items to ensure correctness
    const recalcTotal = parsed.items?.reduce((sum, item) => sum + (item.price || 0), 0) ?? parsed.totalAmount

    return NextResponse.json({
      ok: true,
      placeType: parsed.placeType || '',
      items: parsed.items || [],
      totalAmount: recalcTotal,
      currency: parsed.currency || 'INR',
      confidence: parsed.confidence || 'medium',
      bufferApplied: 100
    }, {
      headers: { 'Cache-Control': 'no-store' }
    })

  } catch (err: any) {
    console.error('[estimate-cost]', err?.message)
    return NextResponse.json({ ok: false, error: err?.message || 'estimation failed' }, { status: 500 })
  }
}
