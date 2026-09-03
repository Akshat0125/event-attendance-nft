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
import { Loader2, CheckCircle2, UserCheck, ArrowLeft } from 'lucide-react'

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
      toast.error('Please connect your wallet first!')
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
        <div className="text-red-600 font-bold text-base">Invalid Event Address</div>
        <p className="text-xs text-[#6B7280]">The provided Event address is not a valid Solana public key.</p>
        <Link href="/check-in" className="inline-flex items-center gap-1.5 text-xs text-[#111827] font-semibold underline">
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
        <div className="card-saas p-12 text-center text-[#6B7280] flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-6 h-6 animate-spin text-[#111827]" />
          <p className="text-xs">Loading event credentials...</p>
        </div>
      ) : !eventAccount ? (
        <div className="card-saas p-10 text-center space-y-2">
          <p className="text-lg font-bold text-[#111827]">Event Not Found</p>
          <p className="text-xs text-[#6B7280]">No event exists at this address on Solana Devnet.</p>
        </div>
      ) : (
        <div className="card-saas p-6 sm:p-10 space-y-8">
          {/* Badge Visual & Hero Header */}
          <div className="text-center space-y-4 border-b border-[#E5E3DF] pb-6">
            <div className="w-32 h-32 mx-auto rounded-2xl bg-gradient-to-br from-[#9945FF] to-[#14F195] p-1 shadow-md">
              <div className="w-full h-full rounded-[14px] bg-white overflow-hidden flex items-center justify-center p-1.5">
                {metadata?.badgeImage ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={metadata.badgeImage} alt="Event Badge" className="w-full h-full object-cover rounded-lg" />
                ) : (
                  <span className="text-xs font-bold text-[#9945FF]">Soulbound Badge</span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold uppercase inline-block">
                Verifiable Event Credentials
              </span>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-[#111827] tracking-tight break-words">
                {metadata?.name || eventAccount.name}
              </h1>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-[#6B7280]">
              {metadata?.location && <span>📍 {metadata.location}</span>}
              {metadata?.eventDate && <span>📅 {metadata.eventDate} {metadata.startTime ? `@ ${metadata.startTime}` : ''}</span>}
              {spotsRemaining !== null && (
                <span className="text-emerald-700 font-bold">🎟️ {spotsRemaining} spots left</span>
              )}
            </div>

            {metadata?.description && (
              <p className="text-xs sm:text-sm text-[#6B7280] max-w-lg mx-auto leading-relaxed pt-1">
                {metadata.description}
              </p>
            )}
          </div>

          {/* Wallet State & Check-In Action */}
          {!wallet.publicKey ? (
            <div className="text-center space-y-4 pt-2">
              <p className="text-xs text-[#6B7280]">Connect your wallet to claim your proof of attendance badge.</p>
              <div className="flex items-center justify-center">
                <WalletButton />
              </div>
            </div>
          ) : alreadyCheckedIn ? (
            /* Subtle Green Post Check-In Confirmation View */
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center space-y-6 animate-in fade-in duration-200">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <span className="text-xs uppercase text-emerald-700 font-extrabold tracking-wider block">
                  Attendance Verified
                </span>
                <h3 className="text-xl font-bold text-[#111827]">{metadata?.name || eventAccount.name}</h3>
                <p className="text-xs text-emerald-800 font-mono pt-1">
                  Recipient Wallet: <strong>{truncateWallet(wallet.publicKey.toBase58())}</strong>
                </p>
              </div>

              {mintedResult && (
                <div className="pt-1 text-xs text-slate-600 space-y-1 font-mono bg-white p-3 rounded-lg border border-emerald-200 max-w-md mx-auto">
                  <div>
                    Mint Address:{' '}
                    <ExplorerLink path={`account/${mintedResult.mint}`} label={truncateWallet(mintedResult.mint)} className="text-emerald-700 underline font-bold" />
                  </div>
                  <div>
                    Tx Signature:{' '}
                    <ExplorerLink path={`tx/${mintedResult.signature}`} label={truncateWallet(mintedResult.signature)} className="text-[#9945FF] underline font-bold" />
                  </div>
                </div>
              )}

              {/* Plain Language Explanation & 3-Point Checklist */}
              <div className="bg-white border border-emerald-200 rounded-lg p-4 text-left space-y-3 text-xs">
                <p className="text-[#111827] leading-relaxed">
                  A <strong>Soulbound Attendance Badge</strong> is a non-transferable digital credential that proves you attended this event.
                </p>

                <ul className="space-y-2 text-[#6B7280] border-t border-slate-100 pt-3">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span><strong>Verifiable:</strong> Authenticated directly on Solana Devnet</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span><strong>On-chain:</strong> Recorded permanently to your wallet public key</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span><strong>Non-transferable:</strong> Token account is frozen to prevent resale or spoofing</span>
                  </li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <button
                onClick={handleCheckIn}
                disabled={checkIn.isPending}
                className="w-full bg-[#111827] hover:bg-[#1F2937] text-white py-3.5 px-6 rounded-xl font-bold text-sm inline-flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-50"
              >
                {checkIn.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    <span>Minting Attendance Badge...</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="w-4 h-4 shrink-0" />
                    <span>Check In & Claim Attendance Badge</span>
                  </>
                )}
              </button>
              <p className="text-[11px] text-[#6B7280] text-center leading-relaxed">
                Checking in verifies your attendance, mints 1 Soulbound Badge, and freezes the credential in your wallet.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
