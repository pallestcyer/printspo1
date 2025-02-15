import { PRINT_SIZES } from '@/lib/constants';
import { Dispatch, SetStateAction } from 'react';

export type ScrapedImage = {
  url: string;
  alt?: string;
  position?: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  rotation?: number;
};

// Get the type of any print size from PRINT_SIZES array
export type PrintSize = typeof PRINT_SIZES[number];

export type Board = {
  id: string;
  url: string;
  name: string;
  scrapedImages: ScrapedImage[];
  selectedIndices: number[];
  printSize: PrintSize;  // Updated to use PrintSize type
  spacing: number;
  containMode: boolean;
  isPortrait: boolean;
  cornerRounding: number;
};

export type BoardsState = Board[];
export type BoardsStateSetter = Dispatch<SetStateAction<BoardsState>>;

export type Image = {
  url: string;
  alt?: string;
  position?: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  rotation?: number;
};

export type Layout = {
  images: ScrapedImage[];
  size?: {
    width: number;
    height: number;
  };
  spacing?: number;
  containMode?: boolean;
}; 