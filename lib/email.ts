import { Resend } from 'resend';
import type { Order } from '@/app/types/order';

const resend = new Resend(process.env.RESEND_API_KEY);
// Resend offers 100 emails/day free, then $0.80/1000 emails

export async function sendOrderConfirmation({
  orderId,
  customerEmail,
  orderDetails
}: {
  orderId: string;
  customerEmail: string;
  orderDetails: Order;
}) {
  try {
    await resend.emails.send({
      from: 'orders@yourservice.com',
      to: customerEmail,
      subject: `Order Confirmation #${orderId}`,
      html: `
        <h1>Thank you for your order!</h1>
        <p>Your print is being processed and will be shipped soon.</p>
        <p>Order Details:</p>
        <ul>
          <li>Size: ${orderDetails.printSize.width}" × ${orderDetails.printSize.height}"</li>
          <li>Status: ${orderDetails.status}</li>
        </ul>
        <p>We'll send you tracking information once your order ships.</p>
      `
    });
  } catch (error) {
    console.error('Email sending error:', error);
    throw error;
  }
} 