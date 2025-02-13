import React, { useState } from 'react';
import type { Layout } from '@/app/types';
import type { PrintSize } from '@/app/types/order';
import { useDrag, useDrop } from 'react-dnd';

interface Image {
  url: string;
  alt?: string;
  position?: { x: number; y: number; w: number; h: number };
  rotation?: number;
  cornerRounding: number;
}

interface PrintBoardPreviewProps {
  layout: Layout | null;
  printSize: PrintSize;
  spacing: number;
  containMode: boolean;
  isPortrait: boolean;
  onRemoveImage: (index: number) => void;
  onReorderImages?: (newOrder: number[]) => void;
  cornerRounding: number;
  onImageSwap: (sourceIndex: number, targetIndex: number) => void;
  index: number;
  images: Array<{
    url: string;
    alt?: string;
    position?: { x: number; y: number; w: number; h: number };
    rotation?: number;
  }>;
}

interface DragItem {
  index: number;
  type: string;
}

// Custom hook for drag and drop functionality
function useDragDropImage(index: number, onDrop: (dragIndex: number, dropIndex: number) => void) {
  const [{ isDragging }, drag] = useDrag({
    type: 'BOARD_IMAGE',
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  });

  const [{ isOver }, drop] = useDrop({
    accept: 'BOARD_IMAGE',
    drop: (item: { index: number }) => {
      onDrop(item.index, index);
    },
    collect: monitor => ({
      isOver: !!monitor.isOver()
    })
  });

  return { isDragging, isOver, drag, drop };
}

export const PrintBoardPreview: React.FC<PrintBoardPreviewProps> = ({
  images,
  layout,
  printSize,
  spacing,
  containMode,
  isPortrait,
  onRemoveImage,
  onReorderImages,
  cornerRounding,
  onImageSwap,
  index
}) => {
  console.log('Preview Props:', {
    images,
    layout,
    containMode,
    isPortrait,
  });

  const handleDrop = (dragIndex: number, dropIndex: number) => {
    if (dragIndex !== dropIndex) {
      onImageSwap(dragIndex, dropIndex);
    }
  };

  // Create drag handlers directly
  const dragDrop0 = useDrag({
    type: 'BOARD_IMAGE',
    item: { index: 0 },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  })[0];

  const dragDrop1 = useDrag({
    type: 'BOARD_IMAGE',
    item: { index: 1 },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  })[0];

  // ... repeat for indices 2-8 ...

  // Create drop handlers directly
  const dropDrop0 = useDrop({
    accept: 'BOARD_IMAGE',
    drop: (item: { index: number }) => handleDrop(item.index, 0),
    collect: monitor => ({
      isOver: !!monitor.isOver()
    })
  })[0];

  const dropDrop1 = useDrop({
    accept: 'BOARD_IMAGE',
    drop: (item: { index: number }) => handleDrop(item.index, 1),
    collect: monitor => ({
      isOver: !!monitor.isOver()
    })
  })[0];

  // ... repeat for indices 2-8 ...

  const dragDropHandlers = [
    { isDragging: dragDrop0.isDragging, isOver: dropDrop0.isOver },
    { isDragging: dragDrop1.isDragging, isOver: dropDrop1.isOver },
    // ... add handlers for indices 2-8
  ];

  // Calculate aspect ratio based on print size and orientation
  const aspectRatio = isPortrait 
    ? `${printSize.width}/${printSize.height}`
    : `${printSize.height}/${printSize.width}`;

  const getGridConfig = (imageCount: number) => {
    switch (imageCount) {
      case 1: return { cols: 1, rows: 1 };
      case 2: return { cols: 2, rows: 1 };
      case 3: return { cols: 3, rows: 1 };
      case 4: return { cols: 2, rows: 2 };
      default: {
        const cols = Math.ceil(Math.sqrt(imageCount));
        const rows = Math.ceil(imageCount / cols);
        return { cols, rows };
      }
    }
  };

  // Define the getDisplayDimensions function
  const getDisplayDimensions = () => {
    const maxWidth = isPortrait ? 500 : 700;
    const maxHeight = isPortrait ? 700 : 500;

    const printAspectRatio = isPortrait 
      ? printSize.height / printSize.width 
      : printSize.width / printSize.height;

    let width, height;
    if (printAspectRatio > maxHeight / maxWidth) {
      height = maxHeight;
      width = height / printAspectRatio;
    } else {
      width = maxWidth;
      height = width * printAspectRatio;
    }

    return { width, height };
  };

  const { width, height } = getDisplayDimensions();
  const { cols, rows } = getGridConfig(images.length);

  return (
    <div>
      <div className="space-y-4">
        <div className="text-center text-sm text-gray-600 mb-2">
          Print Size: {printSize.width}" × {printSize.height}"
        </div>
        <div className="flex justify-center">
          <div className="relative" style={{ width: `${width}px`, height: `${height}px` }}>
            <div className="print-board-preview absolute inset-0 bg-white rounded-lg overflow-hidden border-2 border-gray-300"
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${cols}, 1fr)`,
                gridTemplateRows: `repeat(${rows}, 1fr)`,
                gap: `${spacing}rem`,
                padding: `${spacing}rem`,
              }}
            >
              {images.map((image, imageIndex) => {
                const { isDragging, isOver } = dragDropHandlers[imageIndex];

                return (
                  <div
                    key={`preview-${image.url}-${imageIndex}`}
                    className={`image-container group relative overflow-hidden
                      ${isDragging ? 'opacity-50' : ''}
                      ${isOver ? 'border-2 border-blue-500' : ''}
                    `}
                    style={{ 
                      borderRadius: `${Math.min(cornerRounding * 2, 24)}px`,
                      overflow: 'hidden'
                    }}
                  >
                    <img
                      src={image.url}
                      alt={image.alt || ''}
                      className="absolute inset-0 w-full h-full transition-transform duration-200 group-hover:scale-105 cursor-move"
                      style={{
                        objectFit: containMode ? 'contain' : 'cover',
                        transform: `rotate(${image.rotation || 0}deg)`,
                        backgroundColor: 'white',
                        borderRadius: `${Math.min(cornerRounding * 2, 24)}px`
                      }}
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveImage(imageIndex);
                      }}
                      className="absolute top-2 right-2 bg-white/90 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white z-10"
                    >
                      <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    
                    <div className="absolute top-2 left-2 bg-white/90 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9h8M8 15h8" />
                      </svg>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 