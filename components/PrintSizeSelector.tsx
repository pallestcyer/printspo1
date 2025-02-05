import { type PrintSize } from '@/app/types/order';

interface PrintSizeSelectorProps {
  selectedSize: PrintSize | null;
  onSizeChange: (size: PrintSize) => void;
}

export function PrintSizeSelector({ selectedSize, onSizeChange }: PrintSizeSelectorProps) {
  const printSizes: PrintSize[] = [
    { width: 8, height: 10, price: 19.99 },
    { width: 11, height: 14, price: 29.99 },
    { width: 16, height: 20, price: 39.99 },
    { width: 20, height: 24, price: 49.99 },
  ];

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Select Print Size
      </label>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {printSizes.map((size) => (
          <button
            key={`${size.width}x${size.height}`}
            onClick={() => onSizeChange(size)}
            className={`
              p-3 border rounded-lg text-sm
              ${selectedSize?.width === size.width && selectedSize?.height === size.height
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 hover:border-gray-300'
              }
            `}
          >
            <div className="font-medium">{size.width}" × {size.height}"</div>
            <div className="text-gray-500">${size.price}</div>
          </button>
        ))}
      </div>
    </div>
  );
} 