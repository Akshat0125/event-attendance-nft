'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export default function Home() {
  return (
    <div className="py-8 sm:py-12 md:py-16 max-w-5xl mx-auto px-4 space-y-12">
      {/* Hero Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-[#E8EDF6] tracking-tight leading-tight">
          Create and manage events with <span className="text-solana-gradient">verifiable attendance</span>
        </h1>
        <p className="text-sm sm:text-base text-[#8FA3C8] max-w-xl mx-auto font-medium">
          Powered by Solana Devnet and Phantom
        </p>
        <p className="text-sm sm:text-base text-[#8FA3C8] max-w-2xl mx-auto font-normal leading-relaxed pt-2">
          NFTicket enables event hosts to issue non-transferable digital credentials that prove real-world attendance without passwords or centralized servers.
        </p>
      </div>

      {/* Role Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
        {/* Organizer Card */}
        <div className="bg-[#161F30] border border-[#1F2D44] hover:border-[#9945FF]/50 rounded-2xl p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 shadow-xl group hover:-translate-y-1">
          <div className="space-y-4">
            <div>
              <span className="text-xs font-bold uppercase text-[#9945FF] tracking-wider block mb-1">Event Management</span>
              <h2 className="text-2xl font-bold text-[#E8EDF6] group-hover:text-[#9945FF] transition-colors">
                Organizer Dashboard
              </h2>
              <p className="text-[#8FA3C8] text-sm mt-2 leading-relaxed">
                Schedule events, set attendance capacity, upload custom badge artwork, and run live check-in desks with dynamic QR codes.
              </p>
            </div>
            <ul className="space-y-2.5 text-xs text-[#8FA3C8]">
              <li className="flex items-center gap-2 min-w-0">
                <span className="text-[#14F195] font-bold shrink-0">✓</span>
                <span className="truncate">Multi-step event creation wizard</span>
              </li>
              <li className="flex items-center gap-2 min-w-0">
                <span className="text-[#14F195] font-bold shrink-0">✓</span>
                <span className="truncate">Full-screen live event check-in desk mode</span>
              </li>
              <li className="flex items-center gap-2 min-w-0">
                <span className="text-[#14F195] font-bold shrink-0">✓</span>
                <span className="truncate">Real-time attendance counter & capacity metrics</span>
              </li>
            </ul>
          </div>

          <div className="mt-8 pt-4 border-t border-[#1F2D44]">
            <Link
              href="/organizer"
              className="w-full btn-solana-gradient py-3.5 px-6 rounded-xl inline-flex items-center justify-center gap-2 font-bold text-base shadow-lg"
            >
              <span>Open Organizer Dashboard</span>
              <ArrowRight className="w-5 h-5 shrink-0" />
            </Link>
          </div>
        </div>

        {/* Attendee Card */}
        <div className="bg-[#161F30] border border-[#1F2D44] hover:border-[#14F195]/50 rounded-2xl p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 shadow-xl group hover:-translate-y-1">
          <div className="space-y-4">
            <div>
              <span className="text-xs font-bold uppercase text-[#14F195] tracking-wider block mb-1">Attendee Portal</span>
              <h2 className="text-2xl font-bold text-[#E8EDF6] group-hover:text-[#14F195] transition-colors">
                Event Check-In
              </h2>
              <p className="text-[#8FA3C8] text-sm mt-2 leading-relaxed">
                Scan event QR codes or open event links to claim your non-transferable proof of attendance badge in seconds.
              </p>
            </div>
            <ul className="space-y-2.5 text-xs text-[#8FA3C8]">
              <li className="flex items-center gap-2 min-w-0">
                <span className="text-[#14F195] font-bold shrink-0">✓</span>
                <span className="truncate">Instant digital proof of attendance</span>
              </li>
              <li className="flex items-center gap-2 min-w-0">
                <span className="text-[#14F195] font-bold shrink-0">✓</span>
                <span className="truncate">Non-transferable credential bound to your wallet</span>
              </li>
              <li className="flex items-center gap-2 min-w-0">
                <span className="text-[#14F195] font-bold shrink-0">✓</span>
                <span className="truncate">Public verification on Solana explorer</span>
              </li>
            </ul>
          </div>

          <div className="mt-8 pt-4 border-t border-[#1F2D44]">
            <Link
              href="/check-in"
              className="w-full bg-[#1F2D44] hover:bg-[#283A58] text-[#E8EDF6] hover:text-white py-3.5 px-6 rounded-xl inline-flex items-center justify-center gap-2 font-bold text-base transition border border-[#8FA3C8]/20"
            >
              <span>Check In to an Event</span>
              <ArrowRight className="w-5 h-5 text-[#14F195] shrink-0" />
            </Link>
          </div>
        </div>
      </div>

      {/* Product Highlights Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 border-t border-[#1F2D44] pt-10">
        <div className="bg-[#161F30]/60 border border-[#1F2D44] rounded-xl p-5 text-center flex flex-col items-center justify-center space-y-2">
          <h3 className="text-base font-semibold text-[#E8EDF6]">Verifiable Attendance</h3>
          <p className="text-xs text-[#8FA3C8] leading-relaxed">Proof of presence is recorded directly on-chain for tamper-proof verification.</p>
        </div>
        <div className="bg-[#161F30]/60 border border-[#1F2D44] rounded-xl p-5 text-center flex flex-col items-center justify-center space-y-2">
          <h3 className="text-base font-semibold text-[#E8EDF6]">Seamless QR Scanning</h3>
          <p className="text-xs text-[#8FA3C8] leading-relaxed">Attendees scan the desk QR code to open a sleek public check-in page.</p>
        </div>
        <div className="bg-[#161F30]/60 border border-[#1F2D44] rounded-xl p-5 text-center flex flex-col items-center justify-center space-y-2">
          <h3 className="text-base font-semibold text-[#E8EDF6]">Soulbound Credentials</h3>
          <p className="text-xs text-[#8FA3C8] leading-relaxed">Badges are permanently locked to recipient accounts to eliminate counterfeit claims.</p>
        </div>
      </div>
    </div>
  )
}
