import React from 'react'

export function AppFooter() {
  return (
    <footer className="border-t border-[#E5E7EB] bg-white py-4 text-center text-xs text-[#6B7280]">
      <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[#111827]">NFTicket</span>
          <span>• Verifiable Event Credentials on Solana</span>
        </div>
        <div className="text-[11px] text-[#9CA3AF]">
          Powered by Solana Devnet & Phantom
        </div>
      </div>
    </footer>
  )
}
