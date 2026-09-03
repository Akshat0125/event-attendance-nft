'use client'

import { useState, useEffect, use } from 'react'
import { useConnection } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { useEventAttendanceNftProgram } from '@/components/event-attendance-nft/event-attendance-nft-data-access'
import { QRCodeSVG } from 'qrcode.react'
import Link from 'next/link'
import { fetchEventMetadata, truncateWallet, EventMetadata } from '@/lib/event-metadata'
import { ArrowLeft, Loader2, RefreshCw } from 'lucide-react'

export default function LiveCheckInScreen({ params }: { params: Promise<{ eventId: string }> }) {
  const resolvedParams = use(params)
  const eventPdaStr = resolvedParams.eventId

  const { connection } = useConnection()
  const { program } = useEventAttendanceNftProgram()

  const [eventData, setEventData] = useState<{
    name: string
    attendeeCount: number
    badgeUri: string
  } | null>(null)

  const [metadata, setMetadata] = useState<EventMetadata | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Recent Check-Ins from AttendanceRecord PDAs
  const [recentCheckIns, setRecentCheckIns] = useState<
    { attendee: string; timestamp: number }[]
  >([])
  const [isLoadingCheckIns, setIsLoadingCheckIns] = useState(false)

  let eventPda: PublicKey | null = null
  try {
    eventPda = new PublicKey(eventPdaStr)
  } catch (err) {
    eventPda = null
  }

  // Fetch Event Account & Metadata
  const loadEventInfo = async () => {
    if (!program || !eventPda) {
      setIsLoading(false)
      return
    }
    try {
      const acc = await program.account.event.fetch(eventPda)
      setEventData({
        name: acc.name,
        attendeeCount: acc.attendeeCount,
        badgeUri: acc.badgeUri,
      })

      const meta = await fetchEventMetadata(acc.badgeUri)
      setMetadata(meta)
    } catch (err) {
      console.error('Error fetching live event info:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch Attendance Records for this event PDA
  const loadAttendanceRecords = async () => {
    if (!program || !eventPda) return
    setIsLoadingCheckIns(true)
    try {
      const records = await program.account.attendanceRecord.all([
        {
          memcmp: {
            offset: 8,
            bytes: eventPda.toBase58(),
          },
        },
      ])

      const formatted = records.map((r) => ({
        attendee: r.account.attendee.toBase58(),
        timestamp: r.account.timestamp.toNumber(),
      }))

      formatted.sort((a, b) => b.timestamp - a.timestamp)
      setRecentCheckIns(formatted)
    } catch (err) {
      console.error('Error fetching attendance records:', err)
    } finally {
      setIsLoadingCheckIns(false)
    }
  }

  useEffect(() => {
    loadEventInfo()
    loadAttendanceRecords()

    const interval = setInterval(() => {
      loadEventInfo()
      loadAttendanceRecords()
    }, 8000)

    return () => clearInterval(interval)
  }, [program, eventPdaStr])

  const getRelativeTime = (timestampSec: number) => {
    if (!timestampSec) return 'Just now'
    const diffSec = Math.floor(Date.now() / 1000 - timestampSec)
    if (diffSec < 60) return 'Just now'
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`
    return `${Math.floor(diffSec / 86400)}d ago`
  }

  if (!eventPda) {
    return (
      <div className="py-16 text-center space-y-4 max-w-md mx-auto">
        <div className="text-red-600 font-bold text-base">Invalid Event Address</div>
        <Link href="/organizer" className="text-xs text-[#111827] underline font-semibold">
          Return to Organizer Dashboard
        </Link>
      </div>
    )
  }

  const attendeeCount = eventData?.attendeeCount || 0
  const capacity = metadata?.capacity
  const hasCapacity = typeof capacity === 'number' && capacity > 0
  const capacityPercent = hasCapacity ? Math.min(100, Math.round((attendeeCount / capacity!) * 100)) : null

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#111827] p-4 sm:p-8 flex flex-col justify-between space-y-6">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-4">
        <Link
          href={`/organizer/event/${eventPdaStr}`}
          className="inline-flex items-center gap-1.5 text-xs text-[#6B7280] hover:text-[#111827] font-medium transition"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" />
          <span>Exit Live Desk</span>
        </Link>

        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold uppercase inline-flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            LIVE
          </span>
          <button
            onClick={() => {
              loadEventInfo()
              loadAttendanceRecords()
            }}
            className="p-2 bg-white border border-[#E5E7EB] hover:bg-slate-50 rounded-lg text-xs text-[#6B7280] transition"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4 shrink-0" />
          </button>
        </div>
      </div>

      {/* Main Distraction-Free Display Layout */}
      {isLoading ? (
        <div className="py-20 text-center text-[#6B7280] flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-[#111827]" />
          <span className="text-xs">Loading Live Screen...</span>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto w-full my-auto space-y-8">
          {/* Header Title & Large Number Counter */}
          <div className="text-center space-y-3">
            <h1 className="text-3xl sm:text-5xl font-black text-[#111827] tracking-tight">
              {metadata?.name || eventData?.name}
            </h1>
            <div className="flex items-center justify-center gap-3">
              <span className="text-5xl sm:text-7xl font-black text-[#111827] tracking-tight">
                {attendeeCount}
              </span>
              <div className="text-left space-y-0.5">
                <span className="text-xs font-bold text-[#6B7280] uppercase tracking-wider block">Checked In</span>
                {capacityPercent !== null && (
                  <span className="text-xs font-semibold text-emerald-600">{capacityPercent}% of capacity ({capacity})</span>
                )}
              </div>
            </div>
          </div>

          {/* Centered Large QR Code */}
          <div className="flex flex-col items-center justify-center">
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E5E7EB] shadow-lg inline-flex items-center justify-center">
              <QRCodeSVG
                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/check-in/${eventPdaStr}`}
                size={260}
                level="H"
                includeMargin={true}
              />
            </div>
            <span className="text-xs uppercase text-[#6B7280] font-bold tracking-widest mt-4">
              Scan QR Code to Check In
            </span>
          </div>

          {/* Recent Check-Ins List */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm max-w-2xl mx-auto space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
              <h3 className="font-bold text-[#111827] text-sm">Recent Check-Ins</h3>
              <span className="text-xs text-[#6B7280] font-mono">{recentCheckIns.length} recorded</span>
            </div>

            {isLoadingCheckIns && recentCheckIns.length === 0 ? (
              <div className="py-6 text-center text-[#6B7280] flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#111827]" />
                <span className="text-xs">Fetching check-ins...</span>
              </div>
            ) : recentCheckIns.length === 0 ? (
              <div className="py-8 text-center text-[#6B7280] space-y-1">
                <p className="text-xs font-semibold text-[#111827]">No check-ins yet</p>
                <p className="text-[11px]">Attendees will appear here in real-time as they scan the QR code.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                {recentCheckIns.map((rec, idx) => (
                  <div
                    key={rec.attendee + idx}
                    className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      <span className="font-mono text-[#111827] font-semibold">
                        {truncateWallet(rec.attendee)}
                      </span>
                    </div>

                    <span className="text-[#6B7280] text-[11px]">
                      {getRelativeTime(rec.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer info */}
      <div className="text-center text-[11px] text-[#6B7280] pt-4 border-t border-[#E5E7EB]">
        NFTicket Live Screen • Powered by Solana Devnet
      </div>
    </div>
  )
}
