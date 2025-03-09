import React, { useState } from 'react';
import MultiBoardPreview from '@/components/MultiBoardPreview';
import Image from 'next/image';
import DragDropProvider from '@/components/DndProvider';
import { PRINT_SIZES } from '@/lib/constants';
import type { Board } from '@/app/types/board';

const ParentComponent = () => {
  const [isMultiBoard, setIsMultiBoard] = useState(false);
  const [boards, setBoards] = useState<Board[]>([{
    id: Date.now().toString(),
    boardUrl: '',
    name: '',
    layout: {
      images: []
    },
    printSize: {
      width: PRINT_SIZES[0].width,
      height: PRINT_SIZES[0].height,
      name: PRINT_SIZES[0].name,
      price: PRINT_SIZES[0].price
    },
    spacing: 0.5,
    cornerRounding: 0,
    selectedIndices: [],
    containMode: false,
    isPortrait: true,
    scrapedImages: []
  }]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="container mx-auto px-4 py-4 max-w-5xl">
        {/* Multi-board toggle in top right */}
        <div className="absolute top-4 right-4">
          <button
            onClick={() => setIsMultiBoard(!isMultiBoard)}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              isMultiBoard ? 'bg-[#D4A5A5] text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            {isMultiBoard ? 'Multi-Board Mode' : 'Single Board'}
          </button>
        </div>

        {/* Logo and Header Section */}
        <header className="text-center mb-6">
          <div className="w-32 h-32 mx-auto mb-4">
            <Image
              src="/PrintspoType.svg"
              alt="Printspo Logo"
              width={128}
              height={128}
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
            <MultiBoardPreview 
              isMultiMode={isMultiBoard}
              onMultiModeChange={setIsMultiBoard}
              _selectedBoards={boards}
              _onBoardsChange={setBoards}
            />
          </DragDropProvider>
        </main>
      </div>
    </div>
  );
};

export default ParentComponent; 