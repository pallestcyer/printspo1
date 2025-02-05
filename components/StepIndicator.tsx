import { Check } from 'lucide-react';
import { Step, StepStatus } from '@/app/types/step';

interface StepIndicatorProps {
  steps?: Step[];
  currentStep: number;
}

export function StepIndicator({ 
  steps = [
    { title: 'Upload', description: 'Upload your images' },
    { title: 'Layout', description: 'Arrange your layout' },
    { title: 'Review', description: 'Review and checkout' }
  ],
  currentStep 
}: StepIndicatorProps) {
  return (
    <div className="w-full py-4">
      <nav aria-label="Progress">
        <ol className="flex items-center justify-between">
          {steps.map((step, index) => (
            <li key={step.title} className="flex-1">
              <div className="flex flex-col items-center">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center
                  ${index < currentStep ? 'bg-blue-600 text-white' : 
                    index === currentStep ? 'border-2 border-blue-600 text-blue-600' : 
                    'border-2 border-gray-300 text-gray-300'}
                `}>
                  {index + 1}
                </div>
                <div className="mt-2 text-sm font-medium">
                  {step.title}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </nav>
    </div>
  );
} 