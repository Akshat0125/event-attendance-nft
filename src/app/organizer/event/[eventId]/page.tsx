'use client'

import { useState, useEffect, use } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { useEventAttendanceNftProgram } from '@/components/event-attendance-nft/event-attendance-nft-data-access'
import { QRCodeSVG } from 'qrcode.react'
import { toast } from 'sonner'
import Link from 'next/link'
import { fetchEventMetadata, getEventStatus, truncateWallet, EventMetadata } from '@/lib/event-metadata'
import { Copy, QrCode, ArrowLeft, Loader2, X, ExternalLink, ShieldCheck, CheckCircle2 } from 'lucide-react'

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
        <div className="text-red-600 font-bold text-base">Invalid Event Address</div>
        <p className="text-xs text-[#6B7280]">The provided address is not a valid Solana public key.</p>
        <Link href="/organizer" className="inline-flex items-center gap-1.5 text-xs text-[#111827] font-semibold underline">
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
      <div className="space-y-4 border-b border-[#E5E7EB] pb-6">
        <Link
          href="/organizer"
          className="inline-flex items-center gap-1.5 text-xs text-[#6B7280] hover:text-[#111827] transition"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" />
          <span>Back to Organizer Dashboard</span>
        </Link>

        {isLoading ? (
          <div className="py-8 flex items-center justify-center gap-2 text-[#6B7280]">
            <Loader2 className="w-5 h-5 animate-spin text-[#111827]" />
            <span className="text-sm">Loading event...</span>
          </div>
        ) : !eventAccount ? (
          <div className="text-center py-10 space-y-2">
            <h2 className="text-xl font-bold text-[#111827]">Event Not Found</h2>
            <p className="text-xs text-[#6B7280]">No event exists on Solana Devnet at this address.</p>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111827]">{metadata?.name || eventAccount.name}</h1>
                {status && (
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${
                      status === 'LIVE'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : status === 'UPCOMING'
                        ? 'bg-purple-50 text-purple-700 border border-purple-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    {status}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#6B7280] font-mono break-all">PDA: {eventPdaStr}</p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/check-in/${eventPdaStr}`)
                  toast.success('Attendee check-in link copied!')
                }}
                className="bg-slate-100 hover:bg-slate-200 text-[#111827] px-3 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 border border-slate-200"
              >
                <Copy className="w-3.5 h-3.5 shrink-0" />
                <span>Share Link</span>
              </button>

              <button
                onClick={() => setShowQrModal(true)}
                className="bg-slate-100 hover:bg-slate-200 text-[#111827] px-3 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 border border-slate-200"
              >
                <QrCode className="w-3.5 h-3.5 shrink-0" />
                <span>QR Code</span>
              </button>

              <Link
                href={`/organizer/event/${eventPdaStr}/live`}
                className="bg-[#111827] hover:bg-[#1F2937] text-white px-4 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm transition"
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
          {/* Stat Row & Capacity Progress Bar */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 space-y-6 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-1">
                <span className="text-xs text-[#6B7280] font-medium block">Checked In Attendees</span>
                <span className="text-3xl font-extrabold text-emerald-600">{attendeeCount}</span>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-1">
                <span className="text-xs text-[#6B7280] font-medium block">Badges Issued</span>
                <span className="text-3xl font-extrabold text-[#9945FF]">{attendeeCount}</span>
              </div>
            </div>

            {hasCapacity && (
              <div className="space-y-2 pt-2 border-t border-[#E5E7EB]">
                <div className="flex items-center justify-between text-xs text-[#6B7280]">
                  <span>Capacity Fill Progress</span>
                  <span className="font-bold text-[#111827]">
                    {attendeeCount} / {capacity} ({progressPercent}%)
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                  <div
                    className="h-full bg-gradient-to-r from-[#9945FF] to-emerald-500 transition-all duration-300 rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Event Details & High-Signal Badge Credential Visual */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 bg-white border border-[#E5E7EB] rounded-xl p-6 space-y-5 shadow-sm">
              <h2 className="text-base font-bold text-[#111827] border-b border-[#E5E7EB] pb-3">Event Details</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[#6B7280] block">Category</span>
                  <span className="text-[#111827] font-semibold">{metadata?.eventType || 'Event'}</span>
                </div>
                <div>
                  <span className="text-[#6B7280] block">Location</span>
                  <span className="text-[#111827]">{metadata?.location || 'Not specified'}</span>
                </div>
                <div>
                  <span className="text-[#6B7280] block">Event Date</span>
                  <span className="text-[#111827]">{metadata?.eventDate || 'No date set'}</span>
                </div>
                <div>
                  <span className="text-[#6B7280] block">Schedule</span>
                  <span className="text-[#111827]">
                    {metadata?.startTime ? `${metadata.startTime} - ${metadata.endTime || 'End'}` : 'Not specified'}
                  </span>
                </div>
              </div>

              {metadata?.description && (
                <div className="pt-3 border-t border-[#E5E7EB]">
                  <span className="text-xs text-[#6B7280] block mb-1">Description</span>
                  <p className="text-xs text-[#111827] leading-relaxed">{metadata.description}</p>
                </div>
              )}
            </div>

            {/* High-Signal Premium Credential Visual (The ONE strong gradient place) */}
            <div className="lg:col-span-5">
              <div className="bg-gradient-to-br from-[#9945FF] via-purple-600 to-[#14F195] rounded-2xl p-1 shadow-lg">
                <div className="bg-white rounded-[14px] p-6 space-y-5 flex flex-col justify-between h-full">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <span className="text-[10px] font-extrabold tracking-widest uppercase text-[#9945FF]">
                      NFTicket Credential
                    </span>
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  </div>

                  <div className="space-y-3 text-center py-2">
                    <div className="w-24 h-24 mx-auto rounded-xl border border-slate-200 overflow-hidden bg-slate-50 p-1 shadow-xs">
                      {metadata?.badgeImage ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={metadata.badgeImage} alt="Badge Artwork" className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-xs text-[#9945FF]">
                          Badge
                        </div>
                      )}
                    </div>

                    <div>
                      <h3 className="font-extrabold text-[#111827] text-base leading-snug">
                        {metadata?.name || eventAccount.name}
                      </h3>
                      <p className="text-xs text-[#6B7280] font-mono mt-0.5">
                        {metadata?.eventDate || 'On-chain Event'}
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-3 text-[11px] text-[#6B7280] space-y-1 font-mono border border-slate-100">
                    <div className="flex justify-between">
                      <span>Type:</span>
                      <span className="font-bold text-[#111827]">Soulbound Badge</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <span className="font-bold text-emerald-600 inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Verified
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQrModal && eventAccount && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 min-h-screen overflow-y-auto">
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 max-w-sm w-full text-center space-y-5 relative shadow-xl animate-in fade-in zoom-in duration-150 my-auto">
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <span className="text-[10px] uppercase text-emerald-600 font-bold tracking-wider block">Check-In QR Code</span>
              <h3 className="text-lg font-bold text-[#111827]">{metadata?.name || eventAccount.name}</h3>
            </div>

            <div className="bg-white p-3 border border-[#E5E7EB] rounded-xl inline-flex items-center justify-center mx-auto shadow-xs">
              <QRCodeSVG
                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/check-in/${eventPdaStr}`}
                size={180}
                level="H"
                includeMargin={true}
              />
            </div>

            <button
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/check-in/${eventPdaStr}`)
                toast.success('Check-In link copied!')
              }}
              className="w-full bg-slate-100 hover:bg-slate-200 text-[#111827] py-2.5 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-2 border border-slate-200"
            >
              <Copy className="w-4 h-4 shrink-0" />
              <span>Copy Link</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
