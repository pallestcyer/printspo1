export interface ScrapedImage {
  url: string;
  alt: string;
}

export interface Layout {
  images: Array<{
    url: string;
    alt?: string;
    position?: { x: number; y: number; w: number; h: number };
    rotation?: number;
  }>;
  size: { width: number; height: number };
} 