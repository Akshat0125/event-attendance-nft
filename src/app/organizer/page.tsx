'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { useEventAttendanceNftProgram } from '@/components/event-attendance-nft/event-attendance-nft-data-access'
import { WalletButton } from '@/components/solana/solana-provider'
import { QRCodeSVG } from 'qrcode.react'
import { toast } from 'sonner'
import Link from 'next/link'
import { fetchEventMetadata, getEventStatus, truncateWallet, EventMetadata } from '@/lib/event-metadata'
import { Upload, QrCode, CheckCircle2, Copy, Loader2, X, ChevronDown, ChevronUp, ArrowRight, ArrowLeft, Plus } from 'lucide-react'

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

function OrganizerContent() {
  const searchParams = useSearchParams()
  const activeTab = searchParams.get('tab') || 'dashboard'

  const wallet = useWallet()
  const { connection } = useConnection()
  const { program, programId } = useEventAttendanceNftProgram()

  // Time-of-day Greeting Helper
  const [greeting, setGreeting] = useState('Good afternoon')
  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) setGreeting('Good morning')
    else if (hour < 18) setGreeting('Good afternoon')
    else setGreeting('Good evening')
  }, [])

  // Create Event Form Wizard State (1: Details, 2: Schedule, 3: Badge, 4: Review)
  const [showWizard, setShowWizard] = useState(false)
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
  const totalRegisteredCount = organizerEvents.reduce((sum, e) => {
    return sum + (e.metadata?.capacity ? Math.max(e.attendeeCount, e.metadata.capacity) : e.attendeeCount)
  }, 0)
  const badgesIssuedCount = totalCheckedInCount

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
      toast.error('Please connect your wallet first!')
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
        throw new Error(uploadData.error || "Badge/event storage isn't configured — contact the site admin")
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
        setShowWizard(false)
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
    <div className="py-6 sm:py-8 max-w-6xl mx-auto px-4 space-y-8">
      {/* Dashboard Greeting Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E3DF] pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111827]">{greeting}</h1>
          <p className="text-xs sm:text-sm text-[#6B7280] mt-1">
            Create and manage your events with verifiable attendance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {wallet.publicKey && (
            <button
              onClick={() => setShowWizard(!showWizard)}
              className="bg-[#111827] hover:bg-[#1F2937] text-white px-5 py-2.5 rounded-lg text-sm font-semibold inline-flex items-center gap-2 shadow-sm transition"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>{showWizard ? 'Close Form' : 'Create Event'}</span>
            </button>
          )}
          {!wallet.publicKey && <WalletButton />}
        </div>
      </div>

      {!wallet.publicKey ? (
        <div className="card-saas p-8 sm:p-12 text-center space-y-4">
          <h2 className="text-xl font-bold text-[#111827]">Connect Organizer Wallet</h2>
          <p className="text-[#6B7280] max-w-md mx-auto text-xs sm:text-sm leading-relaxed">
            Please connect your wallet to view your event dashboard and issue credentials on Solana Devnet.
          </p>
          <div className="pt-2 flex items-center justify-center">
            <WalletButton />
          </div>
        </div>
      ) : (
        <>
          {/* Stat Cards (Real On-Chain Data Only) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="card-saas p-5 space-y-1">
              <span className="text-3xl font-extrabold text-[#111827]">{totalEventsCount}</span>
              <span className="text-xs text-[#6B7280] font-medium block">Events</span>
            </div>
            <div className="card-saas p-5 space-y-1">
              <span className="text-3xl font-extrabold text-[#111827]">{totalRegisteredCount}</span>
              <span className="text-xs text-[#6B7280] font-medium block">Registered</span>
            </div>
            <div className="card-saas p-5 space-y-1">
              <span className="text-3xl font-extrabold text-emerald-600">{totalCheckedInCount}</span>
              <span className="text-xs text-[#6B7280] font-medium block">Checked In</span>
            </div>
            <div className="card-saas p-5 space-y-1">
              <span className="text-3xl font-extrabold text-[#9945FF]">{badgesIssuedCount}</span>
              <span className="text-xs text-[#6B7280] font-medium block">Badges Issued</span>
            </div>
          </div>

          {/* Multi-Step Create Event Flow */}
          {showWizard && (
            <div className="card-saas p-6 sm:p-8 space-y-6 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#E5E3DF] pb-4 gap-3">
                <div>
                  <h2 className="text-lg font-bold text-[#111827]">Create New Event</h2>
                  <p className="text-xs text-[#6B7280]">
                    Step {currentStep} of 4 — {
                      currentStep === 1 ? 'Event Details' :
                      currentStep === 2 ? 'Schedule & Capacity' :
                      currentStep === 3 ? 'Badge Artwork' : 'Review & Submit'
                    }
                  </p>
                </div>

                {/* Numbered Dots Step Indicator */}
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4].map((stepNum) => (
                    <div
                      key={stepNum}
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition ${
                        currentStep === stepNum
                          ? 'bg-[#111827] text-white'
                          : currentStep > stepNum
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-[#F6F5F3] text-slate-400 border border-[#E5E3DF]'
                      }`}
                    >
                      {currentStep > stepNum ? '✓' : stepNum}
                    </div>
                  ))}
                </div>
              </div>

              {/* Step 1: Details */}
              {currentStep === 1 && (
                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#111827] flex justify-between">
                      <span>Event Name *</span>
                      <span className="text-xs text-[#6B7280]">{eventName.length}/50</span>
                    </label>
                    <input
                      type="text"
                      maxLength={50}
                      placeholder="e.g. Solana Builder Summit 2026"
                      value={eventName}
                      onChange={(e) => setEventName(e.target.value)}
                      className="w-full bg-[#FFFFFF] border border-[#E5E3DF] focus:border-[#111827] rounded-lg px-3.5 py-2 text-[#111827] text-sm outline-none transition"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#111827]">Description</label>
                    <textarea
                      rows={3}
                      placeholder="Provide event details or instructions..."
                      value={eventDescription}
                      onChange={(e) => setEventDescription(e.target.value)}
                      className="w-full bg-[#FFFFFF] border border-[#E5E3DF] focus:border-[#111827] rounded-lg px-3.5 py-2 text-[#111827] text-sm outline-none resize-none transition"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#111827]">Location</label>
                      <input
                        type="text"
                        placeholder="e.g. San Francisco, CA or Online"
                        value={eventLocation}
                        onChange={(e) => setEventLocation(e.target.value)}
                        className="w-full bg-[#FFFFFF] border border-[#E5E3DF] focus:border-[#111827] rounded-lg px-3.5 py-2 text-[#111827] text-sm outline-none transition"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#111827]">Category</label>
                      <select
                        value={eventType}
                        onChange={(e) => setEventType(e.target.value)}
                        className="w-full bg-[#FFFFFF] border border-[#E5E3DF] focus:border-[#111827] rounded-lg px-3.5 py-2 text-[#111827] text-sm outline-none transition"
                      >
                        <option value="Conference">Conference</option>
                        <option value="Meetup">Meetup</option>
                        <option value="Workshop">Workshop</option>
                        <option value="Hackathon">Hackathon</option>
                        <option value="Networking">Networking</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-[#E5E3DF]">
                    <button
                      type="button"
                      disabled={!eventName.trim()}
                      onClick={() => setCurrentStep(2)}
                      className="bg-[#111827] hover:bg-[#1F2937] text-white py-2.5 px-5 rounded-lg font-semibold text-xs inline-flex items-center gap-2 disabled:opacity-50 transition"
                    >
                      <span>Next: Schedule & Capacity</span>
                      <ArrowRight className="w-4 h-4 shrink-0" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Schedule */}
              {currentStep === 2 && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#111827]">Event Date</label>
                      <input
                        type="date"
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                        className="w-full bg-[#FFFFFF] border border-[#E5E3DF] focus:border-[#111827] rounded-lg px-3.5 py-2 text-[#111827] text-sm outline-none transition"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#111827]">Start Time</label>
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full bg-[#FFFFFF] border border-[#E5E3DF] focus:border-[#111827] rounded-lg px-3.5 py-2 text-[#111827] text-sm outline-none transition"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#111827]">End Time</label>
                      <input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="w-full bg-[#FFFFFF] border border-[#E5E3DF] focus:border-[#111827] rounded-lg px-3.5 py-2 text-[#111827] text-sm outline-none transition"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#111827] flex justify-between">
                      <span>Attendee Capacity</span>
                      <span className="text-xs text-[#6B7280]">Optional limit</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      placeholder="e.g. 100 (leave empty for unlimited)"
                      value={capacity}
                      onChange={(e) => setCapacity(e.target.value)}
                      className="w-full bg-[#FFFFFF] border border-[#E5E3DF] focus:border-[#111827] rounded-lg px-3.5 py-2 text-[#111827] text-sm outline-none transition"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-[#E5E3DF]">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="bg-[#EFECE6] hover:bg-[#E5E3DF] text-[#111827] py-2.5 px-4 rounded-lg font-semibold text-xs inline-flex items-center gap-1.5 border border-[#E5E3DF]"
                    >
                      <ArrowLeft className="w-4 h-4 shrink-0" />
                      <span>Back</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(3)}
                      className="bg-[#111827] hover:bg-[#1F2937] text-white py-2.5 px-5 rounded-lg font-semibold text-xs inline-flex items-center gap-2 transition"
                    >
                      <span>Next: Badge Artwork</span>
                      <ArrowRight className="w-4 h-4 shrink-0" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Badge Artwork */}
              {currentStep === 3 && (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-[#111827]">Badge Credential Design</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedBadgeOption('violet')}
                        className={`p-3 rounded-xl border text-left transition relative flex flex-col justify-between h-24 ${
                          selectedBadgeOption === 'violet'
                            ? 'border-[#9945FF] bg-purple-50/50 ring-1 ring-[#9945FF]'
                            : 'border-[#E5E3DF] bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="w-full h-8 rounded bg-gradient-to-r from-purple-600 to-indigo-600 flex items-center justify-center text-white font-bold text-[10px]">
                          Violet Preset
                        </div>
                        <span className="text-xs font-semibold text-[#111827] block">Classic Violet</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedBadgeOption('teal')}
                        className={`p-3 rounded-xl border text-left transition relative flex flex-col justify-between h-24 ${
                          selectedBadgeOption === 'teal'
                            ? 'border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500'
                            : 'border-[#E5E3DF] bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="w-full h-8 rounded bg-gradient-to-r from-teal-500 to-emerald-600 flex items-center justify-center text-white font-bold text-[10px]">
                          Teal Preset
                        </div>
                        <span className="text-xs font-semibold text-[#111827] block">Classic Teal</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedBadgeOption('custom')}
                        className={`p-3 rounded-xl border text-left transition relative flex flex-col justify-between h-24 ${
                          selectedBadgeOption === 'custom'
                            ? 'border-[#111827] bg-[#F6F5F3] ring-1 ring-[#111827]'
                            : 'border-[#E5E3DF] bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="w-full h-8 rounded border border-dashed border-slate-300 flex items-center justify-center text-slate-500">
                          <Upload className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-semibold text-[#111827] block">Custom IPFS Image</span>
                      </button>
                    </div>
                  </div>

                  {selectedBadgeOption === 'custom' && (
                    <div className="p-4 bg-[#F6F5F3] border border-[#E5E3DF] rounded-lg space-y-2">
                      <label className="text-xs font-semibold text-[#6B7280] block">Upload Custom Badge File</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCustomFileChange}
                        className="block w-full text-xs text-[#6B7280] file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#111827] file:text-white cursor-pointer"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-[#E5E3DF]">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="bg-[#EFECE6] hover:bg-[#E5E3DF] text-[#111827] py-2.5 px-4 rounded-lg font-semibold text-xs inline-flex items-center gap-1.5 border border-[#E5E3DF]"
                    >
                      <ArrowLeft className="w-4 h-4 shrink-0" />
                      <span>Back</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(4)}
                      className="bg-[#111827] hover:bg-[#1F2937] text-white py-2.5 px-5 rounded-lg font-semibold text-xs inline-flex items-center gap-2 transition"
                    >
                      <span>Next: Review & Confirm</span>
                      <ArrowRight className="w-4 h-4 shrink-0" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4: Review */}
              {currentStep === 4 && (
                <div className="space-y-5">
                  <div className="bg-[#F6F5F3] border border-[#E5E3DF] rounded-lg p-4 space-y-3 text-xs">
                    <h3 className="font-bold text-[#111827] border-b border-[#E5E3DF] pb-2 text-sm">Event Summary</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-[#6B7280] block">Event Name</span>
                        <span className="text-[#111827] font-semibold">{eventName}</span>
                      </div>
                      <div>
                        <span className="text-[#6B7280] block">Category</span>
                        <span className="text-[#111827] font-semibold">{eventType}</span>
                      </div>
                      <div>
                        <span className="text-[#6B7280] block">Location</span>
                        <span className="text-[#111827]">{eventLocation || 'Not specified'}</span>
                      </div>
                      <div>
                        <span className="text-[#6B7280] block">Date</span>
                        <span className="text-[#111827]">{eventDate || 'No date set'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Inline Transaction Progress Alerts */}
                  {txProgressState !== 'idle' && (
                    <div className="bg-[#F6F5F3] border border-[#E5E3DF] rounded-lg p-4 space-y-2">
                      <div className="flex items-center gap-2.5">
                        {txProgressState === 'error' ? (
                          <div className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
                        ) : txProgressState === 'success' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <Loader2 className="w-4 h-4 animate-spin text-[#111827] shrink-0" />
                        )}

                        <span className="text-xs font-semibold text-[#111827]">
                          {txProgressState === 'preparing' && 'Preparing IPFS Event Metadata...'}
                          {txProgressState === 'approving' && 'Waiting for Phantom approval...'}
                          {txProgressState === 'submitting' && 'Transaction submitted...'}
                          {txProgressState === 'confirming' && 'Confirming on Solana Devnet...'}
                          {txProgressState === 'success' && 'Event created successfully!'}
                          {txProgressState === 'error' && 'Transaction failed'}
                        </span>
                      </div>

                      {txProgressState === 'error' && rawTxError && (
                        <div className="pt-2 border-t border-[#E5E3DF] space-y-1">
                          <button
                            type="button"
                            onClick={() => setShowTechnicalError(!showTechnicalError)}
                            className="text-[11px] text-slate-500 hover:text-slate-900 inline-flex items-center gap-1 underline"
                          >
                            <span>{showTechnicalError ? 'Hide details' : 'Show technical details'}</span>
                            {showTechnicalError ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                          {showTechnicalError && (
                            <pre className="p-2.5 bg-red-50 border border-red-200 rounded text-[11px] text-red-800 font-mono overflow-x-auto whitespace-pre-wrap break-all">
                              {rawTxError}
                            </pre>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-[#E5E3DF]">
                    <button
                      type="button"
                      disabled={txProgressState !== 'idle' && txProgressState !== 'error'}
                      onClick={() => setCurrentStep(3)}
                      className="bg-[#EFECE6] hover:bg-[#E5E3DF] text-[#111827] py-2.5 px-4 rounded-lg font-semibold text-xs inline-flex items-center gap-1.5 border border-[#E5E3DF] disabled:opacity-50"
                    >
                      <ArrowLeft className="w-4 h-4 shrink-0" />
                      <span>Back</span>
                    </button>

                    {txProgressState === 'error' ? (
                      <button
                        type="button"
                        onClick={handleCreateEventSubmit}
                        className="bg-[#111827] hover:bg-[#1F2937] text-white py-2.5 px-5 rounded-lg font-semibold text-xs inline-flex items-center gap-2"
                      >
                        <span>Try Again</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={txProgressState !== 'idle'}
                        onClick={handleCreateEventSubmit}
                        className="bg-[#111827] hover:bg-[#1F2937] text-white py-2.5 px-6 rounded-lg font-bold text-sm inline-flex items-center gap-2 shadow-sm disabled:opacity-50"
                      >
                        {txProgressState !== 'idle' ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                            <span>Creating Event...</span>
                          </>
                        ) : (
                          <span>Create Event</span>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Product View Tabs (Dashboard, Events, Attendees, Badges, Analytics, Settings) */}
          {(activeTab === 'dashboard' || activeTab === 'events') && (
            <div className="card-saas p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-[#E5E3DF] pb-4">
                <div>
                  <h2 className="text-lg font-bold text-[#111827]">Your Events</h2>
                  <p className="text-xs text-[#6B7280]">On-chain event records associated with your connected wallet</p>
                </div>
                <button onClick={fetchEvents} className="text-xs text-[#6B7280] hover:text-[#111827] underline">
                  Refresh
                </button>
              </div>

              {isLoadingEvents ? (
                <div className="py-12 text-center text-[#6B7280] flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-[#111827]" />
                  <span className="text-xs">Loading on-chain events...</span>
                </div>
              ) : organizerEvents.length === 0 ? (
                /* Simple Empty State: Text + 1 CTA */
                <div className="py-12 text-center text-[#6B7280] space-y-3 border border-dashed border-[#E5E3DF] rounded-xl p-6">
                  <p className="text-sm font-semibold text-[#111827]">No events created yet</p>
                  <p className="text-xs max-w-sm mx-auto">Create your first event to issue verifiable attendance credentials.</p>
                  <button
                    onClick={() => setShowWizard(true)}
                    className="bg-[#111827] text-white px-4 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Event</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {organizerEvents.map((evt) => {
                    const status = getEventStatus(evt.metadata?.eventDate, evt.metadata?.startTime, evt.metadata?.endTime)

                    return (
                      <div
                        key={evt.publicKey}
                        className="card-saas p-5 flex flex-col justify-between space-y-4 hover:border-slate-400 transition-all"
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="font-bold text-[#111827] text-base break-words">{evt.name}</h3>
                            {status && (
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${
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

                          {evt.metadata?.location && (
                            <p className="text-xs text-[#6B7280]">📍 {evt.metadata.location}</p>
                          )}

                          <div className="flex items-center justify-between pt-1 text-xs text-[#6B7280]">
                            <span>Attendees: <strong className="text-[#111827] font-bold">{evt.attendeeCount}</strong></span>
                            <span className="font-mono text-[11px]">{truncateWallet(evt.publicKey)}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-3 border-t border-[#E5E3DF]">
                          <Link
                            href={`/organizer/event/${evt.publicKey}`}
                            className="flex-1 bg-[#EFECE6] hover:bg-[#E5E3DF] text-[#111827] py-2 px-3 rounded-lg text-xs font-semibold text-center transition border border-[#E5E3DF]"
                          >
                            View Details
                          </Link>

                          <button
                            onClick={() => setActiveQrEvent({ name: evt.name, pda: evt.publicKey })}
                            className="bg-[#111827] hover:bg-[#1F2937] text-white px-3 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 shrink-0 transition shadow-sm"
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
            </div>
          )}

          {/* Attendees Tab View */}
          {activeTab === 'attendees' && (
            <div className="card-saas p-6 space-y-4">
              <h2 className="text-lg font-bold text-[#111827]">Attendees Overview</h2>
              <p className="text-xs text-[#6B7280]">
                A total of <strong className="text-[#111827]">{totalCheckedInCount}</strong> attendees have checked in across your {totalEventsCount} on-chain events.
              </p>
            </div>
          )}

          {/* Badges Tab View */}
          {activeTab === 'badges' && (
            <div className="card-saas p-6 space-y-4">
              <h2 className="text-lg font-bold text-[#111827]">Issued Soulbound Badges</h2>
              <p className="text-xs text-[#6B7280]">
                A total of <strong className="text-[#9945FF] font-bold">{badgesIssuedCount}</strong> Soulbound NFT badges have been minted on Solana Devnet.
              </p>
            </div>
          )}

          {/* Analytics Tab View */}
          {activeTab === 'analytics' && (
            <div className="card-saas p-6 space-y-4 text-center">
              <h2 className="text-lg font-bold text-[#111827]">Attendance Analytics</h2>
              <p className="text-xs text-[#6B7280]">
                Analytics metrics are calculated live from Solana Devnet on-chain event accounts.
              </p>
            </div>
          )}

          {/* Settings Tab View */}
          {activeTab === 'settings' && (
            <div className="card-saas p-6 space-y-4 max-w-md">
              <h2 className="text-lg font-bold text-[#111827]">Organizer Settings</h2>
              <div className="space-y-2 text-xs text-[#6B7280]">
                <div>Connected Organizer Wallet: <span className="font-mono text-[#111827] font-semibold">{truncateWallet(wallet.publicKey?.toBase58())}</span></div>
                <div>Network Cluster: <span className="text-[#111827] font-semibold">Solana Devnet</span></div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Quick QR Modal */}
      {activeQrEvent && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 min-h-screen overflow-y-auto">
          <div className="card-saas p-6 max-w-sm w-full text-center space-y-5 relative shadow-xl animate-in fade-in zoom-in duration-150 my-auto">
            <button
              onClick={() => setActiveQrEvent(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <span className="text-[10px] uppercase text-emerald-600 font-bold tracking-wider block">Attendee Check-In QR</span>
              <h3 className="text-lg font-bold text-[#111827] break-words">{activeQrEvent.name}</h3>
            </div>

            <div className="bg-white p-3 border border-[#E5E3DF] rounded-xl inline-flex items-center justify-center mx-auto shadow-xs">
              <QRCodeSVG
                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/check-in/${activeQrEvent.pda}`}
                size={180}
                level="H"
                includeMargin={true}
              />
            </div>

            <div className="flex items-center gap-2">
              <Link
                href={`/organizer/event/${activeQrEvent.pda}/live`}
                className="flex-1 bg-[#111827] hover:bg-[#1F2937] text-white py-2.5 rounded-lg text-xs font-semibold text-center transition shadow-sm"
              >
                Open Live Desk
              </Link>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/check-in/${activeQrEvent.pda}`)
                  toast.success('Check-In link copied!')
                }}
                className="p-2.5 bg-[#EFECE6] hover:bg-[#E5E3DF] text-[#111827] rounded-lg text-xs font-semibold border border-[#E5E3DF]"
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

export default function OrganizerDashboardPage() {
  return (
    <Suspense fallback={
      <div className="py-12 text-center text-[#6B7280]">Loading organizer dashboard...</div>
    }>
      <OrganizerContent />
    </Suspense>
  )
}
