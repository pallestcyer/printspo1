declare module 'pdfkit' {
  interface PDFDocumentOptions {
    size?: number[] | string;
    margin?: number;
    bufferPages?: boolean;
    autoFirstPage?: boolean;
    compress?: boolean;
  }

  class PDFDocument {
    constructor(options?: PDFDocumentOptions);
    on(event: string, callback: Function): this;
    image(
      src: Buffer | string,
      x: number,
      y: number,
      options?: {
        width?: number;
        height?: number;
        scale?: number;
        fit?: [number, number];
        cover?: [number, number];
        align?: string;
        valign?: string;
      }
    ): this;
    end(): void;
  }

  export default PDFDocument;
} 