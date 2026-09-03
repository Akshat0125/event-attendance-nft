'use client'

import { useState, useEffect } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { useEventAttendanceNftProgram } from '@/components/event-attendance-nft/event-attendance-nft-data-access'
import { WalletButton } from '@/components/solana/solana-provider'
import { QRCodeSVG } from 'qrcode.react'
import { toast } from 'sonner'
import { Upload, QrCode, CheckCircle2, Copy, Loader2, X } from 'lucide-react'

// Presets
const BADGE_PRESETS = [
  {
    id: 'violet',
    name: 'Classic Violet',
    uri: 'ipfs://QmEventAttendanceBadgeFixedUri/metadata.json',
    previewUrl: 'https://gateway.pinata.cloud/ipfs/QmEventAttendanceBadgeFixedUri/image.png',
    gradient: 'from-purple-600 to-indigo-600',
  },
  {
    id: 'teal',
    name: 'Classic Teal',
    uri: 'ipfs://QmEventAttendanceBadgeTealUri/metadata.json',
    previewUrl: 'https://gateway.pinata.cloud/ipfs/QmEventAttendanceBadgeTealUri/image.png',
    gradient: 'from-teal-500 to-emerald-600',
  },
]

export default function OrganizerPage() {
  const wallet = useWallet()
  const { connection } = useConnection()
  const { program, programId, createEvent } = useEventAttendanceNftProgram()

  const [eventName, setEventName] = useState('')
  const [selectedBadgeOption, setSelectedBadgeOption] = useState<'violet' | 'teal' | 'custom'>('violet')
  const [customFile, setCustomFile] = useState<File | null>(null)
  const [customPreviewUrl, setCustomPreviewUrl] = useState<string | null>(null)
  const [customUploadedUri, setCustomUploadedUri] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  // List of organizer's events
  const [organizerEvents, setOrganizerEvents] = useState<any[]>([])
  const [isLoadingEvents, setIsLoadingEvents] = useState(false)

  // QR Modal
  const [activeQrEvent, setActiveQrEvent] = useState<{ name: string; pda: string } | null>(null)

  // Fetch organizer events from chain
  const fetchEvents = async () => {
    if (!program || !wallet.publicKey) return
    setIsLoadingEvents(true)
    try {
      const accounts = await program.account.event.all([
        {
          memcmp: {
            offset: 8,
            bytes: wallet.publicKey.toBase58(),
          },
        },
      ])

      const parsedEvents = accounts.map((acc) => ({
        publicKey: acc.publicKey.toBase58(),
        name: acc.account.name,
        attendeeCount: acc.account.attendeeCount,
        badgeUri: acc.account.badgeUri || BADGE_PRESETS[0].uri,
      }))

      setOrganizerEvents(parsedEvents)
    } catch (err) {
      console.error('Error fetching organizer events:', err)
    } finally {
      setIsLoadingEvents(false)
    }
  }

  useEffect(() => {
    fetchEvents()
  }, [program, wallet.publicKey])

  // Handle custom file upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setCustomFile(file)
    setCustomPreviewUrl(URL.createObjectURL(file))
    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('name', eventName || 'Custom Badge')

      const res = await fetch('/api/upload-badge', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (res.ok && data.uri) {
        setCustomUploadedUri(data.uri)
        toast.success('Custom badge image uploaded to IPFS successfully!')
      } else {
        toast.error(data.error || 'Failed to upload badge image')
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error uploading badge image')
    } finally {
      setIsUploading(false)
    }
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!wallet.publicKey) {
      toast.error('Please connect your wallet first!')
      return
    }

    if (!eventName.trim()) {
      toast.error('Please enter an event name!')
      return
    }

    let badgeUri = ''
    if (selectedBadgeOption === 'violet') {
      badgeUri = BADGE_PRESETS[0].uri
    } else if (selectedBadgeOption === 'teal') {
      badgeUri = BADGE_PRESETS[1].uri
    } else {
      if (!customUploadedUri) {
        toast.error('Please select and upload a custom badge image first!')
        return
      }
      badgeUri = customUploadedUri
    }

    try {
      await createEvent.mutateAsync({
        name: eventName.trim(),
        badgeUri,
        organizer: wallet.publicKey,
      })
      setEventName('')
      setCustomFile(null)
      setCustomPreviewUrl(null)
      setCustomUploadedUri(null)
      fetchEvents()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="py-6 sm:py-8 max-w-5xl mx-auto px-4 space-y-8 sm:space-y-12">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-[#1F2D44] pb-6 sm:pb-8">
        <div>
          <div className="inline-flex items-center justify-center px-3.5 py-1 rounded-full bg-[#9945FF]/10 text-[#9945FF] text-xs font-semibold uppercase mb-2 border border-[#9945FF]/20">
            Organizer Portal
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-[#E8EDF6]">Manage Events & Badges</h1>
          <p className="text-xs sm:text-sm text-[#8FA3C8] mt-1">Create events, choose dynamic badge artwork, and share instant check-in QR codes.</p>
        </div>
        {!wallet.publicKey && <WalletButton />}
      </div>

      {!wallet.publicKey ? (
        <div className="bg-[#161F30] border border-[#1F2D44] rounded-2xl p-8 sm:p-12 text-center space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold text-[#E8EDF6]">Connect Organizer Wallet</h2>
          <p className="text-[#8FA3C8] max-w-md mx-auto text-xs sm:text-sm leading-relaxed">
            Please connect your Phantom wallet to create and manage on-chain events on Solana Devnet.
          </p>
          <div className="pt-2 flex items-center justify-center">
            <WalletButton />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Create Event Form Column */}
          <div className="lg:col-span-6 bg-[#161F30] border border-[#1F2D44] rounded-2xl p-5 sm:p-8 space-y-6 shadow-xl">
            <div className="flex items-center gap-3 border-b border-[#1F2D44] pb-4">
              <div className="w-9 h-9 rounded-lg bg-[#9945FF]/20 text-[#9945FF] flex items-center justify-center font-bold text-sm shrink-0">
                1
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-[#E8EDF6]">Create New Event</h2>
                <p className="text-xs text-[#8FA3C8]">Deploys a new Event PDA on Solana Devnet</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Event Name */}
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-semibold text-[#E8EDF6] flex justify-between items-center">
                  <span>Event Name</span>
                  <span className="text-xs text-[#8FA3C8] font-normal">{eventName.length}/50</span>
                </label>
                <input
                  type="text"
                  maxLength={50}
                  placeholder="e.g. Solana Hacker House 2026"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  className="w-full bg-[#0B1220] border border-[#1F2D44] focus:border-[#9945FF] focus:ring-1 focus:ring-[#9945FF] rounded-xl px-4 py-3 text-[#E8EDF6] placeholder-[#8FA3C8]/50 text-sm outline-none transition"
                  required
                />
              </div>

              {/* Badge Selection Step */}
              <div className="space-y-3">
                <label className="text-xs sm:text-sm font-semibold text-[#E8EDF6]">Select Badge Design</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Preset 1 */}
                  <button
                    type="button"
                    onClick={() => setSelectedBadgeOption('violet')}
                    className={`p-3 rounded-xl border text-left transition relative flex flex-col justify-between h-28 ${
                      selectedBadgeOption === 'violet'
                        ? 'border-[#9945FF] bg-[#9945FF]/10 ring-1 ring-[#9945FF]'
                        : 'border-[#1F2D44] bg-[#0B1220] hover:border-[#8FA3C8]/40'
                    }`}
                  >
                    <div className="w-full h-10 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs">
                      Violet
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-[#E8EDF6] block">Classic Violet</span>
                      <span className="text-[10px] text-[#8FA3C8]">Preset IPFS</span>
                    </div>
                    {selectedBadgeOption === 'violet' && (
                      <CheckCircle2 className="w-4 h-4 text-[#9945FF] absolute top-2 right-2" />
                    )}
                  </button>

                  {/* Preset 2 */}
                  <button
                    type="button"
                    onClick={() => setSelectedBadgeOption('teal')}
                    className={`p-3 rounded-xl border text-left transition relative flex flex-col justify-between h-28 ${
                      selectedBadgeOption === 'teal'
                        ? 'border-[#14F195] bg-[#14F195]/10 ring-1 ring-[#14F195]'
                        : 'border-[#1F2D44] bg-[#0B1220] hover:border-[#8FA3C8]/40'
                    }`}
                  >
                    <div className="w-full h-10 rounded-lg bg-gradient-to-r from-teal-500 to-emerald-600 flex items-center justify-center text-white font-bold text-xs">
                      Teal
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-[#E8EDF6] block">Classic Teal</span>
                      <span className="text-[10px] text-[#8FA3C8]">Preset IPFS</span>
                    </div>
                    {selectedBadgeOption === 'teal' && (
                      <CheckCircle2 className="w-4 h-4 text-[#14F195] absolute top-2 right-2" />
                    )}
                  </button>

                  {/* Custom Upload Option */}
                  <button
                    type="button"
                    onClick={() => setSelectedBadgeOption('custom')}
                    className={`p-3 rounded-xl border text-left transition relative flex flex-col justify-between h-28 ${
                      selectedBadgeOption === 'custom'
                        ? 'border-[#9945FF] bg-[#9945FF]/10 ring-1 ring-[#9945FF]'
                        : 'border-[#1F2D44] bg-[#0B1220] hover:border-[#8FA3C8]/40'
                    }`}
                  >
                    <div className="w-full h-10 rounded-lg border border-dashed border-[#8FA3C8]/40 flex items-center justify-center text-[#8FA3C8]">
                      <Upload className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-[#E8EDF6] block">Custom</span>
                      <span className="text-[10px] text-[#8FA3C8]">Pinata IPFS</span>
                    </div>
                    {selectedBadgeOption === 'custom' && (
                      <CheckCircle2 className="w-4 h-4 text-[#9945FF] absolute top-2 right-2" />
                    )}
                  </button>
                </div>
              </div>

              {/* Custom File Picker UI */}
              {selectedBadgeOption === 'custom' && (
                <div className="p-4 bg-[#0B1220] border border-[#1F2D44] rounded-xl space-y-3">
                  <label className="text-xs font-semibold text-[#8FA3C8] block">Upload Custom Badge Image (PNG/JPG)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="block w-full text-xs text-[#8FA3C8] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#9945FF]/20 file:text-[#9945FF] hover:file:bg-[#9945FF]/30 cursor-pointer"
                  />
                  {isUploading && (
                    <div className="inline-flex items-center gap-2 text-xs text-[#9945FF]">
                      <Loader2 className="w-4 h-4 animate-spin shrink-0" /> Uploading image to Pinata IPFS...
                    </div>
                  )}
                  {customPreviewUrl && !isUploading && (
                    <div className="flex items-center gap-3 pt-2">
                      <div className="w-12 h-12 rounded-lg overflow-hidden border border-[#9945FF]/40 relative bg-black/40 shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={customPreviewUrl} alt="Badge preview" className="w-full h-full object-cover" />
                      </div>
                      <div className="text-xs min-w-0">
                        <span className="text-[#14F195] font-semibold block">Ready for IPFS Metadata</span>
                        <span className="text-[#8FA3C8] text-[10px] font-mono block truncate">CID: {customUploadedUri?.slice(0, 18)}...</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={createEvent.isPending || isUploading}
                className="w-full btn-solana-gradient py-3.5 px-6 rounded-xl font-bold text-base inline-flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {createEvent.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin shrink-0" />
                    <span>Creating Event on Devnet...</span>
                  </>
                ) : (
                  <span>Create Event & Mint PDA</span>
                )}
              </button>
            </form>
          </div>

          {/* Organized Events List Column */}
          <div className="lg:col-span-6 space-y-6">
            <div className="bg-[#161F30] border border-[#1F2D44] rounded-2xl p-5 sm:p-8 space-y-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-[#1F2D44] pb-4 gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-[#14F195]/20 text-[#14F195] flex items-center justify-center font-bold text-sm shrink-0">
                    2
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg sm:text-xl font-bold text-[#E8EDF6] truncate">Your Events</h2>
                    <p className="text-xs text-[#8FA3C8] truncate">Organized by {wallet.publicKey.toBase58().slice(0, 6)}...</p>
                  </div>
                </div>
                <button
                  onClick={fetchEvents}
                  className="text-xs text-[#8FA3C8] hover:text-[#E8EDF6] underline shrink-0"
                >
                  Refresh
                </button>
              </div>

              {isLoadingEvents ? (
                <div className="py-10 text-center text-[#8FA3C8] flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-[#9945FF]" />
                  <span className="text-xs">Fetching your on-chain events...</span>
                </div>
              ) : organizerEvents.length === 0 ? (
                <div className="py-10 text-center text-[#8FA3C8] space-y-2 border border-dashed border-[#1F2D44] rounded-xl p-6">
                  <p className="text-sm font-semibold text-[#E8EDF6]">No Events Found</p>
                  <p className="text-xs">Use the form on the left to create your first event on Solana Devnet.</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                  {organizerEvents.map((evt) => (
                    <div
                      key={evt.publicKey}
                      className="bg-[#0B1220] border border-[#1F2D44] hover:border-[#14F195]/40 rounded-xl p-4 space-y-3 transition"
                    >
                      <div className="flex items-start justify-between gap-3 min-w-0">
                        <div className="min-w-0">
                          <h3 className="font-bold text-[#E8EDF6] text-base truncate">{evt.name}</h3>
                          <span className="text-[11px] text-[#8FA3C8] font-mono block truncate">PDA: {evt.publicKey}</span>
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-[#14F195]/15 text-[#14F195] text-xs font-bold whitespace-nowrap shrink-0 inline-flex items-center justify-center">
                          {evt.attendeeCount} Attendees
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-[#1F2D44]/60 gap-2">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/check-in/${evt.publicKey}`)
                            toast.success('Check-In link copied to clipboard!')
                          }}
                          className="text-xs text-[#8FA3C8] hover:text-[#E8EDF6] inline-flex items-center gap-1.5"
                        >
                          <Copy className="w-3.5 h-3.5 shrink-0" /> Copy Link
                        </button>

                        <button
                          onClick={() => setActiveQrEvent({ name: evt.name, pda: evt.publicKey })}
                          className="btn-solana-gradient px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 shrink-0"
                        >
                          <QrCode className="w-3.5 h-3.5 shrink-0" /> Show QR
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal Popup */}
      {activeQrEvent && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 min-h-screen overflow-y-auto">
          <div className="bg-[#161F30] border border-[#1F2D44] rounded-2xl p-6 sm:p-8 max-w-md w-full text-center space-y-6 relative shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto my-auto">
            <button
              onClick={() => setActiveQrEvent(null)}
              className="absolute top-4 right-4 text-[#8FA3C8] hover:text-white inline-flex items-center justify-center"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="space-y-1">
              <span className="text-xs uppercase text-[#14F195] font-semibold tracking-wider block">Attendee Check-In QR</span>
              <h3 className="text-xl sm:text-2xl font-bold text-[#E8EDF6] break-words">{activeQrEvent.name}</h3>
              <p className="text-xs text-[#8FA3C8] font-mono truncate">PDA: {activeQrEvent.pda.slice(0, 10)}...{activeQrEvent.pda.slice(-8)}</p>
            </div>

            {/* Render Client-Side QR Code */}
            <div className="bg-white p-4 rounded-xl inline-flex items-center justify-center shadow-inner mx-auto">
              <QRCodeSVG
                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/check-in/${activeQrEvent.pda}`}
                size={200}
                level="H"
                includeMargin={true}
              />
            </div>

            <p className="text-xs text-[#8FA3C8] leading-relaxed">
              Attendees can scan this QR code with their mobile phone camera to open the direct check-in page.
            </p>

            <button
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/check-in/${activeQrEvent.pda}`)
                toast.success('Check-In link copied!')
              }}
              className="w-full bg-[#1F2D44] hover:bg-[#283A58] text-[#E8EDF6] py-2.5 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-2 border border-[#8FA3C8]/20"
            >
              <Copy className="w-4 h-4 shrink-0" /> Copy Check-In Link
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
