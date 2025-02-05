export interface LayoutData {
  images: Array<{
    url: string;
    alt?: string;
    position: { x: number; y: number; w: number; h: number };
    rotation: number;
  }>;
  name?: string;
  template?: number[][];
}
