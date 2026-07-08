import type { Metadata } from 'next'
import { Fraunces } from 'next/font/google'
import './globals.css'

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Nigerian HR Compliance AI',
  description:
    'Ask questions about Nigerian PAYE, Pension, NHF, NSITF, and WHT obligations. Powered by RAG Kit.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fraunces.variable}>
      <body className="antialiased">{children}</body>
    </html>
  )
}
