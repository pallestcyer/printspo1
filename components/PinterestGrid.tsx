import React, { useState } from 'react';

interface Image {
  url: string;
  alt: string;
}

const PinterestGrid = () => {
  const [url, setUrl] = useState('');
  const [images, setImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('https://www.printspo.ca/api/scrape', {
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
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="mb-4">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Enter Pinterest board URL"
          className="border p-2 w-full"
          required
        />
        <button 
          type="submit" 
          className="bg-[#D4A5A5] text-white p-2 mt-2 rounded-md"
        >
          Import Board
        </button>
      </form>

      {loading && <p>Loading...</p>}
      {error && <p className="text-red-500">{error}</p>}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {images.map((img, index) => {
          const imageKey = `${img.url}-${index}`; // Unique key by combining URL and index
          const aspectRatio = img.url.includes('16x9') ? 'aspect-[16/9]' : 'aspect-[4/3]'; // Adjust this logic

          return (
            <div
              key={imageKey}
              className={`relative overflow-hidden rounded-lg shadow-lg ${aspectRatio}`}
            >
              <img
                src={img.url}
                alt={img.alt || 'Pinterest image'}
                className="w-full h-full object-cover absolute top-0 left-0"
              />
            </div>
          );
        })}
      </div>

    </div>
  );
};

export default PinterestGrid;
