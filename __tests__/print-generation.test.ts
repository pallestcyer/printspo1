import { describe, it, expect, vi } from 'vitest';
import { POST } from '@/app/api/prints/generate/route';

// Mock cloudinary
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

// Mock canvas
vi.mock('canvas', () => ({
  createCanvas: () => ({
    getContext: () => ({
      save: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      drawImage: vi.fn(),
      restore: vi.fn()
    }),
    toDataURL: () => 'data:image/png;base64,fake'
  }),
  loadImage: () => Promise.resolve({
    width: 1000,
    height: 1000
  })
}));

describe('Print Generation', () => {
  it('should generate preview and print files', async () => {
    const mockImage = {
      url: 'https://example.com/test.jpg',
      position: { x: 0, y: 0, w: 1, h: 1 },
      rotation: 0
    };

    const request = new Request('http://localhost:3000/api/prints/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        images: [mockImage],
        printSize: { width: 8, height: 10, price: 19.99 },
        spacing: 10,
        containMode: true,
        isPreview: true
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.ok).toBe(true);
    expect(data.success).toBe(true);
    expect(data.preview).toBeDefined();
    expect(data.images).toBeInstanceOf(Array);
    expect(data.images[0].printUrl).toBeDefined();
  });

  it('should handle missing images', async () => {
    const request = new Request('http://localhost:3000/api/prints/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        images: [],
        printSize: { width: 8, height: 10, price: 19.99 },
        spacing: 10
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('No images provided');
  });

  it('should handle invalid image URLs', async () => {
    const request = new Request('http://localhost:3000/api/prints/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        images: [{
          url: 'invalid-url',
          position: { x: 0, y: 0, w: 1, h: 1 },
          rotation: 0
        }],
        printSize: { width: 8, height: 10, price: 19.99 },
        spacing: 10
      })
    });

    const response = await POST(request);
    expect(response.ok).toBe(true); // Should still succeed because we're mocking
  });
}); 