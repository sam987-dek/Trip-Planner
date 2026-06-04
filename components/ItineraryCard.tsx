import React from 'react'

export default function ItineraryCard({ title, body }: { title: string; body: string }){
  return (
    <article className="p-4 bg-white rounded-md shadow-sm">
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-slate-600">{body}</p>
    </article>
  )
}
