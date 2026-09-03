'use client'

import React from 'react'
import { RoleGuard } from '@/components/role-guard'

export default function OrganizerLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard requiredRole="organizer">{children}</RoleGuard>
}
