"use client";
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function Terms() {
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
            <span className="font-[200] italic">Terms of</span>{' '}
            <span className="font-[700]">Service</span>
          </h1>
        </header>

        {/* Content */}
        <main className="max-w-3xl mx-auto">
          <div className="bg-white rounded-xl p-8 space-y-8">
            <section>
              <h2 className="text-2xl text-[#4D4D4D] mb-4 font-serif">
                <i>How It</i> <b>Works</b>
              </h2>
              <p className="text-[#4D4D4D] font-light">
                We turn Pinterest board content into physical prints shipped across Canada in 2-3 business days (sometimes longer for remote areas).
              </p>
            </section>

            <section>
              <h2 className="text-2xl text-[#4D4D4D] mb-4 font-serif">
                <i>Your</i> <b>Promises</b>
              </h2>
              <p className="text-[#4D4D4D] mb-2 font-light">You agree to:</p>
              <ul className="space-y-2 text-[#4D4D4D] font-light list-disc pl-5">
                <li>Only print content you own or have explicit rights to use</li>
                <li>Provide accurate shipping info (we're not responsible for wrong addresses!)</li>
                <li>Understand this is a passion project - we'll do our best, but can't guarantee perfection</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl text-[#4D4D4D] mb-4 font-serif">
                <i>Copyright</i> <b>Smarts</b>
              </h2>
              <ul className="space-y-2 text-[#4D4D4D] font-light list-disc pl-5">
                <li>You must have permission for any artwork/photos you print</li>
                <li>We may refuse orders that seem to violate copyrights</li>
                <li>We adapt content formatting for printing purposes but don't claim ownership</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl text-[#4D4D4D] mb-4 font-serif">
                <i>Realistic</i> <b>Expectations</b>
              </h2>
              <ul className="space-y-2 text-[#4D4D4D] font-light list-disc pl-5">
                <li>Colors/textures may differ slightly from screen to print</li>
                <li>Insurance covers lost/damaged mail (we'll help file claims)</li>
                <li>Maximum refund = what you paid if we make a mistake</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl text-[#4D4D4D] mb-4 font-serif">
                <i>Changes &</i> <b>Quirks</b>
              </h2>
              <ul className="space-y-2 text-[#4D4D4D] font-light list-disc pl-5">
                <li>We might update these terms as we grow</li>
                <li>This is governed by Canadian law</li>
                <li>No corporate guarantees - just a human trying to make cool stuff!</li>
              </ul>
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