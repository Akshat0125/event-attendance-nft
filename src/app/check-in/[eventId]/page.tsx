'use client'

import { useState, useEffect, use } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { useEventAttendanceNftProgram } from '@/components/event-attendance-nft/event-attendance-nft-data-access'
import { WalletButton } from '@/components/solana/solana-provider'
import { ExplorerLink } from '@/components/cluster/cluster-ui'
import { toast } from 'sonner'
import { Lock, Loader2, CheckCircle2, UserCheck } from 'lucide-react'

export default function CheckInDetailPage({ params }: { params: Promise<{ eventId: string }> }) {
  const resolvedParams = use(params)
  const eventPdaStr = resolvedParams.eventId

  const wallet = useWallet()
  const { connection } = useConnection()
  const { program, programId, checkIn } = useEventAttendanceNftProgram()

  const [eventData, setEventData] = useState<{
    name: string
    organizer: string
    attendeeCount: number
    badgeUri: string
  } | null>(null)

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
      setEventData({
        name: account.name,
        organizer: account.organizer.toBase58(),
        attendeeCount: account.attendeeCount,
        badgeUri: account.badgeUri,
      })

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
      console.error('Error fetching event data:', err)
      toast.error('Event PDA not found on-chain!')
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
      toast.error('Please connect Phantom wallet first!')
      return
    }
    if (!eventPda) {
      toast.error('Invalid Event PDA address!')
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
      <div className="py-16 text-center space-y-4 max-w-md mx-auto">
        <div className="text-red-400 font-bold text-lg">Invalid Event PDA</div>
        <p className="text-sm text-[#8FA3C8]">The provided Event PDA address is not a valid Solana public key.</p>
      </div>
    )
  }

  return (
    <div className="py-8 sm:py-10 max-w-2xl mx-auto px-4 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-full bg-[#14F195]/10 text-[#14F195] text-xs font-semibold uppercase border border-[#14F195]/20">
          Soulbound Check-In Portal
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-[#E8EDF6] break-words">
          {isLoadingEvent ? 'Loading Event...' : eventData?.name || 'Event Attendance'}
        </h1>
        <p className="text-xs text-[#8FA3C8] font-mono break-all">PDA: {eventPdaStr}</p>
      </div>

      {isLoadingEvent ? (
        <div className="bg-[#161F30] border border-[#1F2D44] rounded-2xl p-12 text-center text-[#8FA3C8] flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#9945FF]" />
          <p className="text-sm">Fetching on-chain event details from Solana Devnet...</p>
        </div>
      ) : !eventData ? (
        <div className="bg-[#161F30] border border-[#1F2D44] rounded-2xl p-10 text-center space-y-3">
          <p className="text-lg font-bold text-[#E8EDF6]">Event Not Found</p>
          <p className="text-sm text-[#8FA3C8]">No event account exists at this PDA address on Devnet.</p>
        </div>
      ) : (
        <div className="bg-[#161F30] border border-[#1F2D44] rounded-2xl p-5 sm:p-8 space-y-8 shadow-2xl">
          {/* Badge Display & Stats */}
          <div className="flex flex-col sm:flex-row items-center gap-6 border-b border-[#1F2D44] pb-6">
            <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-purple-600 to-teal-400 p-1 shrink-0 shadow-lg">
              <div className="w-full h-full rounded-[14px] bg-[#0B1220] flex flex-col items-center justify-center text-center p-3 space-y-1">
                <span className="text-xs font-extrabold uppercase text-[#9945FF] tracking-wider">Soulbound</span>
                <span className="text-[10px] text-[#8FA3C8] font-semibold break-words max-w-full leading-tight">{eventData.name}</span>
              </div>
            </div>

            <div className="space-y-3 text-center sm:text-left flex-grow min-w-0">
              <div>
                <span className="text-xs text-[#8FA3C8] block">Event Name</span>
                <h2 className="text-xl font-bold text-[#E8EDF6] break-words">{eventData.name}</h2>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 pt-1">
                <div className="bg-[#0B1220] border border-[#1F2D44] rounded-xl p-3 text-center sm:text-left">
                  <span className="text-[10px] text-[#8FA3C8] block uppercase">Live Attendees</span>
                  <span className="text-lg font-extrabold text-[#14F195]">{eventData.attendeeCount}</span>
                </div>
                <div className="bg-[#0B1220] border border-[#1F2D44] rounded-xl p-3 text-center sm:text-left">
                  <span className="text-[10px] text-[#8FA3C8] block uppercase">Token Status</span>
                  <span className="text-xs font-bold text-[#9945FF] inline-flex items-center gap-1 mt-1">
                    <Lock className="w-3 h-3 shrink-0" /> Frozen
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Wallet State & Check-In Action */}
          {!wallet.publicKey ? (
            <div className="text-center space-y-4 pt-2">
              <p className="text-sm text-[#8FA3C8]">Connect your Phantom wallet to claim your proof of attendance.</p>
              <div className="flex items-center justify-center">
                <WalletButton />
              </div>
            </div>
          ) : alreadyCheckedIn ? (
            <div className="bg-[#14F195]/10 border border-[#14F195]/30 rounded-xl p-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-[#14F195]/20 text-[#14F195] flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-[#E8EDF6]">Checked In!</h3>
                <p className="text-xs text-[#8FA3C8] mt-1">
                  Your Soulbound Badge NFT has been minted and frozen in your wallet.
                </p>
              </div>
              {mintedResult && (
                <div className="pt-2 text-xs text-[#8FA3C8] space-y-1 font-mono">
                  <div>
                    Mint Address:{' '}
                    <ExplorerLink path={`account/${mintedResult.mint}`} label={`${mintedResult.mint.slice(0, 8)}...`} className="text-[#14F195] underline" />
                  </div>
                  <div>
                    Tx Signature:{' '}
                    <ExplorerLink path={`tx/${mintedResult.signature}`} label={`${mintedResult.signature.slice(0, 8)}...`} className="text-[#9945FF] underline" />
                  </div>
                </div>
              )}
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
                    <span>Minting Soulbound Badge...</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="w-5 h-5 shrink-0" />
                    <span>Check In & Mint Badge NFT</span>
                  </>
                )}
              </button>
              <p className="text-[11px] text-[#8FA3C8] text-center leading-relaxed">
                Checking in atomically creates your attendance record, mints 1 badge NFT, and freezes your token account.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
