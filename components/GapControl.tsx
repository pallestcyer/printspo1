"use client"

import { Slider } from '@/components/ui/slider';

interface GapControlProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
}

export function GapControl({ 
  value, 
  onChange, 
  min = 0, 
  max = 2, 
  step = 0.1,
  label = "Spacing"
}: GapControlProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-700">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-24 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
      />
      <span className="text-sm text-gray-700">{value.toFixed(1)}</span>
    </div>
  );
} 