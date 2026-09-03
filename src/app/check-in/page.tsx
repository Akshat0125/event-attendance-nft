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
        <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold uppercase inline-block">
          Attendee Portal
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#111827]">Event Check-In</h1>
        <p className="text-xs sm:text-sm text-[#6B7280] leading-relaxed">
          Enter an Event PDA address to check in and claim your Soulbound Badge credential on Solana.
        </p>
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm text-left">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-[#111827] block">Event PDA Address</label>
            <input
              type="text"
              placeholder="e.g. 5x7Z... or Event PDA address"
              value={eventPdaInput}
              onChange={(e) => setEventPdaInput(e.target.value)}
              className="w-full bg-white border border-[#E5E7EB] focus:border-[#111827] rounded-xl px-4 py-3 text-[#111827] placeholder-[#9CA3AF] text-sm font-mono outline-none transition"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-[#111827] hover:bg-[#1F2937] text-white py-3 px-6 rounded-xl font-semibold text-sm inline-flex items-center justify-center gap-2 shadow-sm transition"
          >
            <span>Find Event</span>
            <ArrowRight className="w-4 h-4 shrink-0" />
          </button>
        </form>
      </div>
    </div>
  )
}
