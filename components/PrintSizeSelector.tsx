import { PRINT_SIZES } from '@/lib/constants';
import type { PrintSize } from '@/app/types/order';

interface PrintSizeSelectorProps {
  selectedSize: PrintSize;
  onSizeChange: (size: PrintSize) => void;
}

export function PrintSizeSelector({ selectedSize, onSizeChange }: PrintSizeSelectorProps) {
  return (
    <div className="flex gap-2">
      {PRINT_SIZES.map((size) => (
        <button
          key={`${size.width}x${size.height}`}
          onClick={() => onSizeChange(size)}
          className={`
            px-4 py-2 rounded-lg transition-all min-w-[100px]
            ${selectedSize.width === size.width && selectedSize.height === size.height
              ? 'bg-blue-50 ring-2 ring-blue-600'
              : 'bg-white ring-1 ring-gray-200 hover:ring-gray-300'
            }
          `}
        >
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-sm font-medium text-gray-700">{size.label}</span>
            <span className="text-xs text-gray-500">${size.price}</span>
          </div>
        </button>
      ))}
    </div>
  );
} 