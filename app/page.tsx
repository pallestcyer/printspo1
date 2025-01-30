"use client";

import { useState } from "react";

export default function Home() {
  const [url, setUrl] = useState('');
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch('https://www.printspo.ca/api/scrape-pinterest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });
      
      const data = await response.json();
      console.log('Received data:', data); // For debugging
      setImages(data.images || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8">
      <main className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">Pinterest Board to Print</h1>
        
        <form onSubmit={handleSubmit} className="mb-8">
          <div className="flex gap-4 max-w-2xl mx-auto">
            <input
              type="url"
              placeholder="Enter Pinterest board URL"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1 px-4 py-2 rounded-lg border border-gray-300"
              required
            />
            <button 
              type="submit" 
              disabled={loading}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg disabled:bg-blue-300"
            >
              {loading ? 'Loading...' : 'Generate'}
            </button>
          </div>
        </form>

        {loading && (
          <div className="text-center">Loading images...</div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image: any, index: number) => (
            <div key={index} className="aspect-[3/4] relative overflow-hidden rounded-lg bg-gray-100">
              <img
                src={image.url}
                alt={image.alt || 'Pinterest image'}
                className="object-cover w-full h-full"
              />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}