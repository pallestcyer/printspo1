import { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import type { ScrapedImage } from '@/app/types/index';

interface ImageSelectionSectionProps {
  images: ScrapedImage[];
  selectedIndices: number[];
  onSelect: (index: number) => void;
}

export function ImageSelectionSection({ images, selectedIndices, onSelect }: ImageSelectionSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    
    const scrollAmount = 300; // Adjust this value to control scroll distance
    const newScrollLeft = scrollRef.current.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount);
    
    scrollRef.current.scrollTo({
      left: newScrollLeft,
      behavior: 'smooth'
    });
  };

  const handleScroll = () => {
    if (!scrollRef.current) return;
    
    setShowLeftArrow(scrollRef.current.scrollLeft > 0);
    setShowRightArrow(
      scrollRef.current.scrollLeft < 
      scrollRef.current.scrollWidth - scrollRef.current.clientWidth
    );
  };

  return (
    <div className="relative w-full max-w-full overflow-hidden">
      {showLeftArrow && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-white/80 p-2 rounded-full shadow-lg hover:bg-white"
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {showRightArrow && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-white/80 p-2 rounded-full shadow-lg hover:bg-white"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex gap-4 overflow-x-auto scrollbar-hide py-4 px-2"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {images.map((image, index) => (
          <div
            key={`${image.url}-${index}`}
            className={`
              flex-none w-32 h-32 relative rounded-lg cursor-pointer
              transition-all duration-200 ease-in-out
              ${selectedIndices.includes(index) ? 'ring-4 ring-blue-500 scale-95' : 'hover:scale-105'}
            `}
            style={{ scrollSnapAlign: 'start' }}
            onClick={() => onSelect(index)}
          >
            <Image
              src={image.url}
              alt={image.alt || ''}
              fill
              className="object-cover rounded-lg"
              sizes="128px"
            />
            {selectedIndices.includes(index) && (
              <div className="absolute inset-0 bg-blue-500/20 rounded-lg" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
} 