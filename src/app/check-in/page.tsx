'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { useEventAttendanceNftProgram } from '@/components/event-attendance-nft/event-attendance-nft-data-access'
import { WalletButton } from '@/components/solana/solana-provider'
import { RoleGuard } from '@/components/role-guard'
import { ArrowRight, ShieldCheck, Loader2 } from 'lucide-react'
import { fetchEventMetadata, truncateWallet } from '@/lib/event-metadata'
import Link from 'next/link'

function CheckInContent() {
  const [eventPdaInput, setEventPdaInput] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTab = searchParams.get('tab') || 'check-in'

  const wallet = useWallet()
  const { connection } = useConnection()
  const { program } = useEventAttendanceNftProgram()

  const [myBadges, setMyBadges] = useState<{ eventName: string; eventPda: string; timestamp: number }[]>([])
  const [isLoadingBadges, setIsLoadingBadges] = useState(false)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!eventPdaInput.trim()) return
    router.push(`/check-in/${eventPdaInput.trim()}`)
  }

  // Fetch attendee's attendance records across devnet
  useEffect(() => {
    const fetchAttendeeBadges = async () => {
      if (!program || !wallet.publicKey || activeTab !== 'my-badges') return
      setIsLoadingBadges(true)
      try {
        const records = await program.account.attendanceRecord.all([
          {
            memcmp: {
              offset: 8 + 32, // attendee pubkey offset in AttendanceRecord struct
              bytes: wallet.publicKey.toBase58(),
            },
          },
        ])

        const formatted = await Promise.all(
          records.map(async (r) => {
            const eventPda = r.account.event.toBase58()
            let name = 'Solana Event'
            try {
              const evtAcc = await program.account.event.fetch(r.account.event)
              name = evtAcc.name
            } catch (e) {
              console.error(e)
            }
            return {
              eventName: name,
              eventPda,
              timestamp: r.account.timestamp.toNumber(),
            }
          })
        )

        formatted.sort((a, b) => b.timestamp - a.timestamp)
        setMyBadges(formatted)
      } catch (err) {
        console.error('Error fetching attendee badges:', err)
      } finally {
        setIsLoadingBadges(false)
      }
    }

    fetchAttendeeBadges()
  }, [program, wallet.publicKey, activeTab])

  return (
    <div className="py-8 sm:py-12 max-w-2xl mx-auto px-4 space-y-8">
      {activeTab === 'my-badges' ? (
        <div className="card-saas p-6 sm:p-8 space-y-6">
          <div className="border-b border-[#E5E3DF] pb-4">
            <h1 className="text-2xl font-bold text-[#111827]">My Attendance Badges</h1>
            <p className="text-xs text-[#6B7280]">Soulbound credentials issued to your wallet on Solana Devnet</p>
          </div>

          {!wallet.publicKey ? (
            <div className="text-center py-8 space-y-3">
              <p className="text-xs text-[#6B7280]">Connect your wallet to view your claimed attendance credentials.</p>
              <div className="flex justify-center">
                <WalletButton />
              </div>
            </div>
          ) : isLoadingBadges ? (
            <div className="py-8 text-center text-[#6B7280] flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#111827]" />
              <span className="text-xs">Fetching your badges from Solana...</span>
            </div>
          ) : myBadges.length === 0 ? (
            <div className="text-center py-8 space-y-2 border border-dashed border-[#E5E3DF] rounded-xl p-4">
              <p className="text-sm font-semibold text-[#111827]">No badges claimed yet</p>
              <p className="text-xs text-[#6B7280]">Check in to an event to mint your first verifiable attendance credential.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myBadges.map((badge, idx) => (
                <div key={idx} className="p-4 bg-[#F6F5F3] border border-[#E5E3DF] rounded-xl flex items-center justify-between gap-3 text-xs">
                  <div className="space-y-0.5">
                    <span className="font-bold text-[#111827] text-sm block">{badge.eventName}</span>
                    <span className="text-[#6B7280] font-mono text-[11px]">Event PDA: {truncateWallet(badge.eventPda)}</span>
                  </div>
                  <Link
                    href={`/check-in/${badge.eventPda}`}
                    className="bg-[#111827] text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-[#1F2937] transition"
                  >
                    View Badge
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-3 text-center">
            <span className="px-3.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold uppercase inline-block">
              Attendee Portal
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#111827]">Event Check-In</h1>
            <p className="text-xs sm:text-sm text-[#6B7280] leading-relaxed max-w-md mx-auto">
              Enter an Event PDA address to check in and claim your Soulbound Badge credential on Solana.
            </p>
          </div>

          <div className="card-saas p-6 sm:p-8 space-y-6 text-left">
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#111827] block">Event PDA Address</label>
                <input
                  type="text"
                  placeholder="e.g. 5x7Z... or Event PDA address"
                  value={eventPdaInput}
                  onChange={(e) => setEventPdaInput(e.target.value)}
                  className="w-full bg-[#FFFFFF] border border-[#E5E3DF] focus:border-[#111827] rounded-xl px-4 py-3 text-[#111827] placeholder-[#9CA3AF] text-sm font-mono outline-none transition"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-[#111827] hover:bg-[#1F2937] text-white py-3 px-6 rounded-xl font-semibold text-sm inline-flex items-center justify-center gap-2 shadow-sm transition"
              >
                <span>Find Event</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  )
}

export default function CheckInEntryPage() {
  return (
    <RoleGuard requiredRole="attendee">
      <Suspense fallback={<div className="py-12 text-center text-[#6B7280]">Loading check-in...</div>}>
        <CheckInContent />
      </Suspense>
    </RoleGuard>
  )
}
