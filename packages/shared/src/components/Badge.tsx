import { ReactNode } from 'react';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'primary';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-gray-100 text-gray-700',
  success: 'bg-green-50 text-green-700',
  warning: 'bg-amber-50 text-amber-700',
  error: 'bg-red-50 text-red-700',
  info: 'bg-blue-50 text-blue-700',
  primary: 'bg-primary-50 text-primary-700',
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
};

export function Badge({
  variant = 'default',
  size = 'md',
  children,
  icon,
  className = '',
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1 font-semibold rounded-full
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
    >
      {icon}
      {children}
    </span>
  );
}

// Preset badges for common statuses
export function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { variant: BadgeVariant; label: string }> = {
    pending: { variant: 'warning', label: 'En attente' },
    confirmed: { variant: 'info', label: 'Confirmée' },
    preparing: { variant: 'primary', label: 'En préparation' },
    ready: { variant: 'success', label: 'Prête' },
    completed: { variant: 'default', label: 'Retirée' },
    cancelled: { variant: 'error', label: 'Annulée' },
  };

  const config = statusConfig[status] || { variant: 'default' as BadgeVariant, label: status };

  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export default Badge;
