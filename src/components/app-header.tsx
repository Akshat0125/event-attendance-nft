'use client'

import { usePathname } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Menu, X } from 'lucide-react'
import { ClusterUiSelect } from './cluster/cluster-ui'
import { WalletButton } from '@/components/solana/solana-provider'

export function AppHeader({ links = [] }: { links: { label: string; path: string }[] }) {
  const pathname = usePathname()
  const [showMenu, setShowMenu] = useState(false)

  // Default links for product framing
  const defaultLinks = links.length > 0 ? links : [
    { label: 'Organizer Dashboard', path: '/organizer' },
    { label: 'Check-In', path: '/check-in' },
  ]

  function isActive(path: string) {
    return path === '/' ? pathname === '/' : pathname.startsWith(path)
  }

  return (
    <header className="relative z-50 border-b border-[#1F2D44] bg-[#0B1220]/90 backdrop-blur-md px-4 sm:px-6 lg:px-8 py-3 text-[#E8EDF6]">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand & Devnet Indicator */}
        <div className="flex items-center gap-4 sm:gap-6">
          <Link className="text-xl font-extrabold tracking-tight inline-flex items-center gap-2.5 hover:opacity-90 transition text-solana-gradient shrink-0" href="/">
            NFTicket
          </Link>
          <span className="px-2 py-0.5 rounded-full bg-[#14F195]/15 border border-[#14F195]/30 text-[#14F195] text-[10px] font-extrabold uppercase tracking-wider">
            Devnet
          </span>
          <div className="hidden md:flex items-center ml-2">
            <ul className="flex items-center gap-6 flex-nowrap text-sm font-medium">
              {defaultLinks.map(({ label, path }) => (
                <li key={path} className="inline-flex items-center">
                  <Link
                    className={`transition inline-flex items-center py-1 ${isActive(path) ? 'text-[#14F195] font-bold border-b-2 border-[#14F195]' : 'text-[#8FA3C8] hover:text-[#E8EDF6]'}`}
                    href={path}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Mobile Menu Toggle */}
        <Button variant="ghost" size="icon" className="md:hidden text-[#8FA3C8] hover:text-white inline-flex items-center justify-center" onClick={() => setShowMenu(!showMenu)}>
          {showMenu ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>

        {/* Desktop Controls */}
        <div className="hidden md:flex items-center gap-3">
          <WalletButton />
          <ClusterUiSelect />
        </div>

        {/* Mobile Menu Drawer */}
        {showMenu && (
          <div className="md:hidden fixed inset-x-0 top-[57px] bottom-0 bg-[#0B1220]/98 backdrop-blur-md z-50 p-5 overflow-y-auto border-t border-[#1F2D44]">
            <div className="flex flex-col gap-6">
              <ul className="flex flex-col gap-3 border-b border-[#1F2D44] pb-4">
                {defaultLinks.map(({ label, path }) => (
                  <li key={path}>
                    <Link
                      className={`block text-base font-semibold py-2 ${isActive(path) ? 'text-[#14F195]' : 'text-[#8FA3C8] hover:text-white'}`}
                      href={path}
                      onClick={() => setShowMenu(false)}
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="flex flex-col gap-4 items-stretch w-full overflow-hidden">
                <div className="w-full overflow-hidden flex items-center justify-center">
                  <WalletButton />
                </div>
                <div className="flex items-center justify-between gap-2 text-xs text-[#8FA3C8]">
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
