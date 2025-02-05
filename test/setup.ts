import '@testing-library/jest-dom';
import { beforeAll, afterAll, afterEach, vi } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

// Mock external services
vi.mock('@stripe/stripe-js', () => ({
  loadStripe: () => Promise.resolve({
    redirectToCheckout: vi.fn().mockResolvedValue({ error: null })
  })
}));

vi.mock('@vercel/kv', () => ({
  kv: {
    set: vi.fn().mockResolvedValue(true),
    get: vi.fn().mockResolvedValue({ status: 'pending' })
  }
}));

// Mock Cloudinary
vi.mock('@/lib/cloudinary', () => ({
  cloudinary: {
    uploader: {
      upload: vi.fn().mockResolvedValue({
        public_id: 'test_id',
        secure_url: 'https://res.cloudinary.com/test/image.jpg'
      })
    },
    url: vi.fn().mockReturnValue('https://res.cloudinary.com/test/preview.jpg')
  }
}));

// Create MSW server for API mocking
export const server = setupServer(
  http.post('/api/prints/generate', () => {
    return HttpResponse.json({
      preview: 'https://res.cloudinary.com/test/preview.jpg',
      images: [{
        printUrl: 'https://res.cloudinary.com/test/image.jpg'
      }],
      success: true
    });
  }),

  http.post('/api/orders', () => {
    return HttpResponse.json({
      orderId: 'test_order_id',
      sessionId: 'test_session_id',
      success: true
    });
  })
);

beforeAll(() => server.listen());
afterAll(() => server.close());
afterEach(() => {
  server.resetHandlers();
  vi.clearAllMocks();
}); 