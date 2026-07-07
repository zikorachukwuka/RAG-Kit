import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Nigeria Compliance AI — Built with RAG Kit',
  description:
    'Ask questions about Nigerian PAYE, Pension, NHF, NSITF, and WHT obligations. Powered by RAG Kit — a copy-paste RAG system for Next.js.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  )
}
