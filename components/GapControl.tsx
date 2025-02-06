"use client"

import { Slider } from '@/components/ui/slider';

interface GapControlProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  containMode?: boolean;
  onContainModeChange?: (mode: boolean) => void;
  isPortrait?: boolean;
  onOrientationChange?: (isPortrait: boolean) => void;
}

export function GapControl({
  value,
  onChange,
  min = 0,
  max = 50,
  step = 1,
  label = "Gap Spacing",
  containMode,
  onContainModeChange,
  isPortrait,
  onOrientationChange
}: GapControlProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
      <div className="w-full max-w-[280px]">
        <label className="block text-sm font-medium mb-2">
          {label}
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

      <div className="flex flex-wrap gap-4">
        {onContainModeChange && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={containMode}
              onChange={(e) => onContainModeChange(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Show full images</span>
          </label>
        )}

        {onOrientationChange && (
          <button
            onClick={() => onOrientationChange(!isPortrait)}
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
        )}
      </div>
    </div>
  );
} 