import { kv } from '@vercel/kv';

export default async function TrackOrderPage({ 
  params: { orderId } 
}: { 
  params: { orderId: string } 
}) {
  const order = await kv.get(`order:${orderId}`);
  
  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Order Status</h1>
      <div className="space-y-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="font-semibold mb-2">Order #{orderId}</h2>
          <div className="space-y-2">
            <p>Status: {order.status}</p>
            <p>Created: {new Date(order.createdAt).toLocaleDateString()}</p>
            {order.trackingNumber && (
              <p>Tracking: {order.trackingNumber}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 