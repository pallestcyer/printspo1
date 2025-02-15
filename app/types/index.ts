export interface ScrapedImage {
  url: string;
  alt: string;
  width?: number;
  height?: number;
  id?: string;
}

export interface Board {
  id: string;
  url: string;
  name: string;
  scrapedImages: ScrapedImage[];
  selectedIndices: number[];
  printSize: {
    width: number;
    height: number;
    price: number;
    name: string;
  };
  spacing: number;
  containMode: boolean;
  isPortrait: boolean;
  cornerRounding: number;
}

export type BoardsState = Board[];

export interface Layout {
  images: Array<{
    url: string;
    alt?: string;
    position?: { x: number; y: number; w: number; h: number };
    rotation?: number;
  }>;
  size: { width: number; height: number };
} 