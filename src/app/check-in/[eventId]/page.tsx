'use client'

import { useState, useEffect, use } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { useEventAttendanceNftProgram } from '@/components/event-attendance-nft/event-attendance-nft-data-access'
import { WalletButton } from '@/components/solana/solana-provider'
import { ExplorerLink } from '@/components/cluster/cluster-ui'
import { toast } from 'sonner'
import Link from 'next/link'
import { fetchEventMetadata, truncateWallet, EventMetadata } from '@/lib/event-metadata'
import { Lock, Loader2, CheckCircle2, UserCheck, ArrowLeft } from 'lucide-react'

export default function PublicCheckInPage({ params }: { params: Promise<{ eventId: string }> }) {
  const resolvedParams = use(params)
  const eventPdaStr = resolvedParams.eventId

  const wallet = useWallet()
  const { connection } = useConnection()
  const { program, programId, checkIn } = useEventAttendanceNftProgram()

  const [eventAccount, setEventAccount] = useState<{
    name: string
    organizer: string
    attendeeCount: number
    badgeUri: string
  } | null>(null)

  const [metadata, setMetadata] = useState<EventMetadata | null>(null)
  const [isLoadingEvent, setIsLoadingEvent] = useState(true)
  const [alreadyCheckedIn, setAlreadyCheckedIn] = useState(false)
  const [mintedResult, setMintedResult] = useState<{ signature: string; mint: string } | null>(null)

  let eventPda: PublicKey | null = null
  try {
    eventPda = new PublicKey(eventPdaStr)
  } catch (err) {
    eventPda = null
  }

  // Fetch Event Data & Check-In Status
  const loadEventInfo = async () => {
    if (!program || !eventPda) {
      setIsLoadingEvent(false)
      return
    }
    try {
      const account = await program.account.event.fetch(eventPda)
      setEventAccount({
        name: account.name,
        organizer: account.organizer.toBase58(),
        attendeeCount: account.attendeeCount,
        badgeUri: account.badgeUri,
      })

      const meta = await fetchEventMetadata(account.badgeUri)
      setMetadata(meta)

      // Check if current connected wallet already has an AttendanceRecord PDA
      if (wallet.publicKey) {
        const [attendancePda] = PublicKey.findProgramAddressSync(
          [Buffer.from('attendance'), eventPda.toBuffer(), wallet.publicKey.toBuffer()],
          programId
        )
        const attAccount = await connection.getAccountInfo(attendancePda)
        if (attAccount !== null) {
          setAlreadyCheckedIn(true)
        }
      }
    } catch (err) {
      console.error('Error fetching public event info:', err)
      toast.error('Event account not found on-chain!')
    } finally {
      setIsLoadingEvent(false)
    }
  }

  useEffect(() => {
    loadEventInfo()
  }, [program, eventPdaStr, wallet.publicKey])

  // Handle Check-In
  const handleCheckIn = async () => {
    if (!wallet.publicKey) {
      toast.error('Please connect your Phantom wallet first!')
      return
    }
    if (!eventPda) {
      toast.error('Invalid Event address!')
      return
    }

    try {
      const res = await checkIn.mutateAsync({ eventPda })
      setMintedResult({
        signature: res.signature,
        mint: res.mint.toBase58(),
      })
      setAlreadyCheckedIn(true)
      loadEventInfo()
    } catch (err) {
      console.error(err)
    }
  }

  if (!eventPda) {
    return (
      <div className="py-16 text-center space-y-4 max-w-md mx-auto px-4">
        <div className="text-red-400 font-bold text-lg">Invalid Event Address</div>
        <p className="text-sm text-[#8FA3C8]">The provided Event address is not a valid Solana public key.</p>
        <Link href="/check-in" className="inline-flex items-center gap-2 text-xs text-[#9945FF] underline">
          <ArrowLeft className="w-4 h-4" /> Go to Check-In Lookup
        </Link>
      </div>
    )
  }

  const attendeeCount = eventAccount?.attendeeCount || 0
  const capacity = metadata?.capacity
  const spotsRemaining = typeof capacity === 'number' && capacity > 0 ? Math.max(0, capacity - attendeeCount) : null

  return (
    <div className="py-8 sm:py-12 max-w-2xl mx-auto px-4 space-y-8">
      {isLoadingEvent ? (
        <div className="bg-[#161F30] border border-[#1F2D44] rounded-2xl p-12 text-center text-[#8FA3C8] flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#9945FF]" />
          <p className="text-sm">Fetching event details...</p>
        </div>
      ) : !eventAccount ? (
        <div className="bg-[#161F30] border border-[#1F2D44] rounded-2xl p-10 text-center space-y-3">
          <p className="text-lg font-bold text-[#E8EDF6]">Event Not Found</p>
          <p className="text-sm text-[#8FA3C8]">No event exists at this address on Devnet.</p>
        </div>
      ) : (
        <div className="bg-[#161F30] border border-[#1F2D44] rounded-3xl p-6 sm:p-10 space-y-8 shadow-2xl">
          {/* Top Badge Image & Event Hero Header */}
          <div className="text-center space-y-4 border-b border-[#1F2D44] pb-6">
            <div className="w-36 h-36 mx-auto rounded-3xl bg-gradient-to-br from-purple-600 to-teal-400 p-1 shadow-xl">
              <div className="w-full h-full rounded-[22px] bg-[#0B1220] overflow-hidden flex items-center justify-center p-2">
                {metadata?.badgeImage ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={metadata.badgeImage} alt="Event Badge" className="w-full h-full object-cover rounded-xl" />
                ) : (
                  <span className="text-xs font-bold text-[#9945FF] uppercase tracking-wider">Soulbound Badge</span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full bg-[#14F195]/15 border border-[#14F195]/30 text-[#14F195] text-[11px] font-extrabold uppercase tracking-wider inline-block">
                Verifiable Event Credentials
              </span>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-[#E8EDF6] tracking-tight break-words">
                {metadata?.name || eventAccount.name}
              </h1>
            </div>

            {/* Quick Metadata Details */}
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-[#8FA3C8] pt-1">
              {metadata?.location && (
                <span>📍 {metadata.location}</span>
              )}
              {metadata?.eventDate && (
                <span>📅 {metadata.eventDate} {metadata.startTime ? `@ ${metadata.startTime}` : ''}</span>
              )}
              {spotsRemaining !== null && (
                <span className="text-[#14F195] font-semibold">🎟️ {spotsRemaining} spots remaining</span>
              )}
            </div>

            {metadata?.description && (
              <p className="text-xs sm:text-sm text-[#8FA3C8] max-w-lg mx-auto leading-relaxed pt-2">
                {metadata.description}
              </p>
            )}
          </div>

          {/* Wallet State & Check-In Action */}
          {!wallet.publicKey ? (
            <div className="text-center space-y-4 pt-2">
              <p className="text-sm text-[#8FA3C8]">Connect your wallet to claim your digital proof of attendance.</p>
              <div className="flex items-center justify-center">
                <WalletButton />
              </div>
            </div>
          ) : alreadyCheckedIn ? (
            /* Post Check-In Confirmation View */
            <div className="bg-[#14F195]/10 border border-[#14F195]/30 rounded-2xl p-6 text-center space-y-6 animate-in fade-in zoom-in duration-300">
              <div className="w-14 h-14 rounded-full bg-[#14F195]/20 text-[#14F195] flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <span className="text-xs uppercase text-[#14F195] font-extrabold tracking-widest block">
                  Attendance Verified
                </span>
                <h3 className="text-2xl font-bold text-[#E8EDF6]">{metadata?.name || eventAccount.name}</h3>
                <p className="text-xs text-[#8FA3C8] font-mono pt-1">
                  Recipient Wallet: <strong className="text-white">{truncateWallet(wallet.publicKey.toBase58())}</strong>
                </p>
              </div>

              {mintedResult && (
                <div className="pt-2 text-xs text-[#8FA3C8] space-y-1 font-mono bg-[#0B1220]/60 p-3 rounded-xl border border-[#14F195]/20 max-w-md mx-auto">
                  <div>
                    Mint Address:{' '}
                    <ExplorerLink path={`account/${mintedResult.mint}`} label={truncateWallet(mintedResult.mint)} className="text-[#14F195] underline font-bold" />
                  </div>
                  <div>
                    Tx Signature:{' '}
                    <ExplorerLink path={`tx/${mintedResult.signature}`} label={truncateWallet(mintedResult.signature)} className="text-[#9945FF] underline font-bold" />
                  </div>
                </div>
              )}

              {/* Plain Language Explanation */}
              <div className="bg-[#0B1220] border border-[#1F2D44] rounded-xl p-4 text-left space-y-3 text-xs">
                <p className="text-[#E8EDF6] leading-relaxed">
                  A <strong>Soulbound Attendance Badge</strong> is a non-transferable digital credential that proves you attended this event.
                </p>

                <ul className="space-y-2 text-[#8FA3C8] border-t border-[#1F2D44] pt-3">
                  <li className="flex items-center gap-2">
                    <span className="text-[#14F195] font-bold">✓</span>
                    <span><strong>Verifiable:</strong> Authenticated directly on Solana Devnet</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#14F195] font-bold">✓</span>
                    <span><strong>On-chain:</strong> Recorded permanently to your wallet public key</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#14F195] font-bold">✓</span>
                    <span><strong>Non-transferable:</strong> Account is frozen to prevent resale or spoofing</span>
                  </li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <button
                onClick={handleCheckIn}
                disabled={checkIn.isPending}
                className="w-full btn-solana-gradient py-4 px-6 rounded-xl font-extrabold text-base inline-flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
              >
                {checkIn.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin shrink-0" />
                    <span>Checking in & Minting Badge...</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="w-5 h-5 shrink-0" />
                    <span>Check In & Claim Attendance Badge</span>
                  </>
                )}
              </button>
              <p className="text-[11px] text-[#8FA3C8] text-center leading-relaxed">
                Checking in verifies your attendance, mints 1 Soulbound Badge, and freezes the credential in your wallet.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
