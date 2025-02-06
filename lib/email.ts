import { Resend } from 'resend';
import type { Order } from '@/app/types/order';

if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY is not configured in environment variables');
}

if (!process.env.ADMIN_EMAIL) {
  throw new Error('ADMIN_EMAIL is not configured in environment variables');
}

const resend = new Resend(process.env.RESEND_API_KEY);
// Resend offers 100 emails/day free, then $0.80/1000 emails

export async function sendOrderConfirmation(order: Order) {
  try {
    if (!order.email) {
      console.error('No email address provided for order:', order.id);
      return false;
    }

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
      from: 'Printspo <orders@printspo.ca>',
      to: order.email,
      subject: `Order Confirmation #${order.id}`,
      html,
      reply_to: 'support@printspo.ca',
      text: `Thank you for your order! Order ID: ${order.id}. View status: ${process.env.NEXT_PUBLIC_BASE_URL}/orders/${order.id}/track`
    });

    if ('error' in result) {
      console.error('Resend API error:', result.error);
      throw new Error(result.error.message);
    }
    
    return true;
  } catch (error) {
    console.error('Failed to send order confirmation:', error);
    return false;
  }
}

export async function sendAdminNotification(order: Order) {
  try {
    const html = `
      <!DOCTYPE html>
      <html>
        <body style="font-family: sans-serif; line-height: 1.5; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #2563eb;">New Order Received!</h1>
            <p>Order ID: ${order.id}</p>
            <p>Customer Email: ${order.email || 'Not provided'}</p>
            
            <div style="margin-top: 24px;">
              <h2>Print Details:</h2>
              <p>Size: ${order.printSize.width}" × ${order.printSize.height}"</p>
              <p>Price: $${order.printSize.price}</p>
            </div>

            ${order.shippingAddress ? `
              <div style="margin-top: 24px;">
                <h2>Shipping Address:</h2>
                <p>${order.shippingAddress.name}</p>
                <p>${order.shippingAddress.line1}</p>
                ${order.shippingAddress.line2 ? `<p>${order.shippingAddress.line2}</p>` : ''}
                <p>${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.postal_code}</p>
                <p>${order.shippingAddress.country}</p>
              </div>
            ` : ''}
            
            <div style="margin-top: 24px;">
              <a href="${process.env.NEXT_PUBLIC_BASE_URL}/admin/orders/${order.id}" 
                 style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                View Order Details
              </a>
            </div>
          </div>
        </body>
      </html>
    `;
    
    const result = await resend.sendEmail({
      from: 'Printspo <orders@printspo.ca>',
      to: process.env.ADMIN_EMAIL!,
      subject: `New Order #${order.id}`,
      html,
      text: `New order #${order.id} received. Size: ${order.printSize.width}"x${order.printSize.height}". Customer: ${order.email}`
    });

    if ('error' in result) {
      throw new Error(result.error.message);
    }
    
    return true;
  } catch (error) {
    console.error('Failed to send admin notification:', error);
    return false;
  }
} 