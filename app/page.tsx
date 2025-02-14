"use client";
import React from 'react';
import { MultiBoardPreview } from '@/components/MultiBoardPreview';
import Image from 'next/image';
import DragDropProvider from '@/components/DndProvider';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#F7F7F7] flex flex-col">
      <div className="container mx-auto px-4 py-4 sm:py-8 max-w-5xl flex-grow">
        {/* Logo and Header Section */}
        <header className="text-center mb-8 sm:mb-16">
          <div className="inline-flex flex-col items-center">
            <div className="w-32 h-32 sm:w-40 sm:h-40 mb-6 sm:mb-8">
              <Image
                src="/PrintspoType.svg"
                alt="Printspo Logo"
                width={160}
                height={160}
                priority
                className="w-full h-full"
                style={{ color: '#4D4D4D' }}
              />
            </div>
            <div className="relative">
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-[#4D4D4D] mb-4 sm:mb-5 font-serif tracking-wide px-2">
                <span className="font-[700]">Pins</span>{' '}
                <span className="font-[200] italic">to</span>{' '}
                <span className="font-[700]">Prints</span>{' '}<br />
                <span className="font-[600] italic text-[#D4A5A5]">– Instantly</span>
              </h1>
              <div className="absolute -top-8 -right-8 sm:-top-10 sm:-right-16 w-14 sm:w-auto">
                <Image
                  src="/CraftedInCanada.svg"
                  alt="Crafted in Canada"
                  width={70}
                  height={70}
                  className="w-full h-auto"
                />
              </div>
            </div>
            <p className="text-xl sm:text-2xl md:text-3xl text-[#4D4D4D] max-w-2xl font-sans font-light px-4">
              Turn Pinterest boards into high-quality prints.
            </p>
            <p className="text-sm sm:text-md text-[#B3B3B3] mt-2 sm:mt-3 font-light px-4">
              Delivery within 2-3 Business Days Canada-Wide
            </p>
          </div>
        </header>

        <main className="mt-18">
          <DragDropProvider>
            <div>
              <MultiBoardPreview scrapedImages={[]} selectedBoards={[]} onBoardsChange={() => {}} />
            </div>
          </DragDropProvider>
        </main>
      </div>
      
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
              <a href="/privacy" className="text-sm text-[#B3B3B3] hover:text-[#D4A5A5] transition-colors">
                Privacy
              </a>
              <a href="/terms" className="text-sm text-[#B3B3B3] hover:text-[#D4A5A5] transition-colors">
                Terms
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
