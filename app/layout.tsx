import './globals.css'
import React from 'react'
import Header from '../components/Header'

export const metadata = {
  title: 'TripEase – AI Travel Planner',
  description: 'Create stunning, weather-aware travel itineraries with AI. Discover hidden gems, local food, and calm travel guidance tailored to your mood.',
  keywords: 'trip planner, AI itinerary, travel, hidden gems, weather travel',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
