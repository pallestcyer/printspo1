import { kv } from '@vercel/kv';
import { type PrintOrder } from '../../../../app/types/order';
import { notFound } from 'next/navigation';
import { formatDate, cn } from '../../../../lib/utils';

export default async function TrackOrderPage({ 
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
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="space-y-4">
          <h2 className="font-semibold mb-2">Order #{orderId}</h2>
          <div className="space-y-2">
            <p>Status: {order.status}</p>
            <p>Created: {formatDate(order.createdAt)}</p>
            {order.trackingNumber && (
              <p>Tracking: {order.trackingNumber}</p>
            )}
          </div>
          
          <div className="mt-4">
            <h3 className="font-medium mb-2">Print Details</h3>
            <p>Size: {order.printSize.width}" × {order.printSize.height}"</p>
            <p>Layout: {order.layout.images.length} images</p>
          </div>
        </div>
      </div>
    </div>
  );
} 