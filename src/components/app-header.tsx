'use client'

import { usePathname, useSearchParams, useRouter } from 'next/navigation'
import { useState, Suspense } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Menu, X, ArrowLeftRight, UserCheck, LayoutDashboard } from 'lucide-react'
import { ClusterUiSelect } from './cluster/cluster-ui'
import { WalletButton } from '@/components/solana/solana-provider'
import { useRole } from '@/components/role-provider'

function HeaderContent({ links = [] }: { links: { label: string; path: string }[] }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const currentTab = searchParams.get('tab') || 'dashboard'
  const [showMenu, setShowMenu] = useState(false)

  const { role, setRole, switchRole } = useRole()

  // Organizer Navigation Items
  const organizerNavLinks = [
    { label: 'Dashboard', path: '/organizer', tab: 'dashboard' },
    { label: 'Events', path: '/organizer?tab=events', tab: 'events' },
    { label: 'Attendees', path: '/organizer?tab=attendees', tab: 'attendees' },
    { label: 'Badges', path: '/organizer?tab=badges', tab: 'badges' },
    { label: 'Analytics', path: '/organizer?tab=analytics', tab: 'analytics' },
    { label: 'Settings', path: '/organizer?tab=settings', tab: 'settings' },
  ]

  // Attendee Navigation Items
  const attendeeNavLinks = [
    { label: 'Check-In', path: '/check-in', tab: 'check-in' },
    { label: 'My Badges', path: '/check-in?tab=my-badges', tab: 'my-badges' },
  ]

  const activeNavLinks = role === 'organizer' ? organizerNavLinks : role === 'attendee' ? attendeeNavLinks : []

  function isLinkActive(link: typeof organizerNavLinks[0]) {
    if (link.path.startsWith('/check-in')) return pathname.startsWith('/check-in')
    if (pathname === '/organizer') {
      if (link.tab === 'dashboard' && !searchParams.get('tab')) return true
      return currentTab === link.tab
    }
    return pathname === link.path
  }

  const handleRoleSwitch = () => {
    if (role === 'organizer') {
      setRole('attendee')
      router.push('/check-in')
    } else {
      setRole('organizer')
      router.push('/organizer')
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-[#E5E3DF] bg-[#FFFFFF]/90 backdrop-blur-md px-4 sm:px-6 lg:px-8 py-2.5 text-[#111827]">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand & Devnet Pill */}
        <div className="flex items-center gap-3 sm:gap-5">
          <Link className="text-xl font-extrabold tracking-tight inline-flex items-center gap-2 shrink-0" href="/">
            <span className="text-solana-gradient">NFTicket</span>
          </Link>
          <span className="px-2 py-0.5 rounded-full bg-[#EFECE6] border border-[#E5E3DF] text-slate-600 text-[10px] font-bold uppercase tracking-wider">
            Devnet
          </span>

          {/* Role Pill & Switch Button */}
          {role && (
            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-[#E5E3DF]">
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${role === 'organizer' ? 'bg-purple-100 text-[#9945FF]' : 'bg-emerald-100 text-emerald-800'}`}>
                {role === 'organizer' ? 'Organizer' : 'Attendee'}
              </span>
              <button
                onClick={handleRoleSwitch}
                className="text-[11px] text-slate-500 hover:text-[#111827] inline-flex items-center gap-1 font-medium underline"
                title="Switch User Role"
              >
                <ArrowLeftRight className="w-3 h-3" />
                <span>Switch to {role === 'organizer' ? 'Attendee' : 'Organizer'}</span>
              </button>
            </div>
          )}

          {/* Desktop Navigation */}
          {role && (
            <div className="hidden lg:flex items-center ml-2">
              <ul className="flex items-center gap-5 flex-nowrap text-sm font-medium">
                {activeNavLinks.map((link) => {
                  const active = isLinkActive(link)
                  return (
                    <li key={link.label} className="inline-flex items-center">
                      <Link
                        className={`transition py-1 px-1.5 text-xs sm:text-sm font-medium ${
                          active
                            ? 'text-[#111827] font-semibold border-b-2 border-[#9945FF]'
                            : 'text-[#6B7280] hover:text-[#111827]'
                        }`}
                        href={link.path}
                      >
                        {link.label}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <Button variant="ghost" size="icon" className="lg:hidden text-[#6B7280] hover:text-[#111827]" onClick={() => setShowMenu(!showMenu)}>
          {showMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>

        {/* Desktop Controls */}
        <div className="hidden lg:flex items-center gap-3">
          <WalletButton />
          <ClusterUiSelect />
        </div>

        {/* Mobile Drawer */}
        {showMenu && (
          <div className="lg:hidden fixed inset-x-0 top-[53px] bottom-0 bg-white/98 backdrop-blur-md z-50 p-5 overflow-y-auto border-t border-[#E5E3DF]">
            <div className="flex flex-col gap-6">
              {role && (
                <div className="flex items-center justify-between p-3 bg-[#F6F5F3] rounded-xl border border-[#E5E3DF]">
                  <span className="text-xs font-semibold text-slate-700 uppercase">
                    Role: <strong className="text-[#111827]">{role}</strong>
                  </span>
                  <button
                    onClick={() => {
                      handleRoleSwitch()
                      setShowMenu(false)
                    }}
                    className="text-xs bg-[#111827] text-white px-3 py-1.5 rounded-lg font-semibold inline-flex items-center gap-1"
                  >
                    <ArrowLeftRight className="w-3 h-3" />
                    <span>Switch to {role === 'organizer' ? 'Attendee' : 'Organizer'}</span>
                  </button>
                </div>
              )}

              {role ? (
                <ul className="flex flex-col gap-3 border-b border-[#E5E3DF] pb-4">
                  {activeNavLinks.map((link) => {
                    const active = isLinkActive(link)
                    return (
                      <li key={link.label}>
                        <Link
                          className={`block text-sm font-semibold py-2 ${active ? 'text-[#111827] font-bold' : 'text-[#6B7280] hover:text-[#111827]'}`}
                          href={link.path}
                          onClick={() => setShowMenu(false)}
                        >
                          {link.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="text-center py-4 space-y-3">
                  <p className="text-xs text-slate-600">Select a role on the landing page to access navigation.</p>
                  <Link
                    href="/"
                    onClick={() => setShowMenu(false)}
                    className="inline-block bg-[#111827] text-white text-xs font-semibold px-4 py-2 rounded-lg"
                  >
                    Choose Role
                  </Link>
                </div>
              )}

              <div className="flex flex-col gap-4 items-stretch w-full">
                <div className="w-full flex items-center justify-center">
                  <WalletButton />
                </div>
                <div className="flex items-center justify-between gap-2 text-xs text-[#6B7280]">
                  <span>Cluster:</span>
                  <ClusterUiSelect />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}

export function AppHeader({ links = [] }: { links: { label: string; path: string }[] }) {
  return (
    <Suspense fallback={
      <header className="sticky top-0 z-50 border-b border-[#E5E3DF] bg-white px-4 py-3 text-[#111827]">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <span className="text-xl font-extrabold text-solana-gradient">NFTicket</span>
        </div>
      </header>
    }>
      <HeaderContent links={links} />
    </Suspense>
  )
}
