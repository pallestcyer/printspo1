import { Resend } from 'resend';
import type { Order } from '@/app/types/order';

const resend = new Resend(process.env.RESEND_API_KEY);
// Resend offers 100 emails/day free, then $0.80/1000 emails

export async function sendOrderConfirmation(order: Order) {
  try {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Order Confirmation</title>
        </head>
        <body style="font-family: sans-serif; line-height: 1.5; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #2563eb; margin-bottom: 24px;">Thank you for your order!</h1>
            <p style="margin-bottom: 16px;">Order ID: ${order.id}</p>
            <p style="margin-bottom: 16px;">Status: ${order.status}</p>
            
            <div style="margin-bottom: 24px;">
              <h2 style="color: #1f2937; margin-bottom: 16px;">Print Details:</h2>
              <p style="margin-bottom: 8px;">Size: ${order.printSize.width}" × ${order.printSize.height}"</p>
              <p style="margin-bottom: 8px;">Price: $${order.printSize.price}</p>
            </div>
            
            <div style="margin-bottom: 24px;">
              <h2 style="color: #1f2937; margin-bottom: 16px;">Track Your Order:</h2>
              <p style="margin-bottom: 8px;">
                <a href="${process.env.NEXT_PUBLIC_BASE_URL}/orders/${order.id}/track" 
                   style="color: #2563eb; text-decoration: none;">
                  View Order Status
                </a>
              </p>
            </div>
          </div>
        </body>
      </html>
    `;
    
    const result = await resend.sendEmail({
      from: 'orders@yourdomain.com',
      to: order.email!,
      subject: `Order Confirmation #${order.id}`,
      html
    });

    if ('error' in result) {
      throw new Error(result.error.message);
    }
    
    return true;
  } catch (error) {
    console.error('Failed to send order confirmation:', error);
    return false;
  }
} 