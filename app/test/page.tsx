'use client';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

export default function TestPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ stripe: boolean; kv: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runTests = async () => {
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch('/api/test-services');
      if (!response.ok) {
        throw new Error('Test request failed');
      }

      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error('Test error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Service Tests</h1>
      
      <button
        onClick={runTests}
        disabled={loading}
        className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Running Tests...
          </span>
        ) : (
          'Run Tests'
        )}
      </button>

      {error && (
        <div className="mt-4 p-4 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      {results && (
        <div className="mt-4">
          <h2 className="text-xl font-semibold mb-2">Results:</h2>
          <ul className="space-y-2">
            <li className="flex items-center gap-2">
              <span className={results.stripe ? 'text-green-500' : 'text-red-500'}>
                ●
              </span>
              Stripe: {results.stripe ? 'Connected' : 'Failed'}
            </li>
            <li className="flex items-center gap-2">
              <span className={results.kv ? 'text-green-500' : 'text-red-500'}>
                ●
              </span>
              KV Store: {results.kv ? 'Connected' : 'Failed'}
            </li>
          </ul>
        </div>
      )}
    </div>
  );
} 