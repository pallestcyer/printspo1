import React from 'react';
import type { Order } from '@/app/types/order';

interface OrderConfirmationEmailProps {
  order: Order;
}

export function OrderConfirmationEmail({ order }: OrderConfirmationEmailProps) {
  return (
    <div>
      <h1>Thank you for your order!</h1>
      <p>Order ID: {order.id}</p>
      <p>Status: {order.status}</p>
      <div>
        <h2>Print Details:</h2>
        <p>Size: {order.printSize.width}" × {order.printSize.height}"</p>
        <p>Price: ${order.printSize.price}</p>
      </div>
      <div>
        <h2>Track Your Order:</h2>
        <p>Visit: {process.env.NEXT_PUBLIC_BASE_URL}/orders/{order.id}/track</p>
      </div>
    </div>
  );
} 