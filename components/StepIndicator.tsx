interface StepIndicatorProps {
  steps: string[];
  _currentStep: number;
}

export function StepIndicator({ steps, _currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center space-x-4">
      {steps.map((step, _index) => (
        <div key={step} className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
            {step}
          </div>
          {_index < steps.length - 1 && (
            <div className="w-16 h-0.5 bg-gray-200 mx-2" />
          )}
        </div>
      ))}
    </div>
  );
} 