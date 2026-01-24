import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';
import { cn } from '../lib/utils';

type AlertVariant = 'error' | 'success' | 'warning' | 'info';

interface AlertProps {
  variant?: AlertVariant;
  children: React.ReactNode;
  className?: string;
  onDismiss?: () => void;
  title?: string;
}

const variantConfig = {
  error: {
    icon: AlertCircle,
    containerClass: 'bg-red-50 border-red-200 text-red-800',
    iconClass: 'text-red-500',
  },
  success: {
    icon: CheckCircle,
    containerClass: 'bg-green-50 border-green-200 text-green-800',
    iconClass: 'text-green-500',
  },
  warning: {
    icon: AlertTriangle,
    containerClass: 'bg-amber-50 border-amber-200 text-amber-800',
    iconClass: 'text-amber-500',
  },
  info: {
    icon: Info,
    containerClass: 'bg-blue-50 border-blue-200 text-blue-800',
    iconClass: 'text-blue-500',
  },
};

export function Alert({ variant = 'info', children, className, onDismiss, title }: AlertProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <div
      role="alert"
      className={cn(
        'flex gap-3 p-3 rounded-xl border text-sm animate-fade-in-up',
        config.containerClass,
        className
      )}
    >
      <Icon className={cn('w-5 h-5 flex-shrink-0 mt-0.5', config.iconClass)} />
      <div className="flex-1 min-w-0">
        {title && <p className="font-semibold mb-1">{title}</p>}
        <div>{children}</div>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="flex-shrink-0 p-1 rounded-lg hover:bg-black/5 transition-all duration-150 active:scale-90"
          aria-label="Fermer"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

// Convenience exports for common use cases
export function ErrorAlert({ children, className, ...props }: Omit<AlertProps, 'variant'>) {
  return <Alert variant="error" className={className} {...props}>{children}</Alert>;
}

export function SuccessAlert({ children, className, ...props }: Omit<AlertProps, 'variant'>) {
  return <Alert variant="success" className={className} {...props}>{children}</Alert>;
}

export function WarningAlert({ children, className, ...props }: Omit<AlertProps, 'variant'>) {
  return <Alert variant="warning" className={className} {...props}>{children}</Alert>;
}

export function InfoAlert({ children, className, ...props }: Omit<AlertProps, 'variant'>) {
  return <Alert variant="info" className={className} {...props}>{children}</Alert>;
}
