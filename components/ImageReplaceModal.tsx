import React from 'react';
import type { ScrapedImage } from '@/app/types/index';

interface ImageReplaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImageSelect: (imageUrl: string) => void;
  currentImageUrl?: string;
  availableImages: ScrapedImage[];
}

export const ImageReplaceModal = ({
  isOpen,
  onClose,
  onImageSelect,
  currentImageUrl = '',
  availableImages = []
}: ImageReplaceModalProps) => {
  if (!isOpen) return null;

  // Filter out the current image from available options
  const otherImages = availableImages.filter(img => img.url !== currentImageUrl);

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
                  onImageSelect(image.url);
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
}; 