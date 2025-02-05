import { useState, useEffect } from 'react';
import { CheckCircle } from 'lucide-react';

export default function SuccessPage({ params }: { params: { id: string } }) {
  const [order, setOrder] = useState<PrintOrder | null>(null);
  
  useEffect(() => {
    const fetchOrder = async () => {
      const response = await fetch(`/api/orders/${params.id}`);
      const data = await response.json();
      setOrder(data);
    };
    fetchOrder();
  }, [params.id]);

  return (
    <div className="max-w-2xl mx-auto py-16 px-4">
      <div className="text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-3xl font-bold mb-2">Thank You For Your Order!</h1>
        <p className="text-gray-600 mb-8">
          Order #{params.id} has been confirmed
        </p>
        {order && (
          <div className="text-left bg-gray-50 rounded-lg p-6">
            <h2 className="font-medium mb-4">Order Details</h2>
            <div className="space-y-2 text-sm">
              <div>Print Size: {order.printSize.name}</div>
              <div>Images: {order.layout.images.length}</div>
              <div>Status: {order.status}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 