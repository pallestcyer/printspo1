export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ErrorResponse {
  message: string;
  status?: number;
}

export interface GenericObject {
  [key: string]: unknown;
}

export interface ImageData {
  url: string;
  alt?: string;
  position?: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  rotation?: number;
} 