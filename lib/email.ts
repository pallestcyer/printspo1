import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
// Resend offers 100 emails/day free, then $0.80/1000 emails

export async function sendOrderConfirmation({
  orderId,
  customerEmail,
  orderDetails
}: {
  orderId: string;
  customerEmail: string;
  orderDetails: any;
}) {
  await resend.emails.send({
    from: 'orders@yourcompany.com',
    to: customerEmail,
    subject: `Order Confirmed - #${orderId}`,
    html: `
      <h1>Thank you for your order!</h1>
      <p>Your order #${orderId} has been confirmed and is being processed.</p>
      <h2>Order Details:</h2>
      <p>Size: ${orderDetails.printSize.width}" × ${orderDetails.printSize.height}"</p>
      <p>We'll email you when your order ships.</p>
    `,
  });
} 