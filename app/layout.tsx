import './globals.css'
import { Inter } from 'next/font/google'
import { Metadata } from 'next'
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Printspo - Pins to Prints',
  description: 'Create beautiful custom prints from your favorite images.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'),
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}