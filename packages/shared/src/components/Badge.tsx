import { ReactNode } from 'react';

export type BadgeVariant =
  | 'default'
  | 'corail'
  | 'marine'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'pending';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-sand-200 text-anthracite',
  corail: 'bg-corail-50 text-corail-800',
  marine: 'bg-marine-50 text-marine-800',
  success: 'bg-success-50 text-success-800',
  warning: 'bg-warning-50 text-warning-800',
  error: 'bg-error-50 text-error-800',
  info: 'bg-marine-50 text-marine-800',
  pending: 'bg-pending-50 text-pending-800',
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
    pending: { variant: 'pending', label: 'En attente' },
    confirmed: { variant: 'info', label: 'Confirmée' },
    preparing: { variant: 'corail', label: 'En préparation' },
    ready: { variant: 'success', label: 'Prête' },
    completed: { variant: 'default', label: 'Retirée' },
    cancelled: { variant: 'error', label: 'Annulée' },
  };

  const config = statusConfig[status] || { variant: 'default' as BadgeVariant, label: status };

  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export default Badge;
