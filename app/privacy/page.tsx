"use client";
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-[#F7F7F7] flex flex-col">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <header className="text-center mb-12">
          <Link href="/" className="inline-block">
            <Image
              src="/PrintspoType.svg"
              alt="Printspo Logo"
              width={120}
              height={120}
              priority
              className="mb-6"
            />
          </Link>
          <h1 className="text-4xl text-[#4D4D4D] font-serif">
            <span className="font-[200] italic">Our</span>{' '}
            <span className="font-[700]">Privacy Policy</span>
          </h1>
        </header>

        {/* Content */}
        <main className="max-w-3xl mx-auto">
          <div className="bg-white rounded-xl p-8 space-y-8">
            <section>
              <h2 className="text-2xl text-[#4D4D4D] mb-4 font-serif">
                <i>What We</i> <b>Collect</b>
              </h2>
              <ul className="space-y-2 text-[#4D4D4D] font-light">
                <li>Links to your Pinterest boards and the specific content you select for printing</li>
                <li>Your contact/shipping details and order preferences</li>
                <li>Payment information (handled securely by our payment partner)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl text-[#4D4D4D] mb-4 font-serif">
                <i>Why We</i> <b>Need This</b>
              </h2>
              <ul className="space-y-2 text-[#4D4D4D] font-light">
                <li>To create and ship your custom prints</li>
                <li>To update you on order progress</li>
                <li>To improve our printing service over time</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl text-[#4D4D4D] mb-4 font-serif">
                <i>Sharing</i> <b>Info</b>
              </h2>
              <p className="text-[#4D4D4D] mb-2 font-light">We only share what's absolutely necessary:</p>
              <ul className="space-y-2 text-[#4D4D4D] font-light">
                <li>With delivery companies to get your order to you</li>
                <li>With our payment processor to complete transactions</li>
                <li>If legally required (like a court order)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl text-[#4D4D4D] mb-4 font-serif">
                <i>Your Stuff</i> <b>Stays Yours</b>
              </h2>
              <ul className="space-y-2 text-[#4D4D4D] font-light">
                <li>We don't store payment details after processing</li>
                <li>You can ask us what data we have about you</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl text-[#4D4D4D] mb-4 font-serif">
                <i>About</i> <b>Security</b>
              </h2>
              <p className="text-[#4D4D4D] font-light">
                We use standard protections for small businesses, but remind you that no online service is completely risk-free.
              </p>
            </section>
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="w-full mt-16">
        <div className="container mt-18 px-4 py-8 max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Image
                src="/PrintspoType.svg"
                alt="Printspo"
                width={80}
                height={80}
                className="opacity-50"
              />
              <span className="font-light text-sm text-[#B3B3B3]">
                © {new Date().getFullYear()} Printspo
              </span>
            </div>
            
            <div className="flex gap-12 font-light">
              <a href="mailto:support@printspo.ca" className="text-sm text-[#B3B3B3] hover:text-[#D4A5A5] transition-colors">
                Contact
              </a>
              <Link href="/privacy" className="text-sm text-[#B3B3B3] hover:text-[#D4A5A5] transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="text-sm text-[#B3B3B3] hover:text-[#D4A5A5] transition-colors">
                Terms
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
} 