'use client'

import { useState, useEffect, use } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { useEventAttendanceNftProgram } from '@/components/event-attendance-nft/event-attendance-nft-data-access'
import { QRCodeSVG } from 'qrcode.react'
import { toast } from 'sonner'
import Link from 'next/link'
import { fetchEventMetadata, getEventStatus, truncateWallet, EventMetadata } from '@/lib/event-metadata'
import { Copy, QrCode, ArrowLeft, Loader2, X, ExternalLink } from 'lucide-react'

export default function EventDetailsPage({ params }: { params: Promise<{ eventId: string }> }) {
  const resolvedParams = use(params)
  const eventPdaStr = resolvedParams.eventId

  const wallet = useWallet()
  const { program } = useEventAttendanceNftProgram()

  const [eventAccount, setEventAccount] = useState<{
    name: string
    organizer: string
    attendeeCount: number
    badgeUri: string
  } | null>(null)

  const [metadata, setMetadata] = useState<EventMetadata | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showQrModal, setShowQrModal] = useState(false)

  let eventPda: PublicKey | null = null
  try {
    eventPda = new PublicKey(eventPdaStr)
  } catch (err) {
    eventPda = null
  }

  const loadEvent = async () => {
    if (!program || !eventPda) {
      setIsLoading(false)
      return
    }
    try {
      const acc = await program.account.event.fetch(eventPda)
      const rawName = acc.name
      const rawAttendeeCount = acc.attendeeCount
      const rawBadgeUri = acc.badgeUri

      setEventAccount({
        name: rawName,
        organizer: acc.organizer.toBase58(),
        attendeeCount: rawAttendeeCount,
        badgeUri: rawBadgeUri,
      })

      const meta = await fetchEventMetadata(rawBadgeUri)
      setMetadata(meta)
    } catch (err) {
      console.error('Error loading event account:', err)
      toast.error('Event account not found on-chain!')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadEvent()
  }, [program, eventPdaStr])

  if (!eventPda) {
    return (
      <div className="py-16 text-center space-y-4 max-w-md mx-auto">
        <div className="text-red-400 font-bold text-lg">Invalid Event PDA</div>
        <p className="text-sm text-[#8FA3C8]">The provided address is not a valid Solana public key.</p>
        <Link href="/organizer" className="inline-flex items-center gap-2 text-xs text-[#9945FF] underline">
          <ArrowLeft className="w-4 h-4" /> Return to Dashboard
        </Link>
      </div>
    )
  }

  const status = getEventStatus(metadata?.eventDate, metadata?.startTime, metadata?.endTime)
  const attendeeCount = eventAccount?.attendeeCount || 0
  const capacity = metadata?.capacity

  const hasCapacity = typeof capacity === 'number' && capacity > 0
  const progressPercent = hasCapacity ? Math.min(100, Math.round((attendeeCount / capacity!) * 100)) : 0

  return (
    <div className="py-6 sm:py-8 max-w-5xl mx-auto px-4 space-y-8">
      {/* Navigation & Header */}
      <div className="space-y-4 border-b border-[#1F2D44] pb-6">
        <Link
          href="/organizer"
          className="inline-flex items-center gap-1.5 text-xs text-[#8FA3C8] hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" />
          <span>Back to Organizer Dashboard</span>
        </Link>

        {isLoading ? (
          <div className="py-8 flex items-center justify-center gap-2 text-[#8FA3C8]">
            <Loader2 className="w-5 h-5 animate-spin text-[#9945FF]" />
            <span className="text-sm">Fetching event details...</span>
          </div>
        ) : !eventAccount ? (
          <div className="text-center py-10 space-y-2">
            <h2 className="text-xl font-bold text-[#E8EDF6]">Event Not Found</h2>
            <p className="text-xs text-[#8FA3C8]">No event exists on Solana Devnet at this address.</p>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-4xl font-extrabold text-[#E8EDF6]">{metadata?.name || eventAccount.name}</h1>
                {status && (
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase shrink-0 ${
                      status === 'LIVE'
                        ? 'bg-[#14F195]/20 text-[#14F195] border border-[#14F195]/30'
                        : status === 'UPCOMING'
                        ? 'bg-[#9945FF]/20 text-[#9945FF] border border-[#9945FF]/30'
                        : 'bg-neutral-800 text-neutral-400'
                    }`}
                  >
                    {status}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#8FA3C8] font-mono break-all">PDA: {eventPdaStr}</p>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/check-in/${eventPdaStr}`)
                  toast.success('Attendee check-in link copied!')
                }}
                className="bg-[#1F2D44] hover:bg-[#283A58] text-[#E8EDF6] px-3.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 border border-[#8FA3C8]/10"
              >
                <Copy className="w-3.5 h-3.5 shrink-0" />
                <span>Share Link</span>
              </button>

              <button
                onClick={() => setShowQrModal(true)}
                className="bg-[#1F2D44] hover:bg-[#283A58] text-[#E8EDF6] px-3.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 border border-[#8FA3C8]/10"
              >
                <QrCode className="w-3.5 h-3.5 shrink-0" />
                <span>QR Code</span>
              </button>

              <Link
                href={`/organizer/event/${eventPdaStr}/live`}
                className="btn-solana-gradient px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-lg"
              >
                <span>Live Desk Mode</span>
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              </Link>
            </div>
          </div>
        )}
      </div>

      {eventAccount && (
        <div className="space-y-8">
          {/* Stat Row & Attendance Progress Bar */}
          <div className="bg-[#161F30] border border-[#1F2D44] rounded-2xl p-6 space-y-6 shadow-xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-[#0B1220] border border-[#1F2D44] rounded-xl p-4 space-y-1">
                <span className="text-xs text-[#8FA3C8] font-medium uppercase tracking-wider block">Checked In Attendees</span>
                <span className="text-3xl font-extrabold text-[#14F195]">{attendeeCount}</span>
              </div>
              <div className="bg-[#0B1220] border border-[#1F2D44] rounded-xl p-4 space-y-1">
                <span className="text-xs text-[#8FA3C8] font-medium uppercase tracking-wider block">Badges Issued</span>
                <span className="text-3xl font-extrabold text-[#9945FF]">{attendeeCount}</span>
              </div>
            </div>

            {/* Progress Bar (ONLY shown IF capacity was set) */}
            {hasCapacity && (
              <div className="space-y-2 pt-2 border-t border-[#1F2D44]">
                <div className="flex items-center justify-between text-xs text-[#8FA3C8]">
                  <span>Capacity Fill Progress</span>
                  <span className="font-bold text-[#E8EDF6]">
                    {attendeeCount} / {capacity} ({progressPercent}%)
                  </span>
                </div>
                <div className="w-full h-3 bg-[#0B1220] rounded-full overflow-hidden border border-[#1F2D44]">
                  <div
                    className="h-full bg-gradient-to-r from-purple-600 to-[#14F195] transition-all duration-500 rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Event Metadata Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 bg-[#161F30] border border-[#1F2D44] rounded-2xl p-6 space-y-6 shadow-xl">
              <h2 className="text-lg font-bold text-[#E8EDF6] border-b border-[#1F2D44] pb-3">Event Details</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[#8FA3C8] block">Category / Type</span>
                  <span className="text-[#E8EDF6] font-semibold text-sm">{metadata?.eventType || 'Event'}</span>
                </div>
                <div>
                  <span className="text-[#8FA3C8] block">Location</span>
                  <span className="text-[#E8EDF6]">{metadata?.location || 'Location not specified'}</span>
                </div>
                <div>
                  <span className="text-[#8FA3C8] block">Event Date</span>
                  <span className="text-[#E8EDF6]">{metadata?.eventDate || 'No date set'}</span>
                </div>
                <div>
                  <span className="text-[#8FA3C8] block">Schedule</span>
                  <span className="text-[#E8EDF6]">
                    {metadata?.startTime ? `${metadata.startTime} - ${metadata.endTime || 'End'}` : 'Time not specified'}
                  </span>
                </div>
              </div>

              {metadata?.description && (
                <div className="pt-3 border-t border-[#1F2D44]">
                  <span className="text-xs text-[#8FA3C8] block mb-1">Description</span>
                  <p className="text-xs text-[#E8EDF6] leading-relaxed">{metadata.description}</p>
                </div>
              )}
            </div>

            {/* Badge Artwork Card */}
            <div className="lg:col-span-4 bg-[#161F30] border border-[#1F2D44] rounded-2xl p-6 space-y-4 shadow-xl text-center">
              <h3 className="text-sm font-bold text-[#E8EDF6]">Soulbound Badge Artwork</h3>
              <div className="w-40 h-40 mx-auto rounded-2xl bg-gradient-to-br from-purple-600 to-teal-400 p-1 shadow-lg relative">
                <div className="w-full h-full rounded-[14px] bg-[#0B1220] overflow-hidden flex items-center justify-center p-2">
                  {metadata?.badgeImage ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={metadata.badgeImage} alt="Badge" className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <span className="text-xs font-bold text-[#9945FF]">Soulbound Badge</span>
                  )}
                </div>
              </div>
              <p className="text-[11px] text-[#8FA3C8] break-all font-mono">
                URI: {truncateWallet(eventAccount.badgeUri, 12, 8)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQrModal && eventAccount && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 min-h-screen overflow-y-auto">
          <div className="bg-[#161F30] border border-[#1F2D44] rounded-2xl p-6 sm:p-8 max-w-md w-full text-center space-y-6 relative shadow-2xl animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 text-[#8FA3C8] hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="space-y-1">
              <span className="text-xs uppercase text-[#14F195] font-semibold tracking-wider block">Check-In QR Code</span>
              <h3 className="text-xl font-bold text-[#E8EDF6]">{metadata?.name || eventAccount.name}</h3>
            </div>

            <div className="bg-white p-4 rounded-xl inline-flex items-center justify-center shadow-inner mx-auto">
              <QRCodeSVG
                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/check-in/${eventPdaStr}`}
                size={200}
                level="H"
                includeMargin={true}
              />
            </div>

            <button
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/check-in/${eventPdaStr}`)
                toast.success('Check-In link copied!')
              }}
              className="w-full bg-[#1F2D44] hover:bg-[#283A58] text-[#E8EDF6] py-2.5 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-2 border border-[#8FA3C8]/20"
            >
              <Copy className="w-4 h-4 shrink-0" />
              <span>Copy Check-In Link</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
