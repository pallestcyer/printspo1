import React, { useState, useEffect } from 'react';
import PhotoLayoutGrid from './PhotoLayoutGrid';
import type { PrintSize } from '@/app/types/order';
import type { ScrapedImage } from '@/app/types/index';

const ParentComponent = () => {
  const [cornerRounding, setCornerRounding] = useState(0); // Initial corner rounding value
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [scrapedImages, setScrapedImages] = useState<ScrapedImage[]>([]); // State to hold images
  const selectedSize: PrintSize = {
    width: 8.5,
    height: 11,
    price: 5,
    name: "8.5x11"
  }; // Example size

  const handleCornerRoundingChange = (rounding: number) => {
    setCornerRounding(rounding);
  };

  const handleSelectionChange = (indices: number[]) => {
    setSelectedIndices(indices);
  };

  const handleCheckout = async () => {
    // Implement checkout logic
  };

  useEffect(() => {
    // Fetch images from the specific container
    const container = document.querySelector('.XiG[data-test-id="board-feed"]');
    if (container) {
      const images = Array.from(container.querySelectorAll('img')).map(img => ({
        url: img.src,
        alt: img.alt || '',
        width: img.width,
        height: img.height
      }));
      setScrapedImages(images);
    }
  }, []); // Run once on component mount

  return (
    <PhotoLayoutGrid
      scrapedImages={scrapedImages}
      selectedIndices={selectedIndices}
      onSelectionChange={handleSelectionChange}
      selectedSize={selectedSize}
      onCheckout={handleCheckout}
      gapSpacing={16}
      onGapChange={() => {}}
      cornerRounding={cornerRounding}
      onCornerRoundingChange={handleCornerRoundingChange}
    />
  );
};

export default ParentComponent; 