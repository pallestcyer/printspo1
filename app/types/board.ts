export interface ScrapedImage {
  url: string;
  alt?: string;
  width?: number;
  height?: number;
  source?: string;
}

export interface Board {
  id: string;
  boardUrl?: string;  // Pinterest board URL
  name?: string;  // Board name from Pinterest
  layout: {
    images: Array<{
      url: string;
      position: { x: number; y: number; w: number; h: number };
      rotation: number;
    }>;
  };
  printSize: {
    width: number;
    height: number;
    name: string;
    price: number;
  };
  spacing: number;
  cornerRounding: number;
  scrapedImages?: ScrapedImage[];
  selectedIndices: number[];
  containMode: boolean;
  isPortrait: boolean;
} 