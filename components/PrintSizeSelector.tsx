import { PRINT_SIZES } from '@/lib/constants';
import type { PrintSize } from '@/app/types/order';

interface PrintSizeSelectorProps {
  selectedSize: PrintSize | null;
  onSizeChange: (size: PrintSize) => void;
}

export function PrintSizeSelector({ selectedSize, onSizeChange }: PrintSizeSelectorProps) {
  return (
    <div className="w-full space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Select Print Size
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {PRINT_SIZES.map((size) => (
          <button
            key={`${size.width}x${size.height}`}
            onClick={() => onSizeChange(size)}
            className={`
              p-3 rounded-lg border text-left
              ${selectedSize?.width === size.width && selectedSize?.height === size.height
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
              }
            `}
          >
            <div className="font-medium">{size.width}" × {size.height}"</div>
            <div className="text-sm text-gray-500">${size.price.toFixed(2)}</div>
          </button>
        ))}
      </div>
    </div>
  );
} 