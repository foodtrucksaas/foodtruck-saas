import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { useEffect, useState } from 'react';

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
        'flex gap-3 p-3 sm:p-4 rounded-xl border text-sm animate-fade-in-up',
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
          className="flex-shrink-0 min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center rounded-xl hover:bg-black/5 transition-all duration-150 active:scale-90"
          aria-label="Fermer"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}

// Toast component - fixed at bottom with safe-area support (Apple iOS style)
interface ToastProps {
  variant?: AlertVariant;
  message: string;
  title?: string;
  isVisible: boolean;
  onDismiss: () => void;
  duration?: number; // auto-dismiss duration in ms, 0 = no auto-dismiss
}

export function Toast({
  variant = 'info',
  message,
  title,
  isVisible,
  onDismiss,
  duration = 4000,
}: ToastProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;
  const [isExiting, setIsExiting] = useState(false);

  // Auto-dismiss after duration
  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(() => {
        setIsExiting(true);
        setTimeout(onDismiss, 200); // Wait for exit animation
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onDismiss]);

  // Reset exit state when becoming visible
  useEffect(() => {
    if (isVisible) {
      setIsExiting(false);
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[9999] px-4 pointer-events-none"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
    >
      <div
        role="alert"
        aria-live="polite"
        className={cn(
          'mx-auto max-w-md pointer-events-auto',
          'flex items-start gap-3 p-4 rounded-2xl border shadow-xl backdrop-blur-lg',
          'transition-all duration-200 ease-out',
          config.containerClass,
          isExiting ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0 animate-slide-up-fade'
        )}
      >
        <Icon className={cn('w-5 h-5 flex-shrink-0 mt-0.5', config.iconClass)} />
        <div className="flex-1 min-w-0">
          {title && <p className="font-semibold text-sm mb-0.5">{title}</p>}
          <p className="text-sm">{message}</p>
        </div>
        <button
          onClick={() => {
            setIsExiting(true);
            setTimeout(onDismiss, 200);
          }}
          className="flex-shrink-0 min-w-[44px] min-h-[44px] w-11 h-11 -mr-2 -mt-2 flex items-center justify-center rounded-xl hover:bg-black/5 transition-all duration-150 active:scale-90"
          aria-label="Fermer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

// Hook for managing toast state
export function useToast() {
  const [toast, setToast] = useState<{
    isVisible: boolean;
    variant: AlertVariant;
    message: string;
    title?: string;
  }>({
    isVisible: false,
    variant: 'info',
    message: '',
  });

  const showToast = (variant: AlertVariant, message: string, title?: string) => {
    setToast({ isVisible: true, variant, message, title });
  };

  const hideToast = () => {
    setToast((prev) => ({ ...prev, isVisible: false }));
  };

  return {
    toast,
    showToast,
    hideToast,
    showSuccess: (message: string, title?: string) => showToast('success', message, title),
    showError: (message: string, title?: string) => showToast('error', message, title),
    showWarning: (message: string, title?: string) => showToast('warning', message, title),
    showInfo: (message: string, title?: string) => showToast('info', message, title),
  };
}

// Convenience exports for common use cases
export function ErrorAlert({ children, className, ...props }: Omit<AlertProps, 'variant'>) {
  return (
    <Alert variant="error" className={className} {...props}>
      {children}
    </Alert>
  );
}

export function SuccessAlert({ children, className, ...props }: Omit<AlertProps, 'variant'>) {
  return (
    <Alert variant="success" className={className} {...props}>
      {children}
    </Alert>
  );
}

export function WarningAlert({ children, className, ...props }: Omit<AlertProps, 'variant'>) {
  return (
    <Alert variant="warning" className={className} {...props}>
      {children}
    </Alert>
  );
}

export function InfoAlert({ children, className, ...props }: Omit<AlertProps, 'variant'>) {
  return (
    <Alert variant="info" className={className} {...props}>
      {children}
    </Alert>
  );
}
