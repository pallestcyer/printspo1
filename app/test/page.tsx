'use client';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

export default function TestPage() {
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string>('');

  const testPrintGenerate = async () => {
    try {
      setLoading(true);
      setError('');
      setPreview('');
      
      const response = await fetch('/api/prints/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: [{
            url: "https://images.pexels.com/photos/1170986/pexels-photo-1170986.jpeg",
            position: { x: 0, y: 0, w: 1, h: 1 },
            rotation: 0
          }],
          printSize: {
            width: 8.5,
            height: 11,
            price: 20
          },
          spacing: 0.1,
          isPreview: true
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(`${data.error}: ${data.details}`);
      }

      setResult(JSON.stringify(data, null, 2));
      if (data.preview) {
        setPreview(data.preview);
      }
    } catch (error) {
      console.error('Test error:', error);
      setError(error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Print Generation Test</h1>
      
      <button 
        onClick={testPrintGenerate}
        disabled={loading}
        className="bg-blue-500 text-white px-6 py-3 rounded-lg disabled:opacity-50"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Processing...
          </span>
        ) : (
          'Test Print Generate'
        )}
      </button>
      
      {error && (
        <div className="mt-6 p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}
      
      {result && (
        <div className="mt-6 p-4 bg-gray-100 rounded-lg">
          <pre className="whitespace-pre-wrap">{result}</pre>
        </div>
      )}
      
      {preview && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-2">Preview:</h2>
          <img 
            src={preview} 
            alt="Print Preview" 
            className="rounded-lg shadow-lg"
          />
        </div>
      )}
    </div>
  );
} 