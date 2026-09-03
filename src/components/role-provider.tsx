'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

export type UserRole = 'organizer' | 'attendee' | null

interface RoleContextType {
  role: UserRole
  setRole: (role: UserRole) => void
  switchRole: () => void
  isRoleLoaded: boolean
}

const RoleContext = createContext<RoleContextType>({
  role: null,
  setRole: () => {},
  switchRole: () => {},
  isRoleLoaded: false,
})

const STORAGE_KEY = 'nfticket_user_role'

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<UserRole>(null)
  const [isRoleLoaded, setIsRoleLoaded] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as UserRole
      if (saved === 'organizer' || saved === 'attendee') {
        setRoleState(saved)
      }
    } catch (e) {
      console.error('Failed to load role from localStorage:', e)
    } finally {
      setIsRoleLoaded(true)
    }
  }, [])

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole)
    try {
      if (newRole) {
        localStorage.setItem(STORAGE_KEY, newRole)
      } else {
        localStorage.removeItem(STORAGE_KEY)
      }
    } catch (e) {
      console.error('Failed to save role to localStorage:', e)
    }
  }

  const switchRole = () => {
    if (role === 'organizer') {
      setRole('attendee')
    } else if (role === 'attendee') {
      setRole('organizer')
    } else {
      setRole('organizer')
    }
  }

  return (
    <RoleContext.Provider value={{ role, setRole, switchRole, isRoleLoaded }}>
      {children}
    </RoleContext.Provider>
  )
}

export function useRole() {
  return useContext(RoleContext)
}
