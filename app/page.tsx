"use client";

import React, { useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const Home = () => {
  const [url, setUrl] = useState('');
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedImages, setSelectedImages] = useState(new Set());

  const validatePinterestUrl = (url) => {
    return url.includes('pinterest.com') && url.trim() !== '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!validatePinterestUrl(url)) {
      setError('Please enter a valid Pinterest board URL');
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch images (${response.status})`);
      }

      const data = await response.json();
      
      if (!data.images || !Array.isArray(data.images)) {
        throw new Error('Invalid response format');
      }

      setImages(data.images);
    } catch (error) {
      console.error('Error:', error);
      setError(error.message || 'Failed to load images. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleImageSelection = (index) => {
    const newSelection = new Set(selectedImages);
    if (newSelection.has(index)) {
      newSelection.delete(index);
    } else {
      newSelection.add(index);
    }
    setSelectedImages(newSelection);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Pinterest Board to Print
          </h1>
          <p className="text-lg text-gray-600">
            Transform your Pinterest boards into beautiful prints
          </p>
        </div>

        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto mb-12">
          <div className="flex gap-4">
            <input
              type="url"
              placeholder="https://pinterest.com/username/board-name"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1 px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <button 
              type="submit" 
              disabled={loading}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Loading...
                </span>
              ) : (
                'Generate Preview'
              )}
            </button>
          </div>
        </form>

        {error && (
          <Alert variant="destructive" className="max-w-3xl mx-auto mb-8">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {images.length > 0 && (
          <div className="space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {images.map((image, index) => (
                <div 
                  key={index} 
                  className={`
                    group relative aspect-[3/4] rounded-lg overflow-hidden cursor-pointer
                    ${selectedImages.has(index) ? 'ring-4 ring-blue-500' : ''}
                  `}
                  onClick={() => toggleImageSelection(index)}
                >
                  <img
                    src={image.url}
                    alt={image.alt || 'Pinterest image'}
                    className="object-cover w-full h-full transition-transform group-hover:scale-105"
                  />
                  <div className={`
                    absolute inset-0 bg-black/40 transition-opacity
                    ${selectedImages.has(index) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                  `}>
                    <div className="absolute top-4 right-4">
                      <div className={`
                        w-6 h-6 rounded-full border-2 border-white
                        ${selectedImages.has(index) ? 'bg-blue-500' : 'bg-transparent'}
                      `} />
                    </div>
                  </div>
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
        )}
      </main>
    </div>
  );
};

export default Home;