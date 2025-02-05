import { theme } from '@/components/ui/theme';
import PhotoLayoutGrid from '@/components/PhotoLayoutGrid';
import { PrintSizeSelector } from '@/components/PrintSizeSelector';
import { GapControl } from '@/components/GapControl';
import type { PrintSize } from '@/app/types/order';
import type { ScrapedImage } from '@/app/types';

// Maximum number of images supported by any layout
const MAX_IMAGES = 4; // Based on the maximum from available layouts

interface LayoutCustomizationSectionProps {
  selectedImages: Image[];
  selectedSize: PrintSize;
  spacing: number;
  onSpacingChange: (value: number) => void;
  onSizeChange: (size: PrintSize) => void;
  onLayoutComplete?: (layout: any) => void;
}

export const LayoutCustomizationSection = ({
  selectedImages,
  selectedSize,
  spacing,
  onSpacingChange,
  onSizeChange,
  onLayoutComplete,
}: LayoutCustomizationSectionProps) => {
  return (
    <section className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold">Customize Layout</h2>
          <PrintSizeSelector
            selectedSize={selectedSize}
            onSizeChange={onSizeChange}
          />
        </div>

        <div className="space-y-6">
          <div className="relative w-full mx-auto" style={{ 
            maxWidth: 'min(800px, 90vw)',
            aspectRatio: `${selectedSize.width}/${selectedSize.height}`,
          }}>
            <PhotoLayoutGrid
              scrapedImages={selectedImages}
              selectedIndices={Array.from({ length: selectedImages.length }, (_, i) => i)}
              onSelectionChange={(newIndices) => {
                const newSelectedImages = newIndices.map(index => selectedImages[index]);
              }}
              selectedSize={selectedSize}
              spacing={spacing}
              setSpacing={onSpacingChange}
              onLayoutComplete={onLayoutComplete}
            />
          </div>
        </div>
      </div>
    </section>
  );
}; 