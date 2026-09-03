'use client'

import { useState, useEffect } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { useEventAttendanceNftProgram } from '@/components/event-attendance-nft/event-attendance-nft-data-access'
import { WalletButton } from '@/components/solana/solana-provider'
import { QRCodeSVG } from 'qrcode.react'
import { toast } from 'sonner'
import Link from 'next/link'
import { fetchEventMetadata, getEventStatus, truncateWallet, EventMetadata } from '@/lib/event-metadata'
import { Upload, QrCode, CheckCircle2, Copy, Loader2, X, ChevronDown, ChevronUp, ArrowRight, ArrowLeft } from 'lucide-react'

// Presets
const BADGE_PRESETS = [
  {
    id: 'violet',
    name: 'Classic Violet',
    uri: 'ipfs://QmEventAttendanceBadgeFixedUri/metadata.json',
    previewUrl: 'https://gateway.pinata.cloud/ipfs/QmEventAttendanceBadgeFixedUri/image.png',
  },
  {
    id: 'teal',
    name: 'Classic Teal',
    uri: 'ipfs://QmEventAttendanceBadgeTealUri/metadata.json',
    previewUrl: 'https://gateway.pinata.cloud/ipfs/QmEventAttendanceBadgeTealUri/image.png',
  },
]

export default function OrganizerDashboardPage() {
  const wallet = useWallet()
  const { connection } = useConnection()
  const { program, programId } = useEventAttendanceNftProgram()

  // Form Step State (1: Details, 2: Schedule, 3: Badge, 4: Review)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1)

  // Form Fields
  const [eventName, setEventName] = useState('')
  const [eventDescription, setEventDescription] = useState('')
  const [eventLocation, setEventLocation] = useState('')
  const [eventType, setEventType] = useState('Conference')
  const [eventDate, setEventDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [capacity, setCapacity] = useState('')

  // Badge Choice
  const [selectedBadgeOption, setSelectedBadgeOption] = useState<'violet' | 'teal' | 'custom'>('violet')
  const [customFile, setCustomFile] = useState<File | null>(null)
  const [customPreviewUrl, setCustomPreviewUrl] = useState<string | null>(null)

  // Transaction Progress & Error States
  const [txProgressState, setTxProgressState] = useState<
    'idle' | 'preparing' | 'approving' | 'submitting' | 'confirming' | 'success' | 'error'
  >('idle')
  const [rawTxError, setRawTxError] = useState<string | null>(null)
  const [showTechnicalError, setShowTechnicalError] = useState(false)

  // Organizer Events List
  const [organizerEvents, setOrganizerEvents] = useState<
    {
      publicKey: string
      name: string
      attendeeCount: number
      badgeUri: string
      metadata?: EventMetadata | null
    }[]
  >([])
  const [isLoadingEvents, setIsLoadingEvents] = useState(false)

  // Quick QR Modal
  const [activeQrEvent, setActiveQrEvent] = useState<{ name: string; pda: string } | null>(null)

  // Fetch organizer's events from chain
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

      const parsedEvents = await Promise.all(
        accounts.map(async (acc) => {
          const pubkeyStr = acc.publicKey.toBase58()
          const rawName = acc.account.name
          const rawAttendeeCount = acc.account.attendeeCount
          const rawBadgeUri = acc.account.badgeUri || BADGE_PRESETS[0].uri

          const meta = await fetchEventMetadata(rawBadgeUri)

          return {
            publicKey: pubkeyStr,
            name: meta?.name || rawName,
            attendeeCount: rawAttendeeCount,
            badgeUri: rawBadgeUri,
            metadata: meta,
          }
        })
      )

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

  // Stat computations from real data
  const totalEventsCount = organizerEvents.length
  const totalCheckedInCount = organizerEvents.reduce((sum, e) => sum + e.attendeeCount, 0)
  const badgesIssuedCount = totalCheckedInCount // 1 badge per check-in

  // Custom Image File Upload
  const handleCustomFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCustomFile(file)
    setCustomPreviewUrl(URL.createObjectURL(file))
  }

  // Multi-Step Form Submission Flow
  const handleCreateEventSubmit = async () => {
    if (!wallet.publicKey || !program || !wallet.sendTransaction) {
      toast.error('Please connect your Phantom wallet first!')
      return
    }

    if (!eventName.trim()) {
      toast.error('Event name is required!')
      setCurrentStep(1)
      return
    }

    setTxProgressState('preparing')
    setRawTxError(null)

    try {
      // 1. Upload Rich Event Metadata to IPFS via /api/upload-badge
      const formData = new FormData()
      formData.append('name', eventName.trim())
      if (eventDescription) formData.append('description', eventDescription.trim())
      if (eventLocation) formData.append('location', eventLocation.trim())
      if (eventDate) formData.append('eventDate', eventDate)
      if (startTime) formData.append('startTime', startTime)
      if (endTime) formData.append('endTime', endTime)
      if (eventType) formData.append('eventType', eventType)
      if (capacity) formData.append('capacity', capacity)

      if (selectedBadgeOption === 'custom' && customFile) {
        formData.append('file', customFile)
      } else if (selectedBadgeOption === 'teal') {
        formData.append('presetBadgeUri', BADGE_PRESETS[1].uri)
      } else {
        formData.append('presetBadgeUri', BADGE_PRESETS[0].uri)
      }

      const uploadRes = await fetch('/api/upload-badge', {
        method: 'POST',
        body: formData,
      })

      const uploadData = await uploadRes.json()
      if (!uploadRes.ok || !uploadData.uri) {
        throw new Error(uploadData.error || 'Failed to upload event metadata to IPFS')
      }

      const metadataIpfsUri = uploadData.uri

      // 2. Derive Event PDA
      const [eventPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('event'), wallet.publicKey.toBuffer(), Buffer.from(eventName.trim())],
        programId
      )

      // Pre-check existence
      const existing = await connection.getAccountInfo(eventPda)
      if (existing !== null) {
        toast.info(`Event "${eventName.trim()}" already exists on-chain!`)
        setTxProgressState('idle')
        fetchEvents()
        return
      }

      // 3. Build Solana Transaction
      setTxProgressState('approving')
      const transaction = await program.methods
        .createEvent(eventName.trim(), metadataIpfsUri)
        .accounts({
          organizer: wallet.publicKey,
          event: eventPda,
          systemProgram: PublicKey.default,
        } as any)
        .transaction()

      transaction.feePayer = wallet.publicKey
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
      transaction.recentBlockhash = blockhash

      // 4. Send Transaction via Phantom
      setTxProgressState('submitting')
      const signature = await wallet.sendTransaction(transaction, connection)

      // 5. Confirm on Devnet
      setTxProgressState('confirming')
      await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed')

      setTxProgressState('success')
      toast.success(`Event created successfully!`)

      // Reset Form State
      setTimeout(() => {
        setEventName('')
        setEventDescription('')
        setEventLocation('')
        setEventDate('')
        setStartTime('')
        setEndTime('')
        setCapacity('')
        setCustomFile(null)
        setCustomPreviewUrl(null)
        setCurrentStep(1)
        setTxProgressState('idle')
        fetchEvents()
      }, 1500)
    } catch (err: any) {
      console.error('Create Event Error:', err)
      setTxProgressState('error')
      setRawTxError(err?.message || JSON.stringify(err))
    }
  }

  return (
    <div className="py-6 sm:py-8 max-w-6xl mx-auto px-4 space-y-8 sm:space-y-10">
      {/* Dashboard Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-[#1F2D44] pb-6 sm:pb-8">
        <div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-[#E8EDF6]">Organizer Dashboard</h1>
          <p className="text-xs sm:text-sm text-[#8FA3C8] mt-1">
            Create events, manage attendance, and monitor verifiable credentials.
          </p>
        </div>
        {!wallet.publicKey ? (
          <WalletButton />
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#8FA3C8] font-mono bg-[#161F30] px-3 py-1.5 rounded-lg border border-[#1F2D44]">
              Connected: {truncateWallet(wallet.publicKey.toBase58())}
            </span>
          </div>
        )}
      </div>

      {!wallet.publicKey ? (
        <div className="bg-[#161F30] border border-[#1F2D44] rounded-2xl p-8 sm:p-12 text-center space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold text-[#E8EDF6]">Connect Organizer Wallet</h2>
          <p className="text-[#8FA3C8] max-w-md mx-auto text-xs sm:text-sm leading-relaxed">
            Please connect your Phantom wallet to view your dashboard and create events on Solana Devnet.
          </p>
          <div className="pt-2 flex items-center justify-center">
            <WalletButton />
          </div>
        </div>
      ) : (
        <>
          {/* Top Stat Cards (Real Data from getProgramAccounts) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#161F30] border border-[#1F2D44] rounded-xl p-5 space-y-1">
              <span className="text-xs text-[#8FA3C8] font-medium uppercase tracking-wider block">Total Events</span>
              <span className="text-2xl sm:text-3xl font-extrabold text-[#E8EDF6]">{totalEventsCount}</span>
            </div>
            <div className="bg-[#161F30] border border-[#1F2D44] rounded-xl p-5 space-y-1">
              <span className="text-xs text-[#8FA3C8] font-medium uppercase tracking-wider block">Total Checked In</span>
              <span className="text-2xl sm:text-3xl font-extrabold text-[#14F195]">{totalCheckedInCount}</span>
            </div>
            <div className="bg-[#161F30] border border-[#1F2D44] rounded-xl p-5 space-y-1">
              <span className="text-xs text-[#8FA3C8] font-medium uppercase tracking-wider block">Badges Issued</span>
              <span className="text-2xl sm:text-3xl font-extrabold text-[#9945FF]">{badgesIssuedCount}</span>
            </div>
          </div>

          {/* Multi-Step Create Event Wizard */}
          <div className="bg-[#161F30] border border-[#1F2D44] rounded-2xl p-5 sm:p-8 space-y-8 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#1F2D44] pb-5 gap-4">
              <div>
                <h2 className="text-xl font-bold text-[#E8EDF6]">Create New Event</h2>
                <p className="text-xs text-[#8FA3C8]">Step {currentStep} of 4 — {
                  currentStep === 1 ? 'Event Details' :
                  currentStep === 2 ? 'Schedule & Capacity' :
                  currentStep === 3 ? 'Badge Artwork' : 'Review & Submit'
                }</p>
              </div>

              {/* Progress Indicator Steps */}
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4].map((stepNum) => (
                  <div
                    key={stepNum}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs transition ${
                      currentStep === stepNum
                        ? 'bg-[#9945FF] text-white ring-2 ring-[#9945FF]/40'
                        : currentStep > stepNum
                        ? 'bg-[#14F195]/20 text-[#14F195]'
                        : 'bg-[#0B1220] text-[#8FA3C8] border border-[#1F2D44]'
                    }`}
                  >
                    {currentStep > stepNum ? '✓' : stepNum}
                  </div>
                ))}
              </div>
            </div>

            {/* Step 1: Event Details */}
            {currentStep === 1 && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-semibold text-[#E8EDF6] flex justify-between">
                    <span>Event Name *</span>
                    <span className="text-xs text-[#8FA3C8]">{eventName.length}/50</span>
                  </label>
                  <input
                    type="text"
                    maxLength={50}
                    placeholder="e.g. Solana Hacker House 2026"
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    className="w-full bg-[#0B1220] border border-[#1F2D44] focus:border-[#9945FF] rounded-xl px-4 py-3 text-[#E8EDF6] placeholder-[#8FA3C8]/40 text-sm outline-none"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-semibold text-[#E8EDF6]">Description</label>
                  <textarea
                    rows={3}
                    placeholder="Provide event details, schedule, or attendee instructions..."
                    value={eventDescription}
                    onChange={(e) => setEventDescription(e.target.value)}
                    className="w-full bg-[#0B1220] border border-[#1F2D44] focus:border-[#9945FF] rounded-xl px-4 py-3 text-[#E8EDF6] placeholder-[#8FA3C8]/40 text-sm outline-none resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs sm:text-sm font-semibold text-[#E8EDF6]">Location</label>
                    <input
                      type="text"
                      placeholder="e.g. San Francisco, CA or Online"
                      value={eventLocation}
                      onChange={(e) => setEventLocation(e.target.value)}
                      className="w-full bg-[#0B1220] border border-[#1F2D44] focus:border-[#9945FF] rounded-xl px-4 py-3 text-[#E8EDF6] placeholder-[#8FA3C8]/40 text-sm outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs sm:text-sm font-semibold text-[#E8EDF6]">Event Type</label>
                    <select
                      value={eventType}
                      onChange={(e) => setEventType(e.target.value)}
                      className="w-full bg-[#0B1220] border border-[#1F2D44] focus:border-[#9945FF] rounded-xl px-4 py-3 text-[#E8EDF6] text-sm outline-none"
                    >
                      <option value="Conference">Conference</option>
                      <option value="Meetup">Meetup</option>
                      <option value="Workshop">Workshop</option>
                      <option value="Hackathon">Hackathon</option>
                      <option value="Networking">Networking</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-[#1F2D44]">
                  <button
                    type="button"
                    disabled={!eventName.trim()}
                    onClick={() => setCurrentStep(2)}
                    className="btn-solana-gradient py-3 px-6 rounded-xl font-bold text-sm inline-flex items-center gap-2 disabled:opacity-50"
                  >
                    <span>Next: Schedule & Capacity</span>
                    <ArrowRight className="w-4 h-4 shrink-0" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Schedule & Capacity */}
            {currentStep === 2 && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs sm:text-sm font-semibold text-[#E8EDF6]">Event Date</label>
                    <input
                      type="date"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="w-full bg-[#0B1220] border border-[#1F2D44] focus:border-[#9945FF] rounded-xl px-4 py-3 text-[#E8EDF6] text-sm outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs sm:text-sm font-semibold text-[#E8EDF6]">Start Time</label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full bg-[#0B1220] border border-[#1F2D44] focus:border-[#9945FF] rounded-xl px-4 py-3 text-[#E8EDF6] text-sm outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs sm:text-sm font-semibold text-[#E8EDF6]">End Time</label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full bg-[#0B1220] border border-[#1F2D44] focus:border-[#9945FF] rounded-xl px-4 py-3 text-[#E8EDF6] text-sm outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-semibold text-[#E8EDF6] flex justify-between">
                    <span>Attendee Capacity</span>
                    <span className="text-xs text-[#8FA3C8]">Optional maximum check-ins limit</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 100 (leave blank for unlimited)"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    className="w-full bg-[#0B1220] border border-[#1F2D44] focus:border-[#9945FF] rounded-xl px-4 py-3 text-[#E8EDF6] placeholder-[#8FA3C8]/40 text-sm outline-none"
                  />
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-[#1F2D44]">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="bg-[#1F2D44] hover:bg-[#283A58] text-[#E8EDF6] py-3 px-5 rounded-xl font-semibold text-sm inline-flex items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4 shrink-0" />
                    <span>Back</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    className="btn-solana-gradient py-3 px-6 rounded-xl font-bold text-sm inline-flex items-center gap-2"
                  >
                    <span>Next: Badge Artwork</span>
                    <ArrowRight className="w-4 h-4 shrink-0" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Badge Artwork */}
            {currentStep === 3 && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="space-y-3">
                  <label className="text-xs sm:text-sm font-semibold text-[#E8EDF6]">Select Soulbound Badge Artwork</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                        Violet Preset
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-[#E8EDF6] block">Classic Violet</span>
                        <span className="text-[10px] text-[#8FA3C8]">Preset IPFS Artwork</span>
                      </div>
                      {selectedBadgeOption === 'violet' && <CheckCircle2 className="w-4 h-4 text-[#9945FF] absolute top-2 right-2" />}
                    </button>

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
                        Teal Preset
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-[#E8EDF6] block">Classic Teal</span>
                        <span className="text-[10px] text-[#8FA3C8]">Preset IPFS Artwork</span>
                      </div>
                      {selectedBadgeOption === 'teal' && <CheckCircle2 className="w-4 h-4 text-[#14F195] absolute top-2 right-2" />}
                    </button>

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
                        <span className="text-xs font-semibold text-[#E8EDF6] block">Custom Image</span>
                        <span className="text-[10px] text-[#8FA3C8]">Upload to Pinata IPFS</span>
                      </div>
                      {selectedBadgeOption === 'custom' && <CheckCircle2 className="w-4 h-4 text-[#9945FF] absolute top-2 right-2" />}
                    </button>
                  </div>
                </div>

                {selectedBadgeOption === 'custom' && (
                  <div className="p-4 bg-[#0B1220] border border-[#1F2D44] rounded-xl space-y-3">
                    <label className="text-xs font-semibold text-[#8FA3C8] block">Custom Artwork File (PNG/JPG)</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCustomFileChange}
                      className="block w-full text-xs text-[#8FA3C8] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#9945FF]/20 file:text-[#9945FF] cursor-pointer"
                    />
                    {customPreviewUrl && (
                      <div className="flex items-center gap-3 pt-2">
                        <div className="w-12 h-12 rounded-lg overflow-hidden border border-[#9945FF]/40 relative bg-black/40 shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={customPreviewUrl} alt="Badge preview" className="w-full h-full object-cover" />
                        </div>
                        <span className="text-xs text-[#14F195] font-semibold">Image selected for IPFS metadata</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-[#1F2D44]">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="bg-[#1F2D44] hover:bg-[#283A58] text-[#E8EDF6] py-3 px-5 rounded-xl font-semibold text-sm inline-flex items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4 shrink-0" />
                    <span>Back</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(4)}
                    className="btn-solana-gradient py-3 px-6 rounded-xl font-bold text-sm inline-flex items-center gap-2"
                  >
                    <span>Next: Review & Confirm</span>
                    <ArrowRight className="w-4 h-4 shrink-0" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Review & Submit */}
            {currentStep === 4 && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="bg-[#0B1220] border border-[#1F2D44] rounded-xl p-5 space-y-4">
                  <h3 className="text-base font-bold text-[#E8EDF6] border-b border-[#1F2D44] pb-2">Event Summary</h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-[#8FA3C8] block">Event Name</span>
                      <span className="text-[#E8EDF6] font-semibold text-sm">{eventName}</span>
                    </div>
                    <div>
                      <span className="text-[#8FA3C8] block">Category / Type</span>
                      <span className="text-[#E8EDF6] font-semibold">{eventType}</span>
                    </div>
                    <div>
                      <span className="text-[#8FA3C8] block">Location</span>
                      <span className="text-[#E8EDF6]">{eventLocation || 'Not specified'}</span>
                    </div>
                    <div>
                      <span className="text-[#8FA3C8] block">Date & Time</span>
                      <span className="text-[#E8EDF6]">
                        {eventDate || 'No date set'} {startTime ? `@ ${startTime}` : ''}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#8FA3C8] block">Capacity Limit</span>
                      <span className="text-[#E8EDF6]">{capacity ? `${capacity} attendees` : 'Unlimited'}</span>
                    </div>
                    <div>
                      <span className="text-[#8FA3C8] block">Badge Design</span>
                      <span className="text-[#9945FF] font-semibold uppercase">{selectedBadgeOption}</span>
                    </div>
                  </div>

                  {eventDescription && (
                    <div className="pt-2 border-t border-[#1F2D44] text-xs">
                      <span className="text-[#8FA3C8] block mb-1">Description</span>
                      <p className="text-[#E8EDF6] leading-relaxed">{eventDescription}</p>
                    </div>
                  )}
                </div>

                {/* Explicit Transaction Progress States */}
                {txProgressState !== 'idle' && (
                  <div className="bg-[#0B1220] border border-[#1F2D44] rounded-xl p-5 space-y-3">
                    <div className="flex items-center gap-3">
                      {txProgressState === 'error' ? (
                        <div className="w-3 h-3 rounded-full bg-red-500 shrink-0" />
                      ) : txProgressState === 'success' ? (
                        <CheckCircle2 className="w-5 h-5 text-[#14F195] shrink-0" />
                      ) : (
                        <Loader2 className="w-5 h-5 animate-spin text-[#9945FF] shrink-0" />
                      )}

                      <span className="text-sm font-semibold text-[#E8EDF6]">
                        {txProgressState === 'preparing' && 'Preparing IPFS Event Metadata...'}
                        {txProgressState === 'approving' && 'Waiting for Phantom approval...'}
                        {txProgressState === 'submitting' && 'Transaction submitted...'}
                        {txProgressState === 'confirming' && 'Confirming on Solana Devnet...'}
                        {txProgressState === 'success' && 'Event created successfully!'}
                        {txProgressState === 'error' && 'Transaction failed'}
                      </span>
                    </div>

                    {/* Technical details toggle on error */}
                    {txProgressState === 'error' && rawTxError && (
                      <div className="space-y-2 pt-2 border-t border-[#1F2D44]">
                        <button
                          type="button"
                          onClick={() => setShowTechnicalError(!showTechnicalError)}
                          className="text-xs text-[#8FA3C8] hover:text-white inline-flex items-center gap-1 underline"
                        >
                          <span>{showTechnicalError ? 'Hide technical details' : 'Show technical details'}</span>
                          {showTechnicalError ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>

                        {showTechnicalError && (
                          <pre className="p-3 bg-red-950/40 border border-red-800/40 rounded-lg text-[11px] text-red-200 font-mono overflow-x-auto whitespace-pre-wrap break-all">
                            {rawTxError}
                          </pre>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-[#1F2D44]">
                  <button
                    type="button"
                    disabled={txProgressState !== 'idle' && txProgressState !== 'error'}
                    onClick={() => setCurrentStep(3)}
                    className="bg-[#1F2D44] hover:bg-[#283A58] text-[#E8EDF6] py-3 px-5 rounded-xl font-semibold text-sm inline-flex items-center gap-2 disabled:opacity-50"
                  >
                    <ArrowLeft className="w-4 h-4 shrink-0" />
                    <span>Back</span>
                  </button>

                  {txProgressState === 'error' ? (
                    <button
                      type="button"
                      onClick={handleCreateEventSubmit}
                      className="btn-solana-gradient py-3.5 px-6 rounded-xl font-bold text-sm inline-flex items-center gap-2"
                    >
                      <span>Try Again</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={txProgressState !== 'idle'}
                      onClick={handleCreateEventSubmit}
                      className="btn-solana-gradient py-3.5 px-6 rounded-xl font-extrabold text-base inline-flex items-center gap-2 disabled:opacity-50 shadow-lg"
                    >
                      {txProgressState !== 'idle' ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin shrink-0" />
                          <span>Creating Event...</span>
                        </>
                      ) : (
                        <span>Create Event & Submit</span>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Your Events Section */}
          <div className="bg-[#161F30] border border-[#1F2D44] rounded-2xl p-5 sm:p-8 space-y-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#1F2D44] pb-4">
              <div>
                <h2 className="text-xl font-bold text-[#E8EDF6]">Your Events</h2>
                <p className="text-xs text-[#8FA3C8]">Real-time list of events deployed by your wallet on Devnet</p>
              </div>
              <button
                onClick={fetchEvents}
                className="text-xs text-[#8FA3C8] hover:text-[#E8EDF6] underline"
              >
                Refresh
              </button>
            </div>

            {isLoadingEvents ? (
              <div className="py-12 text-center text-[#8FA3C8] flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-[#9945FF]" />
                <span className="text-xs">Fetching your on-chain events...</span>
              </div>
            ) : organizerEvents.length === 0 ? (
              <div className="py-12 text-center text-[#8FA3C8] space-y-3 border border-dashed border-[#1F2D44] rounded-xl p-6">
                <p className="text-base font-semibold text-[#E8EDF6]">No events created yet</p>
                <p className="text-xs max-w-sm mx-auto">Use the 4-step wizard above to schedule your first event and generate check-in credentials.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {organizerEvents.map((evt) => {
                  const status = getEventStatus(evt.metadata?.eventDate, evt.metadata?.startTime, evt.metadata?.endTime)

                  return (
                    <div
                      key={evt.publicKey}
                      className="bg-[#0B1220] border border-[#1F2D44] hover:border-[#9945FF]/40 rounded-xl p-5 flex flex-col justify-between space-y-4 transition"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="font-bold text-[#E8EDF6] text-lg break-words">{evt.name}</h3>
                          {status && (
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase shrink-0 ${
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

                        {evt.metadata?.location && (
                          <p className="text-xs text-[#8FA3C8]">📍 {evt.metadata.location}</p>
                        )}

                        <div className="flex items-center justify-between pt-1 text-xs text-[#8FA3C8]">
                          <span>Attendees: <strong className="text-[#14F195] font-extrabold text-sm">{evt.attendeeCount}</strong></span>
                          <span className="font-mono text-[10px]">PDA: {truncateWallet(evt.publicKey)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-3 border-t border-[#1F2D44]/60">
                        <Link
                          href={`/organizer/event/${evt.publicKey}`}
                          className="flex-1 bg-[#1F2D44] hover:bg-[#283A58] text-[#E8EDF6] py-2 px-3 rounded-lg text-xs font-semibold text-center transition border border-[#8FA3C8]/10"
                        >
                          View Details
                        </Link>

                        <button
                          onClick={() => setActiveQrEvent({ name: evt.name, pda: evt.publicKey })}
                          className="btn-solana-gradient px-3 py-2 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 shrink-0"
                        >
                          <QrCode className="w-3.5 h-3.5 shrink-0" />
                          <span>Quick QR</span>
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Analytics Section - Future enhancement note */}
            <div className="pt-4 border-t border-[#1F2D44]">
              <div className="p-4 bg-[#0B1220]/50 border border-dashed border-[#1F2D44] rounded-xl text-center space-y-1">
                <span className="text-xs font-semibold text-[#8FA3C8]">Analytics Charts (Future enhancement)</span>
                <p className="text-[11px] text-[#8FA3C8]/70">Detailed attendance trends will populate here as live check-ins grow across your events.</p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Quick QR Code Modal */}
      {activeQrEvent && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 min-h-screen overflow-y-auto">
          <div className="bg-[#161F30] border border-[#1F2D44] rounded-2xl p-6 sm:p-8 max-w-md w-full text-center space-y-6 relative shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto my-auto">
            <button
              onClick={() => setActiveQrEvent(null)}
              className="absolute top-4 right-4 text-[#8FA3C8] hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="space-y-1">
              <span className="text-xs uppercase text-[#14F195] font-semibold tracking-wider block">Attendee Check-In QR</span>
              <h3 className="text-xl sm:text-2xl font-bold text-[#E8EDF6] break-words">{activeQrEvent.name}</h3>
              <p className="text-xs text-[#8FA3C8] font-mono truncate">PDA: {activeQrEvent.pda}</p>
            </div>

            <div className="bg-white p-4 rounded-xl inline-flex items-center justify-center shadow-inner mx-auto">
              <QRCodeSVG
                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/check-in/${activeQrEvent.pda}`}
                size={200}
                level="H"
                includeMargin={true}
              />
            </div>

            <div className="flex items-center gap-2">
              <Link
                href={`/organizer/event/${activeQrEvent.pda}/live`}
                className="flex-1 btn-solana-gradient py-2.5 rounded-xl text-xs font-bold text-center"
              >
                Open Full-Screen Live Desk
              </Link>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/check-in/${activeQrEvent.pda}`)
                  toast.success('Check-In link copied!')
                }}
                className="p-2.5 bg-[#1F2D44] hover:bg-[#283A58] text-[#E8EDF6] rounded-xl text-xs font-semibold border border-[#8FA3C8]/20"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
