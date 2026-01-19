import { LucideIcon } from 'lucide-react';

interface ToggleOption {
  value: boolean;
  icon: LucideIcon;
  title: string;
  description: string;
}

interface ToggleCardsProps {
  currentValue: boolean;
  onChange: (value: boolean) => void;
  options: [ToggleOption, ToggleOption];
}

export function ToggleCards({ currentValue, onChange, options }: ToggleCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {options.map((option) => {
        const isSelected = currentValue === option.value;
        const Icon = option.icon;
        return (
          <button
            key={option.value.toString()}
            type="button"
            onClick={() => onChange(option.value)}
            className={`p-4 rounded-lg border-2 text-left transition-all ${
              isSelected
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <Icon className={`w-6 h-6 mb-2 ${isSelected ? 'text-primary-500' : 'text-gray-400'}`} />
            <p className={`font-medium ${isSelected ? 'text-primary-700' : 'text-gray-700'}`}>
              {option.title}
            </p>
            <p className="text-xs text-gray-500 mt-1">{option.description}</p>
          </button>
        );
      })}
    </div>
  );
}

interface IntervalButtonsProps {
  currentValue: number;
  onChange: (value: number) => void;
  intervals: number[];
  suffix?: string;
}

export function IntervalButtons({ currentValue, onChange, intervals, suffix = 'min' }: IntervalButtonsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {intervals.map((interval) => (
        <button
          key={interval}
          type="button"
          onClick={() => onChange(interval)}
          className={`px-4 py-2 rounded-lg border font-medium transition-all ${
            currentValue === interval
              ? 'border-primary-500 bg-primary-50 text-primary-700'
              : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
          }`}
        >
          {interval} {suffix}
        </button>
      ))}
    </div>
  );
}
