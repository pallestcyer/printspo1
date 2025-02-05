export interface ImageDimensions {
  width: number;
  height: number;
  aspectRatio: number;
}

export async function getImageDimensions(url: string): Promise<ImageDimensions> {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  const metadata = await sharp(Buffer.from(buffer)).metadata();
  
  const width = metadata.width || 0;
  const height = metadata.height || 0;
  const aspectRatio = width / height;
  
  return { width, height, aspectRatio };
}

export function calculateFitDimensions(
  container: { width: number; height: number },
  image: { width: number; height: number }
) {
  const containerRatio = container.width / container.height;
  const imageRatio = image.width / image.height;
  
  if (imageRatio > containerRatio) {
    // Image is wider than container
    return {
      width: container.width,
      height: container.width / imageRatio
    };
  } else {
    // Image is taller than container
    return {
      width: container.height * imageRatio,
      height: container.height
    };
  }
} 