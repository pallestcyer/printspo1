import { put } from '@vercel/blob';

export async function uploadToStorage(file: Buffer, key: string): Promise<string> {
  const { url } = await put(key, file, {
    access: 'public',
    contentType: 'image/jpeg'
  });
  
  return url;
} 