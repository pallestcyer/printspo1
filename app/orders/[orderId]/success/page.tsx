import { kv } from '@vercel/kv';
import { CheckCircle2, Printer, Truck } from 'lucide-react';
import { PrintOrder } from '@/app/types/order';
import { notFound } from 'next/navigation';

export default async function OrderSuccessPage({ 
  params: { orderId } 
}: { 
  params: { orderId: string } 
}) {
  const order = await kv.get(`order:${orderId}`) as PrintOrder | null;
  
  if (!order) {
    notFound();
  }
  
  return (
    <div className="max-w-2xl mx-auto p-8">
      <div className="text-center mb-8">
        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-3xl font-bold mb-2">Order Confirmed!</h1>
        <p className="text-gray-600">Order #{orderId}</p>
      </div>

      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Order Details</h2>
          <div className="space-y-2">
            <p>Size: {order.printSize.width}" × {order.printSize.height}"</p>
            <p>Status: {order.status}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4">What's Next?</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Printer className="w-5 h-5 text-blue-500" />
              <p>Your print is being prepared</p>
            </div>
            <div className="flex items-center gap-3">
              <Truck className="w-5 h-5 text-blue-500" />
              <p>We'll email you when your order ships</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 