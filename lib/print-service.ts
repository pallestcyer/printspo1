import { getPrintSizeVariantId } from './stripe-helpers';
import { PrintSize } from '@/app/types/order';

interface PrintJob {
  orderId: string;
  printFileUrl: string;
  printSize: PrintSize;
  shippingAddress: any;
}

export async function createPrintJob(job: PrintJob) {
  // Integration with your print service (e.g., Printful, Gooten, etc.)
  // This is an example structure - implement based on your chosen service
  const response = await fetch('https://api.printservice.com/orders', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PRINT_SERVICE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      external_id: job.orderId,
      shipping_address: job.shippingAddress,
      items: [{
        variant_id: getPrintSizeVariantId(job.printSize),
        files: [{
          url: job.printFileUrl,
          type: 'preview'
        }],
        quantity: 1
      }]
    })
  });

  return response.json();
} 