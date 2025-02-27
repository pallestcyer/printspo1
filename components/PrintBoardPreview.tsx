import React, { useEffect, useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import type { PrintSize, ScrapedImage } from '@/app/types';

interface DragItem {
  index: number;
  type: string;
}

// Remove unused Image interface if not used elsewhere
interface _Image {
  url: string;
  alt?: string;
  position?: { x: number; y: number; w: number; h: number };
  rotation?: number;
  cornerRounding: number;
}

interface PrintBoardPreviewProps {
  layout: {
    images: Array<{
      url: string;
      alt?: string;
      position: { x: number; y: number; w: number; h: number };
      rotation: number;
    }>;
    size: { width: number; height: number };
  };
  printSize: PrintSize;
  spacing: number;
  containMode: boolean;
  isPortrait: boolean;
  cornerRounding: number;
  onRemoveImage: (index: number) => void;
  onImageSwap: (sourceIndex: number, targetIndex: number) => void;
  _index: number;
  images: ScrapedImage[];
}

interface DraggableImageProps {
  image: {
    url: string;
    alt?: string;
    position?: { x: number; y: number; w: number; h: number };
    rotation?: number;
  };
  index: number;
  onDrop: (dragIndex: number, hoverIndex: number) => void;
  onRemove: (index: number) => void;
  cornerRounding: number;
  containMode: boolean;
}

// Custom hook for drag and drop functionality
const useDragDropImage = (index: number, onDrop: (dragIndex: number, dropIndex: number) => void) => {
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
};

// Separate component for draggable image
const DraggableImage = ({ image, index, onDrop, onRemove, cornerRounding, containMode }: DraggableImageProps) => {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag] = useDrag({
    type: 'IMAGE',
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [{ isOver }, drop] = useDrop({
    accept: 'IMAGE',
    hover(item: DragItem) {
      if (!ref.current) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;

      // Don't replace items with themselves
      if (dragIndex === hoverIndex) {
        return;
      }

      // Time to actually perform the action
      onDrop(dragIndex, hoverIndex);

      // Note: we're mutating the monitor item here!
      // Generally it's better to avoid mutations,
      // but it's good here for the sake of performance
      // to avoid expensive index searches.
      item.index = hoverIndex;
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  drag(drop(ref));

  return (
    <div
      ref={ref}
      className={`relative overflow-hidden group cursor-move ${isDragging ? 'opacity-50' : ''} ${isOver ? 'ring-2 ring-blue-400' : ''}`}
      style={{ 
        borderRadius: `${Math.min(cornerRounding * 2, 24)}px`
      }}
    >
      <img
        src={image.url}
        alt={image.alt || ''}
        className="absolute inset-0 w-full h-full object-center transition-transform duration-200 group-hover:scale-105"
        style={{
          objectFit: containMode ? 'contain' : 'cover'
        }}
      />
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove(index);
        }}
        className="absolute top-2 right-2 bg-white/90 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white z-10"
      >
        <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};

export function PrintBoardPreview({
  layout,
  printSize,
  spacing,
  containMode,
  isPortrait,
  cornerRounding,
  onRemoveImage,
  onImageSwap,
  _index,
  images
}: PrintBoardPreviewProps) {
  console.log('Preview Props:', {
    images,
    layout,
    containMode,
    isPortrait,
  });

  const handleDrop = (sourceIndex: number, targetIndex: number) => {
    onImageSwap(sourceIndex, targetIndex);
  };

  const _handleImageClick = (index: number): void => {
    onRemoveImage(index);
  };

  // Rename unused variables with underscore prefix
  const _aspectRatio = 1.5;

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
  const { cols, rows } = getGridConfig(layout?.images?.length || images.length);
  const displayImages = layout?.images || images;

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      // Do whatever you were trying to do with containerRef.current
      // For example, if you were trying to set a class:
      containerRef.current.classList.add('some-class');
    }
  }, []);

  return (
    <div className="flex justify-center">
      <div className="relative" style={{ width: `${width}px`, height: `${height}px` }}>
        <div 
          className="print-board-preview absolute inset-0 bg-white rounded-lg overflow-hidden border-2 border-gray-300"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gridTemplateRows: `repeat(${rows}, 1fr)`,
            gap: `${spacing}rem`,
            padding: `${spacing}rem`,
          }}
          ref={containerRef}
        >
          {displayImages.map((image, imageIndex) => (
            <DraggableImage
              key={`preview-${image.url}-${imageIndex}`}
              image={image}
              index={imageIndex}
              onDrop={handleDrop}
              onRemove={onRemoveImage}
              cornerRounding={cornerRounding}
              containMode={containMode}
            />
          ))}
        </div>
      </div>
    </div>
  );
} 