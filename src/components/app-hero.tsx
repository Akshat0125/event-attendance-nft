import React from 'react'

export function AppHero({
  children,
  subtitle,
  title,
}: {
  children?: React.ReactNode
  subtitle?: React.ReactNode
  title?: React.ReactNode
}) {
  return (
    <div className="flex flex-row justify-center py-6 md:py-12 px-4">
      <div className="text-center w-full">
        <div className="max-w-2xl mx-auto space-y-4">
          {typeof title === 'string' ? <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold break-words">{title}</h1> : title}
          {typeof subtitle === 'string' ? <p className="text-sm sm:text-base text-neutral-400 py-2 sm:py-4">{subtitle}</p> : subtitle}
          {children}
        </div>
      </div>
    </div>
  )
}
