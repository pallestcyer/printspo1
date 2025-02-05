interface TestFetchOptions {
  headers?: Record<string, string>;
}

export async function testFetch(
  url: string, 
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: any,
  options: TestFetchOptions = {}
) {
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...(body && { body: JSON.stringify(body) })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Test API request failed');
  }

  return response.json();
}

export function createMockRequest(body: any, options: TestFetchOptions = {}) {
  return new Request('http://localhost:3000', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    body: JSON.stringify(body)
  });
}

export async function makeTestRequest(
  url: string,
  method: string = 'GET',
  body?: any,
  options: TestFetchOptions = {}
) {
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...(body && { body: JSON.stringify(body) })
  });

  return response.json();
} 