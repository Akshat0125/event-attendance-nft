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
import { ShieldCheck, Award, Calendar, CheckCircle2, Lock, AlertTriangle } from 'lucide-react'

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
    createEvent.mutate({ name: eventName, organizer: publicKey })
  }

  const handleCheckIn = () => {
    if (!publicKey) return
    const org = organizerAddress ? new PublicKey(organizerAddress) : publicKey
    checkIn.mutate({ eventName: checkInEventName, organizer: org })
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-6">
      {/* Cluster Warning Banner */}
      {cluster.name !== 'devnet' && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-amber-200 text-sm">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <span className="font-semibold text-white">Cluster Mismatch Warning:</span> Current dApp cluster is <code className="bg-amber-950 px-1.5 py-0.5 rounded font-mono text-amber-300">{cluster.name}</code> ({cluster.endpoint}). The program is deployed on <strong className="text-emerald-400">Devnet</strong>.
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => {
              const devnet = clusters.find((c) => c.name === 'devnet')
              if (devnet) setCluster(devnet)
            }}
            className="bg-amber-600 hover:bg-amber-700 text-white font-semibold shrink-0"
          >
            Switch to Devnet
          </Button>
        </div>
      )}

      {/* Hero Header */}
      <div className="text-center space-y-3 bg-gradient-to-r from-purple-900/30 via-indigo-900/30 to-blue-900/30 p-8 rounded-2xl border border-indigo-500/20 backdrop-blur-md">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4" /> Soulbound NFT Badges
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
          Event Attendance NFT System
        </h1>
        <p className="max-w-2xl mx-auto text-neutral-400 text-sm sm:text-base">
          Atomically verify event check-ins on Solana. Mints non-transferable (frozen) soulbound badge NFTs with permanent proof of attendance.
        </p>
        <div className="flex items-center justify-center gap-4 text-xs font-mono pt-2 text-neutral-500">
          <div>Program ID: <span className="text-indigo-400">{programId.toBase58()}</span></div>
          <div>•</div>
          <div>Active Cluster: <span className={cluster.name === 'devnet' ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>{cluster.name}</span></div>
        </div>
      </div>

      {!publicKey ? (
        <div className="text-center py-12 bg-neutral-900/50 rounded-xl border border-neutral-800 space-y-4">
          <h2 className="text-lg font-medium text-neutral-300">Connect your wallet to get started</h2>
          <div className="flex justify-center">
            <WalletButton />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Organizer Card */}
          <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-6 space-y-5 shadow-xl">
            <div className="flex items-center gap-3 border-b border-neutral-800 pb-4">
              <Calendar className="w-6 h-6 text-purple-400" />
              <div>
                <h2 className="text-lg font-semibold text-white">Organizer: Create Event</h2>
                <p className="text-xs text-neutral-400">Initialize an on-chain event account</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="event-name" className="text-neutral-300">Event Name</Label>
                <Input
                  id="event-name"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  placeholder="e.g. Solana Hacker House"
                  className="bg-neutral-950 border-neutral-800 text-white"
                />
              </div>

              <div className="space-y-1 text-xs text-neutral-500">
                <p>Organizer: <span className="font-mono text-neutral-400">{publicKey.toBase58().slice(0, 10)}...</span></p>
              </div>

              <Button
                onClick={handleCreateEvent}
                disabled={createEvent.isPending || !eventName.trim()}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium"
              >
                {createEvent.isPending ? 'Creating Event...' : 'Create Event Account'}
              </Button>
            </div>
          </div>

          {/* Attendee Check-In Card */}
          <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-6 space-y-5 shadow-xl">
            <div className="flex items-center gap-3 border-b border-neutral-800 pb-4">
              <Award className="w-6 h-6 text-indigo-400" />
              <div>
                <h2 className="text-lg font-semibold text-white">Attendee: Check-In</h2>
                <p className="text-xs text-neutral-400">Mint & Freeze your Soulbound Badge</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="checkin-event-name" className="text-neutral-300">Event Name</Label>
                <Input
                  id="checkin-event-name"
                  value={checkInEventName}
                  onChange={(e) => setCheckInEventName(e.target.value)}
                  placeholder="e.g. Solana Hacker House"
                  className="bg-neutral-950 border-neutral-800 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="organizer-pubkey" className="text-neutral-300">
                  Organizer Address <span className="text-neutral-500 text-xs">(optional - defaults to current wallet)</span>
                </Label>
                <Input
                  id="organizer-pubkey"
                  value={organizerAddress}
                  onChange={(e) => setOrganizerAddress(e.target.value)}
                  placeholder={publicKey.toBase58()}
                  className="bg-neutral-950 border-neutral-800 text-white font-mono text-xs"
                />
              </div>

              <div className="p-3 bg-neutral-950/80 rounded-lg border border-neutral-800 text-xs space-y-1">
                <div className="flex items-center gap-1.5 text-indigo-400 font-semibold">
                  <Lock className="w-3.5 h-3.5" /> Soulbound Protection Active
                </div>
                <p className="text-neutral-400">
                  Token account will be frozen immediately upon minting to ensure badge cannot be transferred.
                </p>
              </div>

              <Button
                onClick={handleCheckIn}
                disabled={checkIn.isPending || !checkInEventName.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
              >
                {checkIn.isPending ? 'Processing Check-In...' : 'Check In & Mint Badge'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Soulbound Badge Design Specs */}
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-6 space-y-4">
        <h3 className="text-md font-semibold text-white flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" /> Badge Design & Fixed IPFS Metadata
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-neutral-400">
          <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-800">
            <span className="font-semibold text-neutral-200">Fixed IPFS URI:</span>
            <div className="font-mono text-emerald-400 break-all mt-1">{ipfsBadgeUri}</div>
          </div>
          <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-800 space-y-1">
            <span className="font-semibold text-neutral-200">Soulbound Guarantees:</span>
            <ul className="list-disc list-inside space-y-0.5 text-neutral-400">
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
