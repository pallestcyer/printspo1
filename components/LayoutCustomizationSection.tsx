import { theme } from '@/components/ui/theme';
import PhotoLayoutGrid from '@/components/PhotoLayoutGrid';
import { PrintSizeSelector } from '@/components/PrintSizeSelector';
import { GapControl } from '@/components/GapControl';
import type { PrintSize } from '@/app/types/order';
import type { ScrapedImage } from '@/app/types/index';
import { PRINT_SIZES } from '@/lib/constants';

// Maximum number of images supported by any layout
const MAX_IMAGES = 4; // Based on the maximum from available layouts

interface LayoutCustomizationSectionProps {
  selectedImages: ScrapedImage[];
  selectedSize: PrintSize;
  spacing: number;
  onSpacingChange: (spacing: number) => void;
  onSizeChange: (size: PrintSize) => void;
  onLayoutComplete: () => void;
  gapSpacing: number;
  onGapChange: (spacing: number) => void;
  onCheckout: () => Promise<void>;
  containMode: boolean;
  setContainMode: (mode: boolean) => void;
  isPortrait: boolean;
  setIsPortrait: (isPortrait: boolean) => void;
}

export const LayoutCustomizationSection = ({
  selectedImages,
  selectedSize,
  spacing,
  onSpacingChange,
  onSizeChange,
  onLayoutComplete,
  gapSpacing,
  onGapChange,
  onCheckout,
  containMode,
  setContainMode,
  isPortrait,
  setIsPortrait
}: LayoutCustomizationSectionProps) => {
  const calculateGridColumns = () => {
    const aspectRatio = selectedSize.width / selectedSize.height;
    return aspectRatio >= 1 ? 2 : 1;
  };

  return (
    <section className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="px-6 py-4">
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b pb-4 gap-4">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold text-gray-900">Customize Your Print</h2>
              <p className="text-sm text-gray-500">Choose size and adjust spacing to perfect your layout</p>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
              <PrintSizeSelector
                sizes={PRINT_SIZES}
                selectedSize={selectedSize}
                onSizeChange={onSizeChange}
              />
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto border-l pl-4">
                <GapControl
                  value={spacing}
                  onChange={onSpacingChange}
                  label="Image spacing"
                  containMode={containMode}
                  onContainModeChange={setContainMode}
                  isPortrait={isPortrait}
                  onOrientationChange={setIsPortrait}
                />
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={containMode}
                      onChange={(e) => setContainMode(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Show full images</span>
                  </label>
                  
                  <button
                    onClick={() => setIsPortrait(!isPortrait)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm hover:bg-gray-50"
                    style={{
                      backgroundColor: isPortrait ? '#EBF5FF' : 'white',
                      borderColor: isPortrait ? '#3B82F6' : '#E5E7EB',
                      color: isPortrait ? '#1D4ED8' : '#374151'
                    }}
                  >
                    <svg 
                      viewBox="0 0 24 24" 
                      className="w-4 h-4"
                      fill="none" 
                      stroke="currentColor"
                    >
                      {isPortrait ? (
                        <rect x="8" y="4" width="8" height="16" rx="1" strokeWidth="2" />
                      ) : (
                        <rect x="4" y="8" width="16" height="8" rx="1" strokeWidth="2" />
                      )}
                    </svg>
                    {isPortrait ? 'Portrait' : 'Landscape'}
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <div className="relative w-full mx-auto" 
            style={{ 
              maxWidth: 'min(800px, 90vw)',
              aspectRatio: `${selectedSize.width}/${selectedSize.height}`,
              display: 'grid',
              gridTemplateColumns: `repeat(${calculateGridColumns()}, 1fr)`,
              gap: `${spacing}rem`,
              padding: '1rem',
              backgroundColor: '#f8f9fa',
              borderRadius: '0.5rem'
            }}
          >
            {selectedImages.map((image, index) => (
              <div
                key={index}
                className="relative aspect-square overflow-hidden rounded-lg shadow-md"
              >
                <img
                  src={image.url}
                  alt={image.alt || ''}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}; 