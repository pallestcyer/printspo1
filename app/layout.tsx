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
  metadataBase: new URL(process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'),
  title: 'Printspo',
  description: 'Create beautiful print layouts from your Pinterest boards',
  icons: {
    icon: [
      {
        url: '/favicon.ico',
        sizes: '32x32',
        type: 'image/x-icon',
      },
      {
        url: '/icon.png',
        sizes: '192x192',
        type: 'image/png',
      },
    ],
    apple: [
      {
        url: '/apple-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  },
  manifest: '/site.webmanifest',
  themeColor: '#D4A5A5',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Printspo',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1
  },
  openGraph: {
    type: 'website',
    locale: 'en_CA',
    url: 'https://printspo.com',
    title: 'Printspo - Turn Pinterest Boards into High-Quality Prints',
    description: 'Create beautiful prints from your Pinterest boards instantly. Perfect for mood boards, presentations, and inspiration walls.',
    siteName: 'Printspo',
  },
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