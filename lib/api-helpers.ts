import { PrintOrder } from '@/app/types/order';

interface FetchOptions {
  headers?: Record<string, string>;
}

export async function fetchWithErrorHandling(
  url: string, 
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: any,
  options: FetchOptions = {}
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
    throw new Error(error.message || 'API request failed');
  }

  return response.json();
}

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

export function handleApiResponse<T>(response: ApiResponse<T>): T {
  if (!response.success || !response.data) {
    throw new Error(response.error || 'Unknown error occurred');
  }
  return response.data;
} 