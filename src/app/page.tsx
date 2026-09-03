'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export default function Home() {
  return (
    <div className="py-8 sm:py-12 md:py-16 max-w-5xl mx-auto px-4 space-y-12">
      {/* Hero Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-full border border-[#14F195]/30 bg-[#14F195]/10 text-[#14F195] text-xs font-semibold tracking-wide uppercase">
          Powered by Solana & Metaplex
        </div>
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-[#E8EDF6] tracking-tight">
          Welcome to <span className="text-solana-gradient">NFTicket</span>
        </h1>
        <p className="text-base sm:text-lg md:text-xl text-[#8FA3C8] max-w-2xl mx-auto font-normal leading-relaxed">
          The non-transferable, soulbound event attendance platform. Organizers create custom badges; attendees collect proof of presence on Solana.
        </p>
      </div>

      {/* Role Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
        {/* Organizer Card */}
        <div className="bg-[#161F30] border border-[#1F2D44] hover:border-[#9945FF]/50 rounded-2xl p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 shadow-xl group hover:-translate-y-1">
          <div className="space-y-4">
            <div>
              <span className="text-xs font-bold uppercase text-[#9945FF] tracking-wider block mb-1">For Event Hosts</span>
              <h2 className="text-2xl font-bold text-[#E8EDF6] group-hover:text-[#9945FF] transition-colors">
                I'm an Organizer
              </h2>
              <p className="text-[#8FA3C8] text-sm mt-2 leading-relaxed">
                Create new events, select preset or custom IPFS badge designs, track live attendance counts, and generate QR codes for attendees.
              </p>
            </div>
            <ul className="space-y-2.5 text-xs text-[#8FA3C8]">
              <li className="flex items-center gap-2 min-w-0">
                <span className="text-[#14F195] font-bold shrink-0">✓</span>
                <span className="truncate">Choose preset or upload custom badge artwork</span>
              </li>
              <li className="flex items-center gap-2 min-w-0">
                <span className="text-[#14F195] font-bold shrink-0">✓</span>
                <span className="truncate">Instantly generate check-in QR codes</span>
              </li>
              <li className="flex items-center gap-2 min-w-0">
                <span className="text-[#14F195] font-bold shrink-0">✓</span>
                <span className="truncate">Live on-chain attendee tracking</span>
              </li>
            </ul>
          </div>

          <div className="mt-8 pt-4 border-t border-[#1F2D44]">
            <Link
              href="/organizer"
              className="w-full btn-solana-gradient py-3.5 px-6 rounded-xl inline-flex items-center justify-center gap-2 font-bold text-base shadow-lg"
            >
              <span>Go to Organizer Portal</span>
              <ArrowRight className="w-5 h-5 shrink-0" />
            </Link>
          </div>
        </div>

        {/* Attendee Card */}
        <div className="bg-[#161F30] border border-[#1F2D44] hover:border-[#14F195]/50 rounded-2xl p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 shadow-xl group hover:-translate-y-1">
          <div className="space-y-4">
            <div>
              <span className="text-xs font-bold uppercase text-[#14F195] tracking-wider block mb-1">For Participants</span>
              <h2 className="text-2xl font-bold text-[#E8EDF6] group-hover:text-[#14F195] transition-colors">
                I'm Attending an Event
              </h2>
              <p className="text-[#8FA3C8] text-sm mt-2 leading-relaxed">
                Connect your Phantom wallet, enter your event code or scan a QR link, and mint your frozen Soulbound Badge NFT in one click.
              </p>
            </div>
            <ul className="space-y-2.5 text-xs text-[#8FA3C8]">
              <li className="flex items-center gap-2 min-w-0">
                <span className="text-[#14F195] font-bold shrink-0">✓</span>
                <span className="truncate">Zero transferability — 100% authentic proof of attendance</span>
              </li>
              <li className="flex items-center gap-2 min-w-0">
                <span className="text-[#14F195] font-bold shrink-0">✓</span>
                <span className="truncate">Verified Metaplex token metadata on Solana Devnet</span>
              </li>
              <li className="flex items-center gap-2 min-w-0">
                <span className="text-[#14F195] font-bold shrink-0">✓</span>
                <span className="truncate">Instant wallet badge delivery</span>
              </li>
            </ul>
          </div>

          <div className="mt-8 pt-4 border-t border-[#1F2D44]">
            <Link
              href="/check-in"
              className="w-full bg-[#1F2D44] hover:bg-[#283A58] text-[#E8EDF6] hover:text-white py-3.5 px-6 rounded-xl inline-flex items-center justify-center gap-2 font-bold text-base transition border border-[#8FA3C8]/20"
            >
              <span>Check-In to Event</span>
              <ArrowRight className="w-5 h-5 text-[#14F195] shrink-0" />
            </Link>
          </div>
        </div>
      </div>

      {/* Feature Highlights Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 border-t border-[#1F2D44] pt-10">
        <div className="bg-[#161F30]/60 border border-[#1F2D44] rounded-xl p-5 text-center flex flex-col items-center justify-center space-y-2">
          <h3 className="text-base font-semibold text-[#E8EDF6]">Soulbound Architecture</h3>
          <p className="text-xs text-[#8FA3C8] leading-relaxed">Token accounts are permanently frozen upon minting via PDA authority CPI.</p>
        </div>
        <div className="bg-[#161F30]/60 border border-[#1F2D44] rounded-xl p-5 text-center flex flex-col items-center justify-center space-y-2">
          <h3 className="text-base font-semibold text-[#E8EDF6]">Instant QR Check-In</h3>
          <p className="text-xs text-[#8FA3C8] leading-relaxed">Scan event QR code to immediately open the attendee check-in portal.</p>
        </div>
        <div className="bg-[#161F30]/60 border border-[#1F2D44] rounded-xl p-5 text-center flex flex-col items-center justify-center space-y-2">
          <h3 className="text-base font-semibold text-[#E8EDF6]">Dynamic IPFS Badges</h3>
          <p className="text-xs text-[#8FA3C8] leading-relaxed">Organizers select from curated artwork presets or upload custom IPFS designs.</p>
        </div>
      </div>
    </div>
  )
}
