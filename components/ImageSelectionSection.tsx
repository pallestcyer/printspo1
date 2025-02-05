import { CheckCircle2 } from 'lucide-react';
import { theme } from '@/components/ui/theme';

interface ImageSelectionSectionProps {
  images: Array<{ url: string; alt: string }>;
  selectedIndices: number[];
  onSelectionChange: (indices: number[]) => void;
}

export const ImageSelectionSection = ({
  images,
  selectedIndices,
  onSelectionChange,
}: ImageSelectionSectionProps) => {
  const toggleImageSelection = (index: number) => {
    const newSelection = selectedIndices.includes(index)
      ? selectedIndices.filter(i => i !== index)
      : [...selectedIndices, index];
    onSelectionChange(newSelection);
  };

  return (
    <section className={`${theme.components.card} ${theme.spacing.section}`}>
      <div className="px-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold">
            Select Images
            <span className="ml-2 text-sm text-gray-500">
              ({selectedIndices.length} selected)
            </span>
          </h2>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {images.map((image, index) => {
            const isSelected = selectedIndices.includes(index);
            return (
              <button
                key={image.url}
                onClick={() => toggleImageSelection(index)}
                className={`
                  group relative aspect-square overflow-hidden rounded-lg
                  ${isSelected 
                    ? 'ring-2 ring-blue-500 scale-95' 
                    : 'hover:ring-2 hover:ring-gray-300'}
                  transition-all duration-200
                `}
              >
                <img
                  src={image.url}
                  alt={image.alt}
                  className="w-full h-full object-cover"
                />
                <div className={`
                  absolute inset-0 flex items-center justify-center
                  transition-opacity duration-200
                  ${isSelected ? 'bg-black/40' : 'bg-black/0 group-hover:bg-black/20'}
                `}>
                  {isSelected && (
                    <CheckCircle2 className="w-8 h-8 text-white" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}; 