'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'

export default function CheckInEntryPage() {
  const [eventPdaInput, setEventPdaInput] = useState('')
  const router = useRouter()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!eventPdaInput.trim()) return
    router.push(`/check-in/${eventPdaInput.trim()}`)
  }

  return (
    <div className="py-8 sm:py-12 max-w-xl mx-auto px-4 space-y-8 text-center">
      <div className="space-y-3">
        <div className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-full bg-[#14F195]/10 text-[#14F195] text-xs font-semibold uppercase border border-[#14F195]/20">
          Attendee Portal
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#E8EDF6]">Event Check-In</h1>
        <p className="text-xs sm:text-sm text-[#8FA3C8] leading-relaxed">
          Enter an Event PDA address to check in and mint your Soulbound Badge NFT on Solana.
        </p>
      </div>

      <div className="bg-[#161F30] border border-[#1F2D44] rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl text-left">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-[#E8EDF6] block">Event PDA Address</label>
            <input
              type="text"
              placeholder="e.g. 5x7Z... or Event PDA address"
              value={eventPdaInput}
              onChange={(e) => setEventPdaInput(e.target.value)}
              className="w-full bg-[#0B1220] border border-[#1F2D44] focus:border-[#14F195] focus:ring-1 focus:ring-[#14F195] rounded-xl px-4 py-3 text-[#E8EDF6] placeholder-[#8FA3C8]/40 text-sm font-mono outline-none transition"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full btn-solana-gradient py-3.5 px-6 rounded-xl font-bold text-sm inline-flex items-center justify-center gap-2 shadow-lg"
          >
            <span>Find Event</span>
            <ArrowRight className="w-4 h-4 shrink-0" />
          </button>
        </form>
      </div>
    </div>
  )
}
