import './globals.css'
import { Inter, Taviraj } from 'next/font/google'
import { Metadata } from 'next'
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const taviraj = Taviraj({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-taviraj',
  weight: ['100', '200', '300', '400', '500', '600', '700', '800'],
  style: ['normal', 'italic'],
});

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
    <html lang="en" className={`${inter.variable} ${taviraj.variable}`}>
      <body className={inter.className}>{children}</body>
    </html>
  );
}