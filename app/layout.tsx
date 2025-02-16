import './globals.css'
import { Inter, Taviraj } from 'next/font/google'
import type { Metadata } from 'next'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const taviraj = Taviraj({
  weight: ['100', '200', '300', '400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-taviraj',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Printspo - Turn Pinterest Boards into High-Quality Prints',
  description: 'Create beautiful prints from your Pinterest boards instantly. Perfect for mood boards, presentations, and inspiration walls.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${taviraj.variable}`}>
      <body>{children}</body>
    </html>
  );
}