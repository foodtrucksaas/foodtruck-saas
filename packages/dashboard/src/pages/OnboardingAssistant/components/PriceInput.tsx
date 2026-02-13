import { forwardRef } from 'react';

interface PriceInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  autoFocus?: boolean;
  disabled?: boolean;
}

export const PriceInput = forwardRef<HTMLInputElement, PriceInputProps>(
  ({ value, onChange, placeholder = '0,00', label, className = '', autoFocus, disabled }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      // Allow empty, digits, one comma/period, up to 2 decimals
      const normalized = raw.replace(',', '.');
      if (normalized === '' || /^\d*\.?\d{0,2}$/.test(normalized)) {
        onChange(normalized);
      }
    };

    const handleBlur = () => {
      if (!value) return;
      const num = parseFloat(value);
      if (isNaN(num) || num <= 0) {
        onChange('');
        return;
      }
      onChange(num.toFixed(2));
    };

    return (
      <div className={className}>
        {label && <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>}
        <div className="relative">
          <input
            ref={ref}
            type="text"
            inputMode="decimal"
            value={value}
            onChange={handleChange}
            onBlur={handleBlur}
            onWheel={(e) => (e.target as HTMLInputElement).blur()}
            placeholder={placeholder}
            autoFocus={autoFocus}
            disabled={disabled}
            className="input min-h-[44px] text-sm pr-7 w-full"
          />
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">
            €
          </span>
        </div>
      </div>
    );
  }
);

PriceInput.displayName = 'PriceInput';
