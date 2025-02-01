import React, { useState } from 'react';
import { CheckCircle2, Replace } from 'lucide-react';

interface Image {
  url: string;
  alt: string;
}

interface PhotoLayoutGridProps {
  scrapedImages: Image[];
  selectedIndices: number[];
  onSelectionChange: (newIndices: number[]) => void;
  gap: number;
  roundedness: number;
}

const layouts = [
  { id: 1, name: '2×2 Grid', cols: 2, aspectRatio: '1:1' },
  { id: 2, name: '3×4 Portrait', cols: 3, aspectRatio: '3/4' },
  { id: 3, name: 'Mixed Gallery', cols: 4, aspectRatio: 'auto' },
  { id: 4, name: 'Feature Layout', cols: 3, aspectRatio: 'feature' }
];

const PhotoLayoutGrid = ({
  scrapedImages,
  selectedIndices,
  onSelectionChange,
  gap,
  roundedness
}: PhotoLayoutGridProps) => {
  const [selectedLayout, setSelectedLayout] = useState(layouts[0]);
  const [replacingIndex, setReplacingIndex] = useState<number | null>(null);

  const handleLayoutChange = (layoutId: number) => {
    const layout = layouts.find((l) => l.id === layoutId);
    if (layout) setSelectedLayout(layout);
  };

  return (
    <div className="space-y-8">
      {/* Layout Selector */}
      <div className="flex gap-4 mb-4">
        {layouts.map((layout) => (
          <button
            key={layout.id}
            onClick={() => handleLayoutChange(layout.id)}
            className={`px-4 py-2 rounded-md border ${
              selectedLayout.id === layout.id ? 'bg-blue-500 text-white' : 'bg-gray-100'
            } hover:bg-blue-200`}
          >
            {layout.name}
          </button>
        ))}
      </div>

      {/* Layout Preview with Dynamic Gap and Roundedness */}
      <div
        className={`grid gap-${gap} ${
          selectedLayout.cols === 3 ? 'grid-cols-3' : `grid-cols-${selectedLayout.cols}`
        }`}
      >
        {selectedIndices.map((scrapedIndex, gridIndex) => {
          const image = scrapedImages[scrapedIndex];
          return (
            <div
              key={gridIndex}
              className={`relative overflow-hidden rounded-${roundedness} ${
                selectedLayout.aspectRatio === '3/4' ? 'aspect-[3/4]' : 'aspect-square'
              }`}
            >
              <img src={image.url} alt={image.alt} className="object-cover w-full h-full" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => setReplacingIndex(gridIndex)}
                  className="absolute top-4 right-4 p-2 bg-white/80 rounded-full hover:bg-white"
                >
                  <Replace className="w-5 h-5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Replacement dialog */}
      {replacingIndex !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Select Replacement</h3>
            <div className="grid grid-cols-3 gap-4">
              {scrapedImages.map((image, index) => (
                <div
                  key={index}
                  onClick={() => {
                    const newIndices = [...selectedIndices];
                    newIndices[replacingIndex] = index;
                    onSelectionChange(newIndices);
                    setReplacingIndex(null);
                  }}
                  className={`relative aspect-square cursor-pointer border-2 ${
                    selectedIndices.includes(index) ? 'border-blue-500' : 'border-transparent'
                  }`}
                >
                  <img
                    src={image.url}
                    alt={image.alt}
                    className="object-cover w-full h-full rounded-lg"
                  />
                  {selectedIndices.includes(index) && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <CheckCircle2 className="text-white w-6 h-6" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoLayoutGrid;
