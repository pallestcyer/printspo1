'use client';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

interface TestResult {
  status: 'success' | 'error' | 'pending';
  error?: string;
  data?: any;
}

interface TestResults {
  [key: string]: TestResult;
}

export default function ApiTestPage() {
  const [results, setResults] = useState<TestResults>({});
  const [loading, setLoading] = useState(false);

  const endpoints = [
    { name: 'stripe', url: '/api/test-services' },
    { name: 'email', url: '/api/test-services' },
    { name: 'kv', url: '/api/test-services' }
  ];

  const runTests = async () => {
    setLoading(true);
    const newResults: TestResults = {};

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint.url);
        const data = await response.json();

        if (!response.ok) throw new Error(data.error || 'Test failed');

        newResults[endpoint.name] = {
          status: 'success',
          data
        };
      } catch (error) {
        newResults[endpoint.name] = {
          status: 'error',
          error: error instanceof Error ? error.message : 'An unknown error occurred'
        };
      }
    }

    setResults(newResults);
    setLoading(false);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">API Service Tests</h1>
      
      <button
        onClick={runTests}
        disabled={loading}
        className="mb-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300"
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

      <div className="space-y-4">
        {Object.entries(results).map(([name, result]) => (
          <div key={name} className="p-4 border rounded-lg">
            <h2 className="font-semibold mb-2">{name}</h2>
            <div className={`text-sm ${
              result.status === 'success' ? 'text-green-600' : 'text-red-600'
            }`}>
              {result.status === 'success' ? '✓ Passed' : `✗ Failed: ${result.error}`}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 