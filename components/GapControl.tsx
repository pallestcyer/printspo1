"use client"

import { Slider } from '@/components/ui/slider';

export const GapControl = ({ spacing, setSpacing }: { spacing: number; setSpacing: (value: number) => void }) => {
  return (
    <div className="flex items-center gap-4 w-full max-w-md">
      <span className="text-sm font-medium whitespace-nowrap">Image Spacing</span>
      <Slider
        value={[spacing]}
        onValueChange={([value]) => setSpacing(value)}
        max={32}
        min={0}
        step={1}
        className="flex-1"
      />
      <span className="text-sm text-gray-500 min-w-[3ch]">{spacing}</span>
    </div>
  );
}; 