'use client'

import { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { useEventAttendanceNftProgram } from './event-attendance-nft-data-access'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { WalletButton } from '@/components/solana/solana-provider'
import { useCluster } from '../cluster/cluster-data-access'
import { CheckCircle2, Lock, AlertTriangle } from 'lucide-react'

export function EventAttendanceNftUi() {
  const { publicKey } = useWallet()
  const { programId, createEvent, checkIn } = useEventAttendanceNftProgram()
  const { cluster, setCluster, clusters } = useCluster()

  // Organizer state
  const [eventName, setEventName] = useState('Solana Breakpoint 2026')

  // Check-in state
  const [checkInEventName, setCheckInEventName] = useState('Solana Breakpoint 2026')
  const [organizerAddress, setOrganizerAddress] = useState('')

  const ipfsBadgeUri = process.env.NEXT_PUBLIC_BADGE_URI || process.env.NEXT_PUBLIC_IPFS_BADGE_URI || 'ipfs://QmEventAttendanceBadgeFixedUri/metadata.json'

  const handleCreateEvent = () => {
    if (!publicKey) return
    createEvent.mutate({ name: eventName, badgeUri: ipfsBadgeUri, organizer: publicKey })
  }

  const handleCheckIn = () => {
    if (!publicKey) return
    const org = organizerAddress ? new PublicKey(organizerAddress) : publicKey
    const [eventPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('event'), org.toBuffer(), Buffer.from(checkInEventName)],
      programId
    )
    checkIn.mutate({ eventPda })
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8 py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
      {/* Cluster Warning Banner */}
      {cluster.name !== 'devnet' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-800 text-xs sm:text-sm">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <span className="font-semibold text-amber-900">Cluster Mismatch Warning:</span> Current dApp cluster is <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono text-amber-900">{cluster.name}</code> ({cluster.endpoint}). The program is deployed on <strong className="text-emerald-700">Devnet</strong>.
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => {
              const devnet = clusters.find((c) => c.name === 'devnet')
              if (devnet) setCluster(devnet)
            }}
            className="w-full sm:w-auto bg-amber-700 hover:bg-amber-800 text-white font-semibold shrink-0 text-xs sm:text-sm inline-flex items-center justify-center"
          >
            Switch to Devnet
          </Button>
        </div>
      )}

      {/* Hero Header */}
      <div className="text-center space-y-3 bg-white p-4 sm:p-6 md:p-8 rounded-2xl border border-[#E5E7EB] shadow-sm">
        <div className="inline-flex items-center justify-center px-3.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold uppercase tracking-wider">
          Soulbound NFT Badges
        </div>
        <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-[#111827]">
          Event Attendance System
        </h1>
        <p className="max-w-2xl mx-auto text-[#6B7280] text-xs sm:text-base">
          Atomically verify event check-ins on Solana. Mints non-transferable (frozen) soulbound badge NFTs with permanent proof of attendance.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-4 text-xs font-mono pt-2 text-[#6B7280]">
          <div className="break-all text-center">Program ID: <span className="text-[#9945FF] font-semibold">{programId.toBase58()}</span></div>
          <div className="hidden sm:block">•</div>
          <div>Active Cluster: <span className={cluster.name === 'devnet' ? 'text-emerald-700 font-semibold' : 'text-amber-600 font-semibold'}>{cluster.name}</span></div>
        </div>
      </div>

      {!publicKey ? (
        <div className="text-center py-8 sm:py-12 px-4 bg-white rounded-xl border border-[#E5E7EB] space-y-4 shadow-sm">
          <h2 className="text-base sm:text-lg font-medium text-[#111827]">Connect your wallet to get started</h2>
          <div className="flex justify-center items-center w-full overflow-hidden">
            <WalletButton />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Organizer Card */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 sm:p-6 space-y-4 sm:space-y-5 shadow-sm">
            <div className="border-b border-[#E5E7EB] pb-3">
              <h2 className="text-base sm:text-lg font-bold text-[#111827]">Organizer: Create Event</h2>
              <p className="text-xs text-[#6B7280]">Initialize an on-chain event account</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="event-name" className="text-[#111827] text-xs sm:text-sm">Event Name</Label>
                <Input
                  id="event-name"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  placeholder="e.g. Solana Hacker House"
                  className="bg-white border-[#E5E7EB] text-[#111827] text-xs sm:text-sm"
                />
              </div>

              <div className="space-y-1 text-xs text-[#6B7280] break-all">
                <p>Organizer: <span className="font-mono text-[#111827]">{publicKey.toBase58().slice(0, 10)}...</span></p>
              </div>

              <Button
                onClick={handleCreateEvent}
                disabled={createEvent.isPending || !eventName.trim()}
                className="w-full bg-[#111827] hover:bg-[#1F2937] text-white font-bold text-xs sm:text-sm py-2.5 sm:py-3 inline-flex items-center justify-center shadow-sm"
              >
                {createEvent.isPending ? 'Creating Event...' : 'Create Event Account'}
              </Button>
            </div>
          </div>

          {/* Attendee Check-In Card */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 sm:p-6 space-y-4 sm:space-y-5 shadow-sm">
            <div className="border-b border-[#E5E7EB] pb-3">
              <h2 className="text-base sm:text-lg font-bold text-[#111827]">Attendee: Check-In</h2>
              <p className="text-xs text-[#6B7280]">Mint & Freeze your Soulbound Badge</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="checkin-event-name" className="text-[#111827] text-xs sm:text-sm">Event Name</Label>
                <Input
                  id="checkin-event-name"
                  value={checkInEventName}
                  onChange={(e) => setCheckInEventName(e.target.value)}
                  placeholder="e.g. Solana Hacker House"
                  className="bg-white border-[#E5E7EB] text-[#111827] text-xs sm:text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="organizer-pubkey" className="text-[#111827] text-xs sm:text-sm">
                  Organizer Address <span className="text-[#6B7280] text-xs block sm:inline">(optional - defaults to current wallet)</span>
                </Label>
                <Input
                  id="organizer-pubkey"
                  value={organizerAddress}
                  onChange={(e) => setOrganizerAddress(e.target.value)}
                  placeholder={publicKey.toBase58()}
                  className="bg-white border-[#E5E7EB] text-[#111827] font-mono text-xs truncate"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-[#E5E7EB] text-xs space-y-1">
                <div className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold">
                  <Lock className="w-3.5 h-3.5 shrink-0" /> Soulbound Protection Active
                </div>
                <p className="text-[#6B7280] text-xs">
                  Token account will be frozen immediately upon minting to ensure badge cannot be transferred.
                </p>
              </div>

              <Button
                onClick={handleCheckIn}
                disabled={checkIn.isPending || !checkInEventName.trim()}
                className="w-full bg-[#111827] hover:bg-[#1F2937] text-white font-bold text-xs sm:text-sm py-2.5 sm:py-3 inline-flex items-center justify-center shadow-sm"
              >
                {checkIn.isPending ? 'Processing Check-In...' : 'Check In & Mint Badge'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Soulbound Badge Design Specs */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 sm:p-6 space-y-4 shadow-sm">
        <h3 className="text-sm sm:text-base font-semibold text-[#111827] flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> Badge Design & Fixed IPFS Metadata
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs text-[#6B7280]">
          <div className="p-3 bg-slate-50 rounded-lg border border-[#E5E7EB]">
            <span className="font-semibold text-[#111827]">Fixed IPFS URI:</span>
            <div className="font-mono text-[#9945FF] break-all mt-1">{ipfsBadgeUri}</div>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-[#E5E7EB] space-y-1">
            <span className="font-semibold text-[#111827]">Soulbound Guarantees:</span>
            <ul className="list-disc list-inside space-y-0.5 text-[#6B7280]">
              <li>Atomic anti-duplicate PDA check</li>
              <li>Token account frozen immediately after mint</li>
              <li>Zero transferability across all wallets</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
