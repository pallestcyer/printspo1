import { describe, it, expect, beforeEach } from 'vitest';
import { POST as createOrder } from '@/app/api/orders/route';
import { POST as handleWebhook } from '@/app/api/webhook/route';
import { kv } from '@vercel/kv';
import { vi } from 'vitest';

vi.mock('stripe', () => ({
  default: vi.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        create: vi.fn().mockResolvedValue({
          id: 'test_session_id',
          url: 'https://checkout.stripe.com/test'
        })
      },
      webhooks: {
        constructEvent: vi.fn().mockReturnValue({
          type: 'checkout.session.completed',
          data: {
            object: {
              metadata: { orderId: 'test_order_id' },
              payment_intent: 'pi_test',
              customer_details: { email: 'test@example.com' }
            }
          }
        })
      }
    }
  }))
}));

describe('Order Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create order and process webhook', async () => {
    const orderRequest = new Request('http://localhost:3000/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        layout: {
          images: [{
            url: 'https://example.com/test.jpg',
            position: { x: 0, y: 0, w: 1, h: 1 }
          }]
        },
        printSize: { width: 8, height: 10, price: 19.99 },
        spacing: 10,
        printFile: 'https://res.cloudinary.com/test/image.jpg'
      })
    });

    const orderResponse = await createOrder(orderRequest);
    const orderData = await orderResponse.json();

    expect(orderResponse.status).toBe(200);
    expect(orderData.orderId).toBeDefined();
    expect(orderData.sessionId).toBeDefined();
  });
}); 