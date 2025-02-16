import { PRINT_SIZES } from '@/lib/constants';
import { PrintSizeSelector } from '@/components/PrintSizeSelector';
import { GapControl } from '@/components/GapControl';
import type { Layout } from '@/app/types';

// Maximum number of images supported by any layout
const _MAX_IMAGES = 12;

// Extend Layout type to include the additional properties needed
interface ExtendedLayout extends Layout {
  containMode: boolean;
  isPortrait: boolean;
}

interface LayoutCustomizationSectionProps {
  layout: ExtendedLayout;
  onLayoutChange: (layout: ExtendedLayout) => void;
  _onLayoutComplete: () => void;
  _gapSpacing: number;
  _onGapChange: (spacing: number) => void;
  _onCheckout: () => void;
}

export const LayoutCustomizationSection = ({
  layout,
  onLayoutChange,
  _onLayoutComplete,
  _gapSpacing,
  _onGapChange,
  _onCheckout
}: LayoutCustomizationSectionProps) => {
  const calculateGridColumns = () => {
    const width = layout.size?.width ?? 1;
    const height = layout.size?.height ?? 1;
    const aspectRatio = width / height;
    return aspectRatio >= 1 ? 2 : 1;
  };

  // Create a PrintSize object from layout for PrintSizeSelector
  const layoutAsPrintSize = {
    width: layout.size?.width ?? PRINT_SIZES[0].width,
    height: layout.size?.height ?? PRINT_SIZES[0].height,
    price: 0,
    name: `${layout.size?.width ?? PRINT_SIZES[0].width}x${layout.size?.height ?? PRINT_SIZES[0].height}`
  };

  return (
    <section className="bg-white rounded-lg border border-gray-200 overflow-hidden">
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
                selectedSize={layoutAsPrintSize}
                onSizeChange={(size) => onLayoutChange({ ...layout, size: { width: size.width, height: size.height } })}
              />
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto border-l pl-4">
                <GapControl
                  value={_gapSpacing}
                  onChange={_onGapChange}
                  label="Image spacing"
                  containMode={layout.containMode}
                  onContainModeChange={(mode) => onLayoutChange({ ...layout, containMode: mode })}
                  isPortrait={layout.isPortrait}
                  onOrientationChange={(isPortrait) => onLayoutChange({ ...layout, isPortrait })}
                />
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={layout.containMode}
                      onChange={(e) => onLayoutChange({ ...layout, containMode: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Show full images</span>
                  </label>
                  
                  <button
                    onClick={() => onLayoutChange({ ...layout, isPortrait: !layout.isPortrait })}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm"
                    style={{
                      backgroundColor: layout.isPortrait ? 'rgba(212, 165, 165, 0.5)' : '#F7F7F7',
                      borderColor: layout.isPortrait ? '#D4A5A5' : '#E5E7EB',
                      color: '#4D4D4D'
                    }}
                  >
                    <svg 
                      viewBox="0 0 24 24" 
                      className="w-4 h-4"
                      fill="none" 
                      stroke="currentColor"
                    >
                      {layout.isPortrait ? (
                        <rect x="8" y="4" width="8" height="16" rx="1" strokeWidth="2" />
                      ) : (
                        <rect x="4" y="8" width="16" height="8" rx="1" strokeWidth="2" />
                      )}
                    </svg>
                    Multi-Board
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <div className="relative w-full mx-auto" 
            style={{ 
              maxWidth: 'min(800px, 90vw)',
              aspectRatio: `${layout.size?.width ?? PRINT_SIZES[0].width}/${layout.size?.height ?? PRINT_SIZES[0].height}`,
              display: 'grid',
              gridTemplateColumns: `repeat(${calculateGridColumns()}, 1fr)`,
              gap: `${_gapSpacing}rem`,
              padding: '1rem',
              backgroundColor: '#f8f9fa',
              borderRadius: '0.5rem'
            }}
          >
            {layout.images.map((image, index) => (
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