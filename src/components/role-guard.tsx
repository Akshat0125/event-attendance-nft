'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useRole, UserRole } from '@/components/role-provider'
import { Loader2, ArrowRight } from 'lucide-react'

export function RoleGuard({
  children,
  requiredRole,
}: {
  children: React.ReactNode
  requiredRole: 'organizer' | 'attendee'
}) {
  const { role, isRoleLoaded, setRole } = useRole()
  const router = useRouter()

  useEffect(() => {
    if (!isRoleLoaded) return

    // If role is attendee and user tries to open organizer route -> redirect to /check-in
    if (role === 'attendee' && requiredRole === 'organizer') {
      router.replace('/check-in')
    }
    // If role is organizer and user tries to open attendee portal -> redirect to /organizer
    else if (role === 'organizer' && requiredRole === 'attendee') {
      router.replace('/organizer')
    }
  }, [role, isRoleLoaded, requiredRole, router])

  if (!isRoleLoaded) {
    return (
      <div className="py-20 text-center text-[#6B7280] flex flex-col items-center justify-center gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-[#111827]" />
        <span className="text-xs">Verifying access...</span>
      </div>
    )
  }

  // If no role has been chosen yet, present a clean role selection prompt
  if (!role) {
    return (
      <div className="py-12 sm:py-16 max-w-lg mx-auto px-4 text-center space-y-6">
        <div className="bg-[#FFFFFF] border border-[#E5E3DF] rounded-2xl p-8 space-y-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full bg-[#EFECE6] border border-[#E5E3DF] text-slate-700 text-xs font-semibold uppercase">
              Role Selection Required
            </span>
            <h2 className="text-2xl font-bold text-[#111827]">Choose your experience</h2>
            <p className="text-xs text-[#6B7280]">
              Please select whether you are managing an event or checking in as an attendee to access this area.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => {
                setRole('organizer')
                router.push('/organizer')
              }}
              className="bg-[#111827] hover:bg-[#1F2937] text-white p-4 rounded-xl text-left space-y-1.5 transition shadow-sm"
            >
              <span className="text-xs uppercase font-bold text-[#9945FF] block">Event Host</span>
              <span className="text-sm font-bold block flex items-center justify-between">
                <span>Organizer</span>
                <ArrowRight className="w-4 h-4" />
              </span>
            </button>

            <button
              onClick={() => {
                setRole('attendee')
                router.push('/check-in')
              }}
              className="bg-[#F6F5F3] hover:bg-[#EFECE6] text-[#111827] p-4 rounded-xl text-left space-y-1.5 transition border border-[#E5E3DF]"
            >
              <span className="text-xs uppercase font-bold text-emerald-700 block">Event Guest</span>
              <span className="text-sm font-bold block flex items-center justify-between">
                <span>Attendee</span>
                <ArrowRight className="w-4 h-4 text-emerald-700" />
              </span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // If role mismatch exists while redirecting
  if (role !== requiredRole) {
    return (
      <div className="py-20 text-center text-[#6B7280] flex flex-col items-center justify-center gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-[#111827]" />
        <span className="text-xs">Redirecting to your role area...</span>
      </div>
    )
  }

  return <>{children}</>
}
