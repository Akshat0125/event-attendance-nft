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
  const { program, programId } = useEventAttendanceNftProgram()

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
      // Query all AttendanceRecord PDAs where event == eventPda
      const records = await program.account.attendanceRecord.all([
        {
          memcmp: {
            offset: 8, // Discriminator offset
            bytes: eventPda.toBase58(),
          },
        },
      ])

      const formatted = records.map((r) => ({
        attendee: r.account.attendee.toBase58(),
        timestamp: r.account.timestamp.toNumber(),
      }))

      // Sort most recent first
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

    // Auto-refresh every 10 seconds for live desks
    const interval = setInterval(() => {
      loadEventInfo()
      loadAttendanceRecords()
    }, 10000)

    return () => clearInterval(interval)
  }, [program, eventPdaStr])

  // Helper for relative time (e.g. 2 mins ago)
  const getRelativeTime = (timestampSec: number) => {
    if (!timestampSec) return 'Just now'
    const diffSec = Math.floor(Date.now() / 1000 - timestampSec)
    if (diffSec < 60) return 'Just now'
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} mins ago`
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hours ago`
    return `${Math.floor(diffSec / 86400)} days ago`
  }

  if (!eventPda) {
    return (
      <div className="py-16 text-center space-y-4 max-w-md mx-auto">
        <div className="text-red-400 font-bold text-lg">Invalid Event Address</div>
        <Link href="/organizer" className="text-xs text-[#9945FF] underline">
          Return to Organizer Dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0B1220] text-[#E8EDF6] p-4 sm:p-8 flex flex-col justify-between space-y-8">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-[#1F2D44] pb-4">
        <Link
          href={`/organizer/event/${eventPdaStr}`}
          className="inline-flex items-center gap-2 text-xs text-[#8FA3C8] hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" />
          <span>Exit Live Desk</span>
        </Link>

        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-full bg-[#14F195]/20 text-[#14F195] border border-[#14F195]/30 text-xs font-extrabold uppercase animate-pulse inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#14F195] shrink-0" />
            LIVE CHECK-IN DESK
          </span>
          <button
            onClick={() => {
              loadEventInfo()
              loadAttendanceRecords()
            }}
            className="p-2 bg-[#161F30] border border-[#1F2D44] hover:border-[#8FA3C8] rounded-xl text-xs text-[#8FA3C8] hover:text-white transition"
            title="Refresh Live Data"
          >
            <RefreshCw className="w-4 h-4 shrink-0" />
          </button>
        </div>
      </div>

      {/* Main Full-Screen Layout */}
      {isLoading ? (
        <div className="py-20 text-center text-[#8FA3C8] flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#9945FF]" />
          <span className="text-sm">Initializing Live Desk...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl mx-auto w-full my-auto items-center">
          {/* Centered QR Section */}
          <div className="lg:col-span-7 bg-[#161F30] border border-[#1F2D44] rounded-3xl p-6 sm:p-10 text-center space-y-6 shadow-2xl">
            <div className="space-y-2">
              <h1 className="text-3xl sm:text-5xl font-extrabold text-[#E8EDF6] tracking-tight">
                {metadata?.name || eventData?.name}
              </h1>
              <p className="text-sm sm:text-base text-[#8FA3C8] max-w-md mx-auto">
                Point your phone camera at the QR code to check in and claim your Soulbound Badge.
              </p>
            </div>

            {/* Prominent QR Code Box */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl inline-flex items-center justify-center shadow-2xl border-4 border-[#14F195]/30 mx-auto">
              <QRCodeSVG
                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/check-in/${eventPdaStr}`}
                size={280}
                level="H"
                includeMargin={true}
              />
            </div>

            <div className="pt-2">
              <span className="text-xs uppercase text-[#14F195] font-extrabold tracking-widest block">
                Scan to Check In
              </span>
            </div>
          </div>

          {/* Right Live Stats & Recent Check-Ins Panel */}
          <div className="lg:col-span-5 space-y-6">
            {/* Live Count Counter */}
            <div className="bg-[#161F30] border border-[#1F2D44] rounded-2xl p-6 text-center space-y-1 shadow-xl">
              <span className="text-xs text-[#8FA3C8] font-bold uppercase tracking-wider block">Checked In</span>
              <span className="text-5xl sm:text-6xl font-extrabold text-[#14F195] tracking-tight">
                {eventData?.attendeeCount || 0}
              </span>
            </div>

            {/* Recent Check-Ins Feed */}
            <div className="bg-[#161F30] border border-[#1F2D44] rounded-2xl p-6 space-y-4 shadow-xl max-h-[380px] flex flex-col">
              <div className="flex items-center justify-between border-b border-[#1F2D44] pb-3">
                <h3 className="font-bold text-[#E8EDF6] text-base">Recent Check-Ins</h3>
                <span className="text-xs text-[#8FA3C8] font-mono">{recentCheckIns.length} recorded</span>
              </div>

              {isLoadingCheckIns && recentCheckIns.length === 0 ? (
                <div className="py-8 text-center text-[#8FA3C8] flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-[#9945FF]" />
                  <span className="text-xs">Loading attendees...</span>
                </div>
              ) : recentCheckIns.length === 0 ? (
                <div className="py-10 text-center text-[#8FA3C8] space-y-2 my-auto">
                  <p className="text-sm font-semibold text-[#E8EDF6]">No check-ins yet</p>
                  <p className="text-xs max-w-xs mx-auto">Attendees will appear here in real-time as they scan the QR code.</p>
                </div>
              ) : (
                <div className="space-y-3 overflow-y-auto pr-1 flex-1">
                  {recentCheckIns.map((rec, idx) => (
                    <div
                      key={rec.attendee + idx}
                      className="bg-[#0B1220] border border-[#1F2D44] rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-[#14F195]/20 text-[#14F195] flex items-center justify-center font-bold text-[10px] shrink-0">
                          ✓
                        </div>
                        <span className="font-mono text-[#E8EDF6] font-semibold truncate">
                          {truncateWallet(rec.attendee)}
                        </span>
                      </div>

                      <span className="text-[#8FA3C8] text-[11px] shrink-0">
                        {getRelativeTime(rec.timestamp)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer Branding */}
      <div className="text-center text-[11px] text-[#8FA3C8] pt-4 border-t border-[#1F2D44]/50">
        NFTicket Live Event Desk • Powered by Solana Devnet
      </div>
    </div>
  )
}
