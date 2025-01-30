"use client";
import React, { useState } from 'react';
import { AlertCircle, Loader2, Image as ImageIcon, CheckCircle2, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import Masonry from 'react-masonry-css';

type ImageType = {
  url: string;
  alt?: string;
};

const Home = () => {
<<<<<<< HEAD
  const [url, setUrl] = useState('');
  const [images, setImages] = useState<ImageType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedImages, setSelectedImages] = useState(new Set<number>());

  const breakpointColumns = {
    default: 4,
    1100: 3,
    700: 2,
    500: 1
  };

  const validatePinterestUrl = (url: string): boolean => {
    return url.includes('pinterest.com') && url.trim() !== '';
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
=======
  const [url, setUrl] = useState<string>('');
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [selectedImages, setSelectedImages] = useState<Set<any>>(new Set());

  const validatePinterestUrl = (url: string) => {
    console.log('Validating URL:', url);
    return url.includes('pinterest.com') && url.trim() !== '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
>>>>>>> 0cf31df (fix)
    e.preventDefault();
    setLoading(true);
    setError('');
<<<<<<< HEAD
=======
    console.log('Form submitted with URL:', url);
>>>>>>> 0cf31df (fix)

    if (!validatePinterestUrl(url)) {
      setError('Please enter a valid Pinterest board URL');
      console.error('Invalid URL:', url);
      return;
    }

<<<<<<< HEAD
=======
    setLoading(true);
    console.log('Loading images...');

>>>>>>> 0cf31df (fix)
    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

<<<<<<< HEAD
=======
      console.log('Response received:', response);

>>>>>>> 0cf31df (fix)
      if (!response.ok) {
        throw new Error('Failed to fetch images');
      }

      const data = await response.json();
<<<<<<< HEAD
      setImages(data.images);
    } catch (err) {
      setError((err as Error).message);
=======
      console.log('Data received from API:', data);

      if (!data.images || !Array.isArray(data.images)) {
        throw new Error('Invalid response format');
      }

      setImages(data.images);
      console.log('Images set:', data.images);
    } catch (error) {
      console.error('Error:', error);
      setError((error as Error).message || 'Failed to load images. Please try again.');
>>>>>>> 0cf31df (fix)
    } finally {
      setLoading(false);
      console.log('Loading finished.');
    }
  };

  const toggleImageSelection = (index: number) => {
    const newSelection = new Set(selectedImages);
    if (newSelection.has(index)) {
      newSelection.delete(index);
      console.log('Image deselected:', index);
    } else {
      newSelection.add(index);
      console.log('Image selected:', index);
    }
    setSelectedImages(newSelection);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Debug section */}
      {/* Removed the debug grid test */}
      {/* <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
        <div className="bg-red-500 p-4">Grid Test 1</div>
        <div className="bg-blue-500 p-4">Grid Test 2</div>
        <div className="bg-green-500 p-4">Grid Test 3</div>
        <div className="bg-yellow-500 p-4">Grid Test 4</div>
      </div> */}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-6">
            Pinterest Board to Print
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Transform your Pinterest inspiration into beautiful, high-quality prints. Perfect for mood boards, 
            interior design, or creative projects.
          </p>
        </div>

        {/* URL Input Section */}
        <Card className="max-w-3xl mx-auto mb-12 border-2 border-gray-100 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4 text-gray-600">
              <Info className="w-5 h-5" />
              <p>Paste your Pinterest board URL below to get started</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex gap-4">
                <input
                  type="url"
                  placeholder="https://pinterest.com/username/board-name"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-lg border-2 border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg disabled:bg-blue-300 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95 shadow-md"
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
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive" className="max-w-3xl mx-auto mb-8 animate-slide-down">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Image Grid Section */}
        {images.length > 0 && (
          <div className="space-y-8 animate-fade-in">
            <Masonry
              breakpointCols={breakpointColumns}
              className="flex gap-4 w-full"
              columnClassName="gap-4"
            >
              {images.map((image: ImageType, index) => (
                <div
                  key={index}
                  onClick={() => toggleImageSelection(index)}
                  className="mb-4 break-inside-avoid group relative rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all cursor-pointer transform hover:scale-105"
                >
                  <img
                    src={image.url}
                    alt={image.alt || 'Pinterest image'}
                    className="w-full h-auto object-cover"
                  />
                  <div className={`absolute inset-0 transition-all ${
                    selectedImages.has(index)
                      ? 'bg-black/40'
                      : 'bg-black/0 group-hover:bg-black/20'
                  }`}>
                    {selectedImages.has(index) && (
                      <div className="absolute top-4 right-4">
                        <CheckCircle2 className="w-6 h-6 text-white" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </Masonry>

            {/* Selection Bar */}
            {selectedImages.size > 0 && (
              <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-xl p-6 animate-slide-up">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-full">
                      <span className="font-medium">{selectedImages.size}</span>
                      <span className="ml-1">image{selectedImages.size !== 1 ? 's' : ''} selected</span>
                    </div>
                  </div>
                  <button className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all transform hover:scale-105 active:scale-95 shadow-md flex items-center gap-2">
                    <ImageIcon className="w-5 h-5" />
                    Continue to Print Options
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12 animate-fade-in">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
            <p className="text-gray-600">Loading your Pinterest board...</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Home;