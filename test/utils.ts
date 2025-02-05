export function createMockRequest(body: any, options = {}) {
  return new Request('http://localhost:3000', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    body: JSON.stringify(body)
  });
} 