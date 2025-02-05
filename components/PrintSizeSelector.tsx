import { PRINT_SIZES } from '@/lib/constants';
import type { PrintSize } from '@/app/types/order';

interface PrintSizeSelectorProps {
  selectedSize: PrintSize;
  onSizeChange: (size: PrintSize) => void;
}

export const PrintSizeSelector = ({ selectedSize, onSizeChange }: PrintSizeSelectorProps) => {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-gray-700">
        Print Size
      </label>
      <div className="flex gap-2">
        {Object.values(PRINT_SIZES).map((size) => (
          <button
            key={size.name}
            onClick={() => onSizeChange(size)}
            className={`
              relative p-4 rounded-lg border transition-all
              ${selectedSize.name === size.name
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
              }
            `}
          >
            <div
              className="absolute inset-2 border border-gray-200 opacity-30"
              style={{ aspectRatio: `${size.width}/${size.height}` }}
            />
            <div className="relative">
              <div className="font-medium">{size.name}"</div>
              <div className="text-sm text-gray-500">${size.price}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}; 