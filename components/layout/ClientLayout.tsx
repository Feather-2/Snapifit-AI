'use client'

import type React from "react"
import { MainNav } from "@/components/main-nav"
import { Toaster } from "@/components/ui/toaster"
import MaintenanceCheck from "@/components/security/MaintenanceCheck"

interface ClientLayoutProps {
  children: React.ReactNode
  locale: string
}

export function ClientLayout({ children, locale }: ClientLayoutProps) {
  return (
    <MaintenanceCheck
      excludePaths={[`/${locale}/admin`, `/${locale}/maintenance`]}
      locale={locale}
    >
      {children}
    </MaintenanceCheck>
  )
}
