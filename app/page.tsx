"use client";
import React, { useState } from 'react';
import MultiBoardPreview from '@/components/MultiBoardPreview';
import Image from 'next/image';
import DragDropProvider from '@/components/DndProvider';
import { Board } from '@/app/types/board';

interface _ScrapedImage {
  url: string;
  alt?: string;
}

export default function Home() {
  const [isMultiMode, setIsMultiMode] = useState(false);
  const [boards, setBoards] = useState<Board[]>([{
    id: '1',
    layout: {
      images: []
    },
    printSize: {
      width: 24,
      height: 36,
      name: '24x36',
      price: 99.99
    },
    spacing: 0,
    selectedIndices: [],
    containMode: false,
    cornerRounding: 0,
    isPortrait: true
  }]);
  function convertToBoard(boardState: Board[]): Board[] {
    return boardState.map(board => ({
      id: board.id,
      layout: {
        images: board.layout.images.map(img => ({
          url: img.url,
          position: img.position || { x: 0, y: 0, w: 1, h: 1 },
          rotation: img.rotation || 0
        }))
      },
      printSize: board.printSize,
      spacing: board.spacing || 0,
      selectedIndices: board.selectedIndices || [],
      containMode: board.containMode || false,
      cornerRounding: board.cornerRounding || 0,
      isPortrait: board.isPortrait || true
    }));
  }

  return (
    <div className="bg-[#F7F7F7] h-auto">
      <div className="container mx-auto px-4 py-4 max-w-5xl">
        <header className="text-center mb-4">
          <div className="inline-flex flex-col items-center">
            <div className="w-24 h-24 mb-12">
              <Image
                src="/PrintspoType.svg"
                alt="Printspo Logo"
                width={128}
                height={128}
                priority
                className="w-full h-full"
                style={{ color: '#4D4D4D' }}
              />
            </div>
            <div className="relative">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl text-[#4D4D4D] mb-2 font-serif tracking-wide px-2">
                <span className="font-[700] italic">Pins</span>{' '}
                <span className="font-[200] italic">to</span>{' '}
                <span className="font-[700] italic">Prints</span>{' '}<br />
                <span className="font-[600] text-[#D4A5A5]">– Instantly.</span>
              </h1>
              <div className="absolute -top-6 -right-4 sm:-top-8 sm:-right-12 w-12 sm:w-14">
                <Image
                  src="/CraftedInCanada.svg"
                  alt="Crafted in Canada"
                  width={56}
                  height={56}
                  className="w-full h-auto"
                  style={{ color: '#2C2C2C' }}
                />
              </div>
            </div>
            <p className="text-lg sm:text-xl md:text-2xl text-[#4D4D4D] max-w-2xl font-sans font-light px-4 mb-1">
              Turn Pinterest boards into high-quality prints.
            </p>
            <p className="text-sm sm:text-base text-gray-400 font-light">
              Delivery within 3 business days Canada-wide.
            </p>
          </div>
        </header>

        <main>
          <DragDropProvider>
            <div>
              <MultiBoardPreview 
                isMultiMode={isMultiMode}
                onMultiModeChange={setIsMultiMode}
                _selectedBoards={convertToBoard(boards)}
                _onBoardsChange={setBoards}
              />
            </div>
          </DragDropProvider>
        </main>
      </div>
      
      <footer className="w-full mt-auto">
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
