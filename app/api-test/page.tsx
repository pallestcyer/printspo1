'use client';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

export default function APITest() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Record<string, any>>({});

  const testEndpoints = async () => {
    setLoading(true);
    const endpoints = [
      {
        name: 'Print Generation',
        path: '/api/prints/generate',
        method: 'POST',
        body: {
          images: [{
            url: "https://images.unsplash.com/photo-1707343843437-caacff5cfa74",
            position: { x: 0, y: 0, w: 1, h: 1 },
            rotation: 0
          }],
          printSize: { width: 8.5, height: 11, price: 20 },
          spacing: 0.1,
          isPreview: true
        }
      },
      {
        name: 'Create Order',
        path: '/api/orders',
        method: 'POST',
        body: {
          layout: {
            images: [{
              url: "https://images.unsplash.com/photo-1707343843437-caacff5cfa74",
              position: { x: 0, y: 0, w: 1, h: 1 },
              rotation: 0
            }]
          },
          printSize: { width: 8.5, height: 11, price: 20 },
          spacing: 0.1
        }
      }
    ];

    const newResults: Record<string, any> = {};

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint.path, {
          method: endpoint.method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(endpoint.body)
        });

        const data = await response.json();
        newResults[endpoint.name] = {
          status: response.status,
          data
        };
      } catch (error) {
        newResults[endpoint.name] = {
          status: 'error',
          error: error.message
        };
      }
    }

    setResults(newResults);
    setLoading(false);
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">API Endpoint Tests</h1>
      
      <button
        onClick={testEndpoints}
        disabled={loading}
        className="mb-8 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Testing Endpoints...
          </span>
        ) : (
          'Test All Endpoints'
        )}
      </button>

      <div className="space-y-6">
        {Object.entries(results).map(([name, result]) => (
          <div key={name} className="border rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-2">{name}</h2>
            <pre className="bg-gray-50 p-4 rounded overflow-auto max-h-96">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
} 