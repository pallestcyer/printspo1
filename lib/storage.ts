import { kv } from '@vercel/kv';
import { PrintOrder } from '@/app/types/order';

export async function storeOrderData(
  orderId: string,
  data: PrintOrder,
  expirationInDays = 30
): Promise<void> {
  // Store in KV with expiration (30 days default)
  const expirationInSeconds = expirationInDays * 24 * 60 * 60;
  await kv.set(`order:${orderId}`, data, { ex: expirationInSeconds });
}

export async function getOrderData(orderId: string): Promise<PrintOrder | null> {
  return await kv.get(`order:${orderId}`);
}

export async function updateOrderData(
  orderId: string,
  updates: Partial<PrintOrder>
): Promise<void> {
  const existingData = await getOrderData(orderId);
  if (!existingData) throw new Error('Order not found');
  
  await kv.set(`order:${orderId}`, {
    ...existingData,
    ...updates,
    updatedAt: new Date().toISOString()
  });
} 