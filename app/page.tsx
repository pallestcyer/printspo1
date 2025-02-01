"use client";
import React, { useState } from 'react';
import { AlertCircle, Loader2, CheckCircle2, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import PhotoLayoutGrid from '@/components/PhotoLayoutGrid';

interface ScrapedImage {
  url: string;
  alt: string;
}

export default function Home() {
  const [url, setUrl] = useState('');
  const [scrapedImages, setScrapedImages] = useState<ScrapedImage[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setScrapedImages([]);

    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Pinterest responded with an error');
      }

      if (!data.images?.length) {
        throw new Error('Found images but none met quality requirements');
      }

      setScrapedImages(data.images);
      setSelectedIndices([0, 1, 2, 3]);
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      console.error('Fetch error:', {
        error: error.message,
        url,
        stack: error.stack,
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleImageSelection = (index: number) => {
    setSelectedIndices(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-6">
            Pinterest Board to Print
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Transform your Pinterest inspiration into beautiful, high-quality prints.
          </p>
        </div>

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
          <Alert variant="destructive" className="max-w-3xl mx-auto mb-8">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {scrapedImages.length > 0 && (
          <div className="space-y-6">
            <h3 className="text-2xl font-bold">Select Images for Print ({selectedIndices.length} chosen)</h3>
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 overflow-x-auto pb-4">
              {scrapedImages.map((image, index) => {
                const isSelected = selectedIndices.includes(index);
                return (
                  <div
                    key={image.url}
                    onClick={() => toggleImageSelection(index)}
                    className={`relative aspect-[16/9] cursor-pointer transition-all group ${isSelected ? 'ring-2 ring-blue-500 scale-95' : 'hover:ring-2 hover:ring-gray-300'}`}
                  >
                    <img
                      src={image.url}
                      alt={image.alt}
                      className="w-full h-full object-cover rounded-lg border border-gray-200"
                      loading="lazy"
                      style={{
                        imageRendering: '-webkit-optimize-contrast',
                      }}
                    />
                    {isSelected && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-lg">
                        <CheckCircle2 className="w-6 h-6 text-white" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {selectedIndices.length > 0 && (
          <div className="mt-12">
            <h2 className="text-3xl font-bold mb-8">Arrange Your Layout</h2>
            <PhotoLayoutGrid
              scrapedImages={scrapedImages}
              selectedIndices={selectedIndices}
              onSelectionChange={setSelectedIndices}
              gap={12} // Default gap
              roundedness={0} // Default roundedness
            />
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
            <p className="text-gray-600">Loading your Pinterest board...</p>
          </div>
        )}
      </main>
    </div>
  );
}
