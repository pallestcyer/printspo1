import React from 'react';

interface ImageReplaceModalProps {
  scrapedImages: Array<{ url: string; alt?: string }>;
  selectedIndices: number[];
  onSelect: (index: number) => void;
  onClose: () => void;
}

export function ImageReplaceModal({
  scrapedImages,
  onSelect,
  onClose,
  selectedIndices
}: ImageReplaceModalProps) {
  if (!scrapedImages.length) return null;

  // Filter out the current images from available options
  const otherImages = scrapedImages.filter((img, index) => !selectedIndices.includes(index));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Replace Image</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        
        {otherImages.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {otherImages.map((image, index) => (
              <button
                key={`${image.url}-${index}`}
                onClick={() => {
                  onSelect(index);
                  onClose();
                }}
                className="relative aspect-square overflow-hidden rounded-lg border-2 border-transparent hover:border-blue-500 transition-all"
              >
                <img
                  src={image.url}
                  alt={image.alt || ''}
                  className="object-cover w-full h-full"
                />
              </button>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 py-8">
            No other images available for replacement
          </p>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
} 