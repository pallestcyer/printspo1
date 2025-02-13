"use client";
import React from 'react';
import { MultiBoardPreview } from '@/components/MultiBoardPreview';
import Image from 'next/image';
import DragDropProvider from '@/components/DndProvider';
import { PrintBoardPreview } from '@/components/PrintBoardPreview';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 pt-24 pb-6 max-w-5xl">
        {/* Logo and Header Section */}
        <header className="text-center mb-8">
          <div className="w-48 h-48 mx-auto mb-4">
            <Image
              src="/PrintspoType.svg"
              alt="Printspo Logo"
              width={192}
              height={192}
              priority
              className="text-[#2C2C2C]"
            />
          </div>
          <h1 className="text-3xl font-bold text-[#2C2C2C] mb-2">
            From Pins to Prints – Instantly
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Turn Pinterest boards into high-quality prints for mood boards, presentations, and inspiration walls.
          </p>
        </header>

        <main>
          <DragDropProvider>
            <div>
              <MultiBoardPreview scrapedImages={[]} selectedBoards={[]} onBoardsChange={() => {}} />
            </div>
          </DragDropProvider>
        </main>
      </div>
    </div>
  );
}
