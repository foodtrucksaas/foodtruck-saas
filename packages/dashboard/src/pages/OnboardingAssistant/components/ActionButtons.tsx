import { ReactNode } from 'react';

interface ActionButtonProps {
  onClick: () => void;
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline';
  icon?: ReactNode;
  disabled?: boolean;
  className?: string;
}

export function ActionButton({
  onClick,
  children,
  variant = 'primary',
  icon,
  disabled = false,
  className = '',
}: ActionButtonProps) {
  const baseClasses =
    'flex items-center justify-center gap-2 px-4 py-3 min-h-[48px] rounded-xl font-medium transition-all active:scale-[0.98] w-full';

  const variantClasses = {
    primary:
      'bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 text-white shadow-lg shadow-primary-500/25',
    secondary: 'bg-gray-100 hover:bg-gray-200 disabled:bg-gray-100 text-gray-700',
    outline:
      'border-2 border-gray-200 hover:border-primary-300 hover:bg-primary-50 disabled:border-gray-200 disabled:bg-white text-gray-700',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
    >
      {icon}
      {children}
    </button>
  );
}

interface OptionCardProps {
  onClick: () => void;
  title: string;
  description?: string;
  icon?: ReactNode;
  selected?: boolean;
  disabled?: boolean;
}

export function OptionCard({
  onClick,
  title,
  description,
  icon,
  selected = false,
  disabled = false,
}: OptionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full text-left p-4 rounded-xl border-2 transition-all active:scale-[0.98] ${
        selected
          ? 'border-primary-500 bg-primary-50'
          : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <div className="flex items-start gap-3">
        {icon && (
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              selected ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className={`font-medium ${selected ? 'text-primary-700' : 'text-gray-900'}`}>
            {title}
          </p>
          {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
        </div>
        {selected && (
          <div className="w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center flex-shrink-0">
            <svg
              className="w-3 h-3 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        )}
      </div>
    </button>
  );
}

interface QuickSuggestionProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
  selectedValue?: string;
}

export function QuickSuggestions({ suggestions, onSelect, selectedValue }: QuickSuggestionProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {suggestions.map((suggestion) => (
        <button
          key={suggestion}
          type="button"
          onClick={() => onSelect(suggestion)}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all active:scale-95 ${
            selectedValue === suggestion
              ? 'bg-primary-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
}
