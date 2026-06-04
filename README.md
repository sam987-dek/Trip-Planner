# TripEase — AI-powered travel planner

TripEase is a Next.js 15 + TypeScript app that helps users create low-stress travel itineraries with local experiences.

Quick start

1. Copy `.env.example` to `.env.local` and fill values.
2. Restart the dev server after creating `.env.local` so Next.js loads the env variables.
3. Install dependencies: `npm install`
4. Run dev server: `npm run dev`

Deployment

- Deploy to Vercel and set environment variables in the project settings.

Features

- AI itinerary generation via OpenRouter
- Places via Geoapify
- Weather via OpenWeather
- Auth and persistence via Supabase

Environment

- Set the following env vars in Vercel or `.env.local`:
	- `OPENROUTER_API_KEY`
	- `NEXT_PUBLIC_SUPABASE_URL`
	- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
	- `GEOAPIFY_API_KEY`
	- `OPENWEATHER_API_KEY`

Notes

- This scaffold includes an API proxy layer under `app/api/*` for AI, places and weather.
- Google login requires enabling the Google provider in Supabase Auth and adding your site URL plus callback URL in the Supabase dashboard.
- Keep private API keys only in `.env.local` or deployment secrets. Do not commit real keys to `.env.example`.
# Trip-Planner
