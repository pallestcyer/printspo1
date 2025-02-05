import { PRINT_SIZES } from '@/lib/constants';
import type { PrintSize } from '@/app/types/order';

interface PrintSizeSelectorProps {
  selectedSize: PrintSize;
  onSizeChange: (size: PrintSize) => void;
}

export const PrintSizeSelector = ({ selectedSize, onSizeChange }: PrintSizeSelectorProps) => {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Print Size</label>
      <div className="grid grid-cols-3 gap-2">
        {Object.values(PRINT_SIZES).map((size) => (
          <button
            key={size.name}
            onClick={() => onSizeChange(size)}
            className={`
              p-3 rounded-lg border transition-all relative
              ${selectedSize.name === size.name 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 hover:border-blue-300'}
            `}
          >
            <div className="text-sm font-medium">{size.name}"</div>
            <div className="text-xs text-gray-500">${(size.price / 100).toFixed(2)}</div>
            <div 
              className="absolute inset-2 border border-gray-200 opacity-30"
              style={{ aspectRatio: size.aspectRatio }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}; 