'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useRole } from '@/components/role-provider'
import { ArrowRight, CheckCircle2, ShieldCheck, QrCode, ArrowLeftRight } from 'lucide-react'

export default function Home() {
  const { role, setRole } = useRole()
  const router = useRouter()

  const handleSelectRole = (selectedRole: 'organizer' | 'attendee') => {
    setRole(selectedRole)
    if (selectedRole === 'organizer') {
      router.push('/organizer')
    } else {
      router.push('/check-in')
    }
  }

  return (
    <div className="py-8 sm:py-12 md:py-16 max-w-5xl mx-auto px-4 space-y-12">
      {/* Hero Section */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <span className="px-3.5 py-1 rounded-full bg-[#EFECE6] border border-[#E5E3DF] text-slate-700 text-xs font-semibold inline-block">
          Modern Event Credentials
        </span>
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-[#111827] tracking-tight leading-tight">
          Create and manage events with <span className="text-solana-gradient">verifiable attendance</span>
        </h1>
        <p className="text-sm sm:text-base text-[#6B7280] max-w-xl mx-auto font-medium">
          Powered by Solana Devnet and Phantom
        </p>
        <p className="text-sm sm:text-base text-[#4B5563] max-w-2xl mx-auto font-normal leading-relaxed pt-1">
          NFTicket enables event hosts to issue non-transferable digital credentials that prove real-world attendance without passwords or centralized servers.
        </p>
      </div>

      {/* Role Selection Cards */}
      <div className="space-y-4">
        <div className="text-center">
          <h2 className="text-lg font-bold text-[#111827]">Select your role to get started</h2>
          <p className="text-xs text-[#6B7280]">You can switch roles anytime from the header</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          {/* Organizer Card */}
          <div className="card-saas p-6 sm:p-8 flex flex-col justify-between hover:shadow-md transition-all duration-200 group">
            <div className="space-y-4">
              <div>
                <span className="text-xs font-bold uppercase text-[#9945FF] tracking-wider block mb-1">Event Hosts</span>
                <h3 className="text-2xl font-bold text-[#111827] group-hover:text-[#9945FF] transition-colors">
                  I'm an Organizer
                </h3>
                <p className="text-[#6B7280] text-sm mt-2 leading-relaxed">
                  Schedule events, set attendance capacity, upload custom badge artwork, and run live check-in desks with dynamic QR codes.
                </p>
              </div>
              <ul className="space-y-2.5 text-xs text-[#4B5563]">
                <li className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="truncate">Multi-step event creation wizard</span>
                </li>
                <li className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="truncate">Full-screen live event check-in desk mode</span>
                </li>
                <li className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="truncate">Real-time attendance counter & capacity metrics</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-4 border-t border-[#E5E3DF]">
              <button
                onClick={() => handleSelectRole('organizer')}
                className="w-full bg-[#111827] hover:bg-[#1F2937] text-white py-3 px-6 rounded-xl inline-flex items-center justify-center gap-2 font-semibold text-sm shadow-sm transition"
              >
                <span>Enter as Organizer</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>
            </div>
          </div>

          {/* Attendee Card */}
          <div className="card-saas p-6 sm:p-8 flex flex-col justify-between hover:shadow-md transition-all duration-200 group">
            <div className="space-y-4">
              <div>
                <span className="text-xs font-bold uppercase text-emerald-700 tracking-wider block mb-1">Event Guests</span>
                <h3 className="text-2xl font-bold text-[#111827] group-hover:text-emerald-700 transition-colors">
                  I'm Attending an Event
                </h3>
                <p className="text-[#6B7280] text-sm mt-2 leading-relaxed">
                  Scan event QR codes or open event links to claim your non-transferable proof of attendance badge in seconds.
                </p>
              </div>
              <ul className="space-y-2.5 text-xs text-[#4B5563]">
                <li className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="truncate">Instant digital proof of attendance</span>
                </li>
                <li className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="truncate">Non-transferable credential bound to your wallet</span>
                </li>
                <li className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="truncate">Public verification on Solana explorer</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-4 border-t border-[#E5E3DF]">
              <button
                onClick={() => handleSelectRole('attendee')}
                className="w-full bg-[#EFECE6] hover:bg-[#E5E3DF] text-[#111827] py-3 px-6 rounded-xl inline-flex items-center justify-center gap-2 font-semibold text-sm transition border border-[#E5E3DF]"
              >
                <span>Enter as Attendee</span>
                <ArrowRight className="w-4 h-4 text-emerald-700 shrink-0" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Highlights Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 border-t border-[#E5E3DF] pt-10">
        <div className="card-saas p-5 text-center flex flex-col items-center justify-center space-y-2">
          <ShieldCheck className="w-6 h-6 text-[#111827]" />
          <h3 className="text-sm font-semibold text-[#111827]">Verifiable Attendance</h3>
          <p className="text-xs text-[#6B7280] leading-relaxed">Proof of presence is recorded directly on-chain for tamper-proof verification.</p>
        </div>
        <div className="card-saas p-5 text-center flex flex-col items-center justify-center space-y-2">
          <QrCode className="w-6 h-6 text-[#111827]" />
          <h3 className="text-sm font-semibold text-[#111827]">Seamless QR Scanning</h3>
          <p className="text-xs text-[#6B7280] leading-relaxed">Attendees scan the desk QR code to open a sleek public check-in page.</p>
        </div>
        <div className="card-saas p-5 text-center flex flex-col items-center justify-center space-y-2">
          <CheckCircle2 className="w-6 h-6 text-[#111827]" />
          <h3 className="text-sm font-semibold text-[#111827]">Soulbound Credentials</h3>
          <p className="text-xs text-[#6B7280] leading-relaxed">Badges are permanently locked to recipient accounts to eliminate counterfeit claims.</p>
        </div>
      </div>
    </div>
  )
}
