'use client'

import Link from 'next/link'
import { Ticket, Calendar, ShieldCheck, QrCode, Sparkles, ArrowRight } from 'lucide-react'

export default function Home() {
  return (
    <div className="py-10 md:py-16 max-w-5xl mx-auto px-4">
      {/* Hero Header */}
      <div className="text-center space-y-4 mb-14">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#14F195]/30 bg-[#14F195]/10 text-[#14F195] text-xs font-semibold tracking-wide uppercase">
          <Sparkles className="w-4 h-4" /> Powered by Solana & Metaplex
        </div>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-[#E8EDF6] tracking-tight">
          Welcome to <span className="text-solana-gradient">NFTicket</span>
        </h1>
        <p className="text-lg sm:text-xl text-[#8FA3C8] max-w-2xl mx-auto font-normal">
          The non-transferable, soulbound event attendance platform. Organizers create custom badges; attendees collect proof of presence on Solana.
        </p>
      </div>

      {/* Role Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
        {/* Organizer Card */}
        <div className="bg-[#161F30] border border-[#1F2D44] hover:border-[#9945FF]/50 rounded-2xl p-8 flex flex-col justify-between transition-all duration-300 shadow-xl group hover:-translate-y-1">
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-xl bg-[#9945FF]/15 border border-[#9945FF]/30 flex items-center justify-center text-[#9945FF]">
              <Calendar className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[#E8EDF6] group-hover:text-[#9945FF] transition-colors">
                I'm an Organizer
              </h2>
              <p className="text-[#8FA3C8] text-sm mt-2 leading-relaxed">
                Create new events, select preset or custom IPFS badge designs, track live attendance counts, and generate QR codes for attendees.
              </p>
            </div>
            <ul className="space-y-2 text-xs text-[#8FA3C8]">
              <li className="flex items-center gap-2">
                <span className="text-[#14F195]">✓</span> Choose preset or upload custom badge artwork
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#14F195]">✓</span> Instantly generate check-in QR codes
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#14F195]">✓</span> Live on-chain attendee tracking
              </li>
            </ul>
          </div>

          <div className="mt-8 pt-4 border-t border-[#1F2D44]">
            <Link
              href="/organizer"
              className="w-full btn-solana-gradient py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 font-bold text-base shadow-lg"
            >
              <span>Go to Organizer Portal</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>

        {/* Attendee Card */}
        <div className="bg-[#161F30] border border-[#1F2D44] hover:border-[#14F195]/50 rounded-2xl p-8 flex flex-col justify-between transition-all duration-300 shadow-xl group hover:-translate-y-1">
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-xl bg-[#14F195]/15 border border-[#14F195]/30 flex items-center justify-center text-[#14F195]">
              <Ticket className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[#E8EDF6] group-hover:text-[#14F195] transition-colors">
                I'm Attending an Event
              </h2>
              <p className="text-[#8FA3C8] text-sm mt-2 leading-relaxed">
                Connect your Phantom wallet, enter your event code or scan a QR link, and mint your frozen Soulbound Badge NFT in one click.
              </p>
            </div>
            <ul className="space-y-2 text-xs text-[#8FA3C8]">
              <li className="flex items-center gap-2">
                <span className="text-[#14F195]">✓</span> Zero transferability — 100% authentic proof of attendance
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#14F195]">✓</span> Verified Metaplex token metadata on Solana Devnet
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#14F195]">✓</span> Instant wallet badge delivery
              </li>
            </ul>
          </div>

          <div className="mt-8 pt-4 border-t border-[#1F2D44]">
            <Link
              href="/check-in"
              className="w-full bg-[#1F2D44] hover:bg-[#283A58] text-[#E8EDF6] hover:text-white py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 font-bold text-base transition border border-[#8FA3C8]/20"
            >
              <span>Check-In to Event</span>
              <ArrowRight className="w-5 h-5 text-[#14F195]" />
            </Link>
          </div>
        </div>
      </div>

      {/* Feature Highlights Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center border-t border-[#1F2D44] pt-12">
        <div className="space-y-2">
          <div className="flex justify-center text-[#9945FF]">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h3 className="text-base font-semibold text-[#E8EDF6]">Soulbound Architecture</h3>
          <p className="text-xs text-[#8FA3C8]">Token accounts are permanently frozen upon minting via PDA authority CPI.</p>
        </div>
        <div className="space-y-2">
          <div className="flex justify-center text-[#14F195]">
            <QrCode className="w-7 h-7" />
          </div>
          <h3 className="text-base font-semibold text-[#E8EDF6]">Instant QR Check-In</h3>
          <p className="text-xs text-[#8FA3C8]">Scan event QR code to immediately open the attendee check-in portal.</p>
        </div>
        <div className="space-y-2">
          <div className="flex justify-center text-[#9945FF]">
            <Sparkles className="w-7 h-7" />
          </div>
          <h3 className="text-base font-semibold text-[#E8EDF6]">Dynamic IPFS Badges</h3>
          <p className="text-xs text-[#8FA3C8]">Organizers select from curated artwork presets or upload custom IPFS designs.</p>
        </div>
      </div>
    </div>
  )
}
