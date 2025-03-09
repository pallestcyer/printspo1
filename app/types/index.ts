export interface ScrapedImage {
  url: string;
  alt?: string;
  width?: number;
  height?: number;
  id?: string;
  position?: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  rotation?: number;
  thumbnailUrl?: string;
  loaded?: boolean;
  error?: boolean;
}

export type PrintSize = 
  | { readonly width: 5; readonly height: 7; readonly price: 9; readonly name: "5x7"; }
  | { readonly width: 8.5; readonly height: 11; readonly price: 12; readonly name: "8.5x11"; }
  | { readonly width: 11; readonly height: 14; readonly price: 16; readonly name: "11x14"; };

export interface Board {
  id: string;
  url: string;
  name: string;
  scrapedImages: ScrapedImage[];
  selectedIndices: number[];
  printSize: PrintSize;
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
    position: { x: number; y: number; w: number; h: number };
    rotation: number;
  }>;
  size: { width: number; height: number };
}

export interface DragItem {
  index: number;
  type: string;
}

// Re-export types from board.ts
export * from './board'; 