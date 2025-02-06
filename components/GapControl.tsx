"use client"

import { Slider } from '@/components/ui/slider';

interface GapControlProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

export function GapControl({
  value,
  onChange,
  min = 0,
  max = 50,
  step = 1
}: GapControlProps) {
  return (
    <div className="w-full max-w-[280px] sm:max-w-full px-4 sm:px-6">
      <label className="block text-sm font-medium mb-2">
        Gap Spacing
      </label>
      <Slider
        value={[value]}
        onValueChange={([newValue]) => onChange(newValue)}
        min={min}
        max={max}
        step={step}
        className="w-full"
      />
    </div>
  );
} 