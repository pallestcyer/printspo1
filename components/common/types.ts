import type { PrintSize } from '@/app/types/common';

export type PrintComponentProps = {
  size: PrintSize;
  onSizeChange: (size: PrintSize) => void;
  // other common props
} 