import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import type { ScrapedImage } from '@/app/types/index';

interface ImageSelectionSectionProps {
  images: any[];
  selectedIndices: number[];
  onSelect: (index: number) => void;
  onRemove: (index: number) => void;
  isMultiBoard: boolean;
  boardIndex: number;
}

export function ImageSelectionSection({ images, selectedIndices, onSelect, onRemove, isMultiBoard, boardIndex }: ImageSelectionSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const [isHoveringLeft, setIsHoveringLeft] = useState(false);
  const [isHoveringRight, setIsHoveringRight] = useState(false);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;

    const container = scrollRef.current;
    const scrollAmount = 432; // Three items (144px * 3)

    if (direction === 'left') {
      container.scrollBy({
        left: -scrollAmount,
        behavior: 'smooth'
      });
    } else {
      container.scrollBy({
        left: scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const handleScroll = () => {
    if (!scrollRef.current) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setShowLeftArrow(scrollLeft > 5);
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 5);
  };

  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (scrollElement) {
      handleScroll();
      scrollElement.addEventListener('scroll', handleScroll);
      window.addEventListener('resize', handleScroll);

      return () => {
        scrollElement.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', handleScroll);
      };
    }
  }, []);

  // Auto-scroll on hover
  useEffect(() => {
    let animationFrameId: number;
    const scrollSpeed = 2;

    const autoScroll = () => {
      if (!scrollRef.current) return;

      if (isHoveringLeft) {
        scrollRef.current.scrollLeft -= scrollSpeed;
      } else if (isHoveringRight) {
        scrollRef.current.scrollLeft += scrollSpeed;
      }

      animationFrameId = requestAnimationFrame(autoScroll);
    };

    if (isHoveringLeft || isHoveringRight) {
      animationFrameId = requestAnimationFrame(autoScroll);
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isHoveringLeft, isHoveringRight]);

  // Filter out already selected images
  const availableImages = images.filter((_, index) => !selectedIndices.includes(index));

  return (
    <div className="relative w-full max-w-full overflow-hidden">
      {showLeftArrow && (
        <div
          className="absolute left-0 top-0 bottom-0 w-16 z-10 flex items-center bg-gradient-to-r from-white/50 to-transparent"
          onMouseEnter={() => setIsHoveringLeft(true)}
          onMouseLeave={() => setIsHoveringLeft(false)}
        >
          <button
            onClick={() => scroll('left')}
            className="ml-2 bg-white/80 p-2 rounded-full shadow-lg hover:bg-white"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        </div>
      )}

      {showRightArrow && (
        <div
          className="absolute right-0 top-0 bottom-0 w-16 z-10 flex items-center justify-end bg-gradient-to-l from-white/50 to-transparent"
          onMouseEnter={() => setIsHoveringRight(true)}
          onMouseLeave={() => setIsHoveringRight(false)}
        >
          <button
            onClick={() => scroll('right')}
            className="mr-2 bg-white/80 p-2 rounded-full shadow-lg hover:bg-white"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      )}

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide py-4 px-2"
        style={{ 
          width: '100%',
          flexWrap: 'nowrap'
        }}
      >
        {availableImages.map((image, filteredIndex) => {
          // Find the original index in the full images array
          const originalIndex = images.findIndex(img => img.url === image.url);
          
          return (
            <div
              key={`${image.url}-${originalIndex}`}
              className="flex-none w-32 h-32 relative rounded-lg cursor-pointer transition-all duration-200 ease-in-out hover:scale-105 image-scroll-item"
              onClick={() => onSelect(originalIndex)}
            >
              <Image
                src={image.url}
                alt={image.alt || ''}
                fill
                className="object-cover rounded-lg"
                sizes="128px"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
} 