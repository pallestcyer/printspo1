import { CheckCircle2, Circle } from 'lucide-react';
import { Step, StepStatus } from '@/app/types/step';

interface StepIndicatorProps {
  steps?: Step[];
  currentStep: number;
}

export function StepIndicator({
  steps = [
    { 
      title: 'Upload', 
      description: 'Upload your images',
      status: 'complete' as StepStatus
    },
    { 
      title: 'Layout', 
      description: 'Arrange your layout',
      status: 'current' as StepStatus
    },
    { 
      title: 'Review', 
      description: 'Review and checkout',
      status: 'upcoming' as StepStatus
    }
  ],
  currentStep
}: StepIndicatorProps) {
  return (
    <div className="flex justify-between">
      {steps.map((step, index) => (
        <div key={step.title} className="flex flex-col items-center">
          <div className="flex items-center">
            {step.status === 'complete' ? (
              <CheckCircle2 className="w-6 h-6 text-green-500" />
            ) : (
              <Circle className={`w-6 h-6 ${step.status === 'current' ? 'text-blue-500' : 'text-gray-300'}`} />
            )}
          </div>
          <div className="mt-2 text-center">
            <div className="text-sm font-medium">{step.title}</div>
            <div className="text-xs text-gray-500">{step.description}</div>
          </div>
        </div>
      ))}
    </div>
  );
} 