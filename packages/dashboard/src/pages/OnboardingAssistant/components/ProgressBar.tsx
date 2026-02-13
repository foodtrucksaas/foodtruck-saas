interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  labels: string[];
  onStepClick?: (step: number) => void;
}

export function ProgressBar({ currentStep, totalSteps, labels, onStepClick }: ProgressBarProps) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-900">{labels[currentStep - 1]}</span>
        <span className="text-sm text-gray-400">
          {currentStep} / {totalSteps}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        {labels.map((label, index) => {
          const stepNumber = index + 1;
          const isCurrent = currentStep === stepNumber;
          const isPast = currentStep > stepNumber;
          const isClickable = onStepClick && isPast && !isCurrent;

          return (
            <button
              key={index}
              type="button"
              onClick={() => isClickable && onStepClick(stepNumber)}
              disabled={!isClickable}
              className={`h-1.5 rounded-full transition-all flex-1 ${
                isCurrent ? 'bg-primary-500' : isPast ? 'bg-primary-300' : 'bg-gray-200'
              } ${isClickable ? 'cursor-pointer active:scale-95' : ''}`}
              aria-label={isClickable ? `Aller à ${label}` : undefined}
              title={label}
            />
          );
        })}
      </div>
    </div>
  );
}
