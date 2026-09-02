'use client'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Menu, X } from 'lucide-react'
import { ThemeSelect } from '@/components/theme-select'
import { ClusterUiSelect } from './cluster/cluster-ui'
import { WalletButton } from '@/components/solana/solana-provider'

export function AppHeader({ links = [] }: { links: { label: string; path: string }[] }) {
  const pathname = usePathname()
  const [showMenu, setShowMenu] = useState(false)

  function isActive(path: string) {
    return path === '/' ? pathname === '/' : pathname.startsWith(path)
  }

  return (
    <header className="relative z-50 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-100/80 dark:bg-neutral-900/80 backdrop-blur-md px-4 sm:px-6 lg:px-8 py-2.5 dark:text-neutral-300">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex items-center gap-6">
          <Link className="text-lg sm:text-xl font-bold tracking-tight text-neutral-900 dark:text-white hover:opacity-80 transition" href="/">
            <span>EventAttendanceNft</span>
          </Link>
          <div className="hidden md:flex items-center">
            <ul className="flex gap-4 flex-nowrap items-center text-sm font-medium">
              {links.map(({ label, path }) => (
                <li key={path}>
                  <Link
                    className={`hover:text-neutral-900 dark:hover:text-white transition ${isActive(path) ? 'text-neutral-900 dark:text-white font-semibold' : 'text-neutral-500 dark:text-neutral-400'}`}
                    href={path}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <Button variant="ghost" size="icon" className="md:hidden text-neutral-700 dark:text-neutral-300" onClick={() => setShowMenu(!showMenu)}>
          {showMenu ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>

        <div className="hidden md:flex items-center gap-3">
          <WalletButton />
          <ClusterUiSelect />
          <ThemeSelect />
        </div>

        {showMenu && (
          <div className="md:hidden fixed inset-x-0 top-[53px] bottom-0 bg-neutral-950/95 backdrop-blur-md z-50 p-4 overflow-y-auto">
            <div className="flex flex-col gap-6 p-2">
              <ul className="flex flex-col gap-3 border-b border-neutral-800 pb-4">
                {links.map(({ label, path }) => (
                  <li key={path}>
                    <Link
                      className={`block text-base font-medium py-2 ${isActive(path) ? 'text-white font-bold' : 'text-neutral-400 hover:text-white'}`}
                      href={path}
                      onClick={() => setShowMenu(false)}
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="flex flex-col gap-3 items-stretch w-full overflow-hidden">
                <div className="w-full overflow-hidden flex justify-center">
                  <WalletButton />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-neutral-400">Cluster:</span>
                  <ClusterUiSelect />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-neutral-400">Theme:</span>
                  <ThemeSelect />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
