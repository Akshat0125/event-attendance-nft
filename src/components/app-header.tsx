'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useState, Suspense } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Menu, X } from 'lucide-react'
import { ClusterUiSelect } from './cluster/cluster-ui'
import { WalletButton } from '@/components/solana/solana-provider'

function HeaderContent({ links = [] }: { links: { label: string; path: string }[] }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentTab = searchParams.get('tab') || 'dashboard'
  const [showMenu, setShowMenu] = useState(false)

  // SaaS Product Navigation Links
  const navLinks = [
    { label: 'Dashboard', path: '/organizer', tab: 'dashboard' },
    { label: 'Events', path: '/organizer?tab=events', tab: 'events' },
    { label: 'Attendees', path: '/organizer?tab=attendees', tab: 'attendees' },
    { label: 'Badges', path: '/organizer?tab=badges', tab: 'badges' },
    { label: 'Analytics', path: '/organizer?tab=analytics', tab: 'analytics' },
    { label: 'Settings', path: '/organizer?tab=settings', tab: 'settings' },
    { label: 'Check-In', path: '/check-in', tab: 'check-in' },
  ]

  function isLinkActive(link: typeof navLinks[0]) {
    if (link.path === '/check-in') return pathname.startsWith('/check-in')
    if (pathname === '/organizer') {
      if (link.tab === 'dashboard' && !searchParams.get('tab')) return true
      return currentTab === link.tab
    }
    return pathname === link.path
  }

  return (
    <header className="sticky top-0 z-50 border-b border-[#E5E7EB] bg-white/90 backdrop-blur-md px-4 sm:px-6 lg:px-8 py-3 text-[#111827]">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand & Devnet Pill */}
        <div className="flex items-center gap-4 sm:gap-6">
          <Link className="text-xl font-extrabold tracking-tight inline-flex items-center gap-2 shrink-0" href="/">
            <span className="text-solana-gradient">NFTicket</span>
          </Link>
          <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-wider">
            Devnet
          </span>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center ml-2">
            <ul className="flex items-center gap-5 flex-nowrap text-sm font-medium">
              {navLinks.map((link) => {
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
          <div className="lg:hidden fixed inset-x-0 top-[57px] bottom-0 bg-white/98 backdrop-blur-md z-50 p-5 overflow-y-auto border-t border-[#E5E7EB]">
            <div className="flex flex-col gap-6">
              <ul className="flex flex-col gap-3 border-b border-[#E5E7EB] pb-4">
                {navLinks.map((link) => {
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
                  )
                })}
              </ul>
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
      <header className="sticky top-0 z-50 border-b border-[#E5E7EB] bg-white px-4 py-3 text-[#111827]">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <span className="text-xl font-extrabold text-solana-gradient">NFTicket</span>
        </div>
      </header>
    }>
      <HeaderContent links={links} />
    </Suspense>
  )
}
