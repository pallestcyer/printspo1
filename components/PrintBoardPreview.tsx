import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { PrintSize } from '@/app/types/order';

interface PrintBoardPreviewProps {
  layout: {
    images: {
      url: string;
      alt?: string;
      position: { x: number; y: number; w: number; h: number };
      rotation: number;
    }[];
  };
  printSize: PrintSize;
  spacing: number;
  containMode: boolean;
}

export function PrintBoardPreview({ layout, printSize, spacing, containMode }: PrintBoardPreviewProps) {
  const calculateGridLayout = () => {
    const imageCount = layout.images.length;
    switch (imageCount) {
      case 1: return 'grid-cols-1';
      case 2: return 'grid-cols-2';
      case 3: return 'grid-cols-3';
      case 4: return 'grid-cols-2';
      default: return 'grid-cols-3';
    }
  };

  const calculateImageStyle = (index: number) => {
    const imageCount = layout.images.length;
    
    if (imageCount === 5 && index === 0) {
      return {
        gridColumn: 'span 2',
        aspectRatio: '2/1'
      };
    }
    
    if (imageCount === 7 && index === 0) {
      return {
        gridColumn: 'span 2',
        gridRow: 'span 2',
        aspectRatio: '1'
      };
    }

    return {
      aspectRatio: '1'
    };
  };

  return (
    <div className="print-board-container">
      <div 
        className="relative w-full mx-auto bg-white"
        style={{
          aspectRatio: `${printSize.width}/${printSize.height}`,
          maxWidth: 'min(800px, 90vw)',
          border: '1px solid #e5e7eb',
        }}
      >
        <div 
          className={`grid h-full w-full ${calculateGridLayout()}`}
          style={{ 
            gap: `${spacing}rem`,
            padding: '1rem',
            height: '100%',
            width: '100%',
          }}
        >
          {layout.images.map((image, index) => (
            <div
              key={index}
              className="relative w-full h-full"
              style={{
                aspectRatio: '0.67',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <img
                src={image.url}
                alt={image.alt || ''}
                className={`w-full h-full transition-all duration-200`}
                style={{
                  objectFit: containMode ? 'contain' : 'cover',
                  backgroundColor: containMode ? 'white' : 'transparent'
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 