import React, { useState } from 'react';

type ImageType = {
  url: string;
  alt?: string;
};

const PinterestGrid = () => {
  const [url, setUrl] = useState<string>('');
  const [images, setImages] = useState<ImageType[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [selectedImages, setSelectedImages] = useState<Set<number>>(new Set());

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch images');
      }

      const data = await response.json();
      setImages(data.images);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const toggleImageSelection = (index: number) => {
    const newSelection = new Set(selectedImages);
    if (newSelection.has(index)) {
      newSelection.delete(index);
    } else {
      newSelection.add(index);
    }
    setSelectedImages(newSelection);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <form onSubmit={handleSubmit} className="mb-8">
        <div className="flex gap-4">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter Pinterest board URL"
            className="flex-1 px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Loading...' : 'Scrape Images'}
          </button>
        </div>
      </form>

      {error && <p className="text-red-500 text-center mb-4">{error}</p>}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {images.map((img, index) => (
          <div
            key={index}
            className={`relative overflow-hidden rounded-lg shadow-lg cursor-pointer ${
              selectedImages.has(index) ? 'ring-4 ring-blue-500' : ''
            }`}
            onClick={() => toggleImageSelection(index)}
          >
            <img
              src={img.url}
              alt={img.alt || 'Pinterest image'}
              className="w-full h-auto object-cover"
            />
            {selectedImages.has(index) && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                <span className="text-white text-lg">Selected</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedImages.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <p className="text-gray-700">
              {selectedImages.size} image{selectedImages.size !== 1 ? 's' : ''} selected
            </p>
            <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Continue to Print Options
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PinterestGrid;