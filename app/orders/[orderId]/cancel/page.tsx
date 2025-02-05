import { XCircle } from 'lucide-react';
import Link from 'next/link';

export default function OrderCancelPage() {
  return (
    <div className="max-w-2xl mx-auto p-8">
      <div className="bg-white rounded-lg shadow-sm p-8 text-center">
        <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h1 className="text-3xl font-bold mb-4">Order Cancelled</h1>
        <p className="text-gray-600 mb-6">
          Your order has been cancelled and no payment has been processed.
        </p>
        <Link 
          href="/"
          className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Return to Home
        </Link>
      </div>
    </div>
  );
}