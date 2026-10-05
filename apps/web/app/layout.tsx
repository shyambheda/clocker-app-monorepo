import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { appName } from '@/lib/app-config'
import './globals.css'

export const metadata: Metadata = {
  title: appName,
  description: appName,
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
