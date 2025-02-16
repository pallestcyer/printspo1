import React from 'react';
import type { Layout } from '@/app/types';
import type { PrintSize } from '@/app/types/order';

interface DragItem {
  type: string;
  index: number;
}

interface PrintBoardPreviewProps {
  _layout: Layout | null;
  printSize: PrintSize;
  spacing: number;
  containMode: boolean;
  isPortrait: boolean;
  onRemoveImage: (index: number) => void;
  _onReorderImages?: (newOrder: number[]) => void;
  cornerRounding: number;
  _onImageSwap: (sourceIndex: number, targetIndex: number) => void;
  _index: number;
  images: Array<{
    url: string;
    alt?: string;
    position?: { x: number; y: number; w: number; h: number };
    rotation?: number;
  }>;
}

export function PrintBoardPreview({
  _layout,
  printSize,
  spacing,
  containMode,
  isPortrait,
  onRemoveImage,
  _onReorderImages,
  cornerRounding,
  _onImageSwap,
  _index,
  images
}: PrintBoardPreviewProps): JSX.Element {
  const getGridConfig = (imageCount: number): { cols: number; rows: number } => {
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

  const getDisplayDimensions = (): { width: number; height: number } => {
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

  const _handleImageClick = (index: number): void => {
    onRemoveImage(index);
  };

  const _handleDrop = (_item: DragItem, _targetIndex: number): void => {
    // Implementation
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
            <div className="print-board-preview absolute inset-0 bg-[#F7F7F7] rounded-lg overflow-hidden border border-gray-200"
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${cols}, 1fr)`,
                gridTemplateRows: `repeat(${rows}, 1fr)`,
                gap: `${spacing}rem`,
                padding: `${spacing}rem`,
              }}
            >
              {images.map((image, imageIndex) => (
                <div
                  key={`preview-${image.url}-${imageIndex}`}
                  className="image-container group relative overflow-hidden"
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
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 