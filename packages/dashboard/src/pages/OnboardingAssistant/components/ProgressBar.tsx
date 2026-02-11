import { Check } from 'lucide-react';

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  labels: string[];
  completedSteps: number[];
  onStepClick?: (step: number) => void;
}

export function ProgressBar({
  currentStep,
  totalSteps,
  labels,
  completedSteps,
  onStepClick,
}: ProgressBarProps) {
  return (
    <div className="w-full">
      {/* Desktop version */}
      <div className="hidden sm:flex items-center justify-between">
        {labels.map((label, index) => {
          const stepNumber = index + 1;
          const isCompleted = completedSteps.includes(stepNumber);
          const isCurrent = currentStep === stepNumber;
          const isPast = currentStep > stepNumber;
          const isClickable = onStepClick && (isCompleted || isPast) && !isCurrent;

          return (
            <div key={index} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => isClickable && onStepClick(stepNumber)}
                  disabled={!isClickable}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                    isCompleted || isPast
                      ? 'bg-success-500 text-white'
                      : isCurrent
                        ? 'bg-primary-500 text-white ring-4 ring-primary-100'
                        : 'bg-gray-200 text-gray-500'
                  } ${isClickable ? 'cursor-pointer hover:ring-2 hover:ring-success-200 active:scale-95' : ''}`}
                >
                  {isCompleted || isPast ? <Check className="w-4 h-4" /> : stepNumber}
                </button>
                <span
                  className={`mt-2 text-xs font-medium ${
                    isCurrent ? 'text-primary-600' : isPast ? 'text-gray-600' : 'text-gray-400'
                  } ${isClickable ? 'cursor-pointer' : ''}`}
                  onClick={() => isClickable && onStepClick(stepNumber)}
                >
                  {label}
                </span>
              </div>
              {index < labels.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-3 rounded transition-colors ${
                    isPast || isCompleted ? 'bg-success-500' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile version - compact bar */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-900">
            Étape {currentStep} sur {totalSteps}
          </span>
          <span className="text-sm text-gray-500">{labels[currentStep - 1]}</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-500 rounded-full transition-all duration-500"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
