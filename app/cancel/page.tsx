'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CancelPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to home page after a brief delay
    const timeout = setTimeout(() => {
      router.push('/');
    }, 100);

    return () => clearTimeout(timeout);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-semibold mb-4">Order Cancelled</h1>
        <p className="text-gray-600">Redirecting you back to the homepage...</p>
      </div>
    </div>
  );
} 