import { Check } from 'lucide-react';

interface Step {
  title: string;
  description: string;
  status: 'upcoming' | 'current' | 'complete';
}

export const StepIndicator = ({ steps }: { steps: Step[] }) => {
  return (
    <div className="py-6">
      <div className="max-w-3xl mx-auto">
        <nav aria-label="Progress">
          <ol className="flex items-center justify-between">
            {steps.map((step, index) => (
              <li key={step.title} className="flex-1">
                <div className="flex flex-col items-center">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center
                    ${step.status === 'complete' ? 'bg-blue-500' : 
                      step.status === 'current' ? 'border-2 border-blue-500' : 
                      'border-2 border-gray-300'}
                  `}>
                    {step.status === 'complete' ? (
                      <Check className="w-5 h-5 text-white" />
                    ) : (
                      <span className={step.status === 'current' ? 'text-blue-500' : 'text-gray-500'}>
                        {index + 1}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 text-sm font-medium text-gray-900">{step.title}</div>
                  <div className="text-xs text-gray-500">{step.description}</div>
                </div>
              </li>
            ))}
          </ol>
        </nav>
      </div>
    </div>
  );
}; 