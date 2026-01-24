import { type HTMLAttributes } from 'react';

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'rectangular' | 'circular' | 'text';
  width?: string | number;
  height?: string | number;
  lines?: number;
  className?: string;
}

/**
 * Reusable Skeleton component for loading states
 * Uses Tailwind's animate-pulse for the shimmer effect
 */
export function Skeleton({
  variant = 'rectangular',
  width,
  height,
  lines = 1,
  className = '',
  ...props
}: SkeletonProps) {
  const baseClasses = 'bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] animate-shimmer';

  const getStyle = () => {
    const style: React.CSSProperties = {};
    if (width) style.width = typeof width === 'number' ? `${width}px` : width;
    if (height) style.height = typeof height === 'number' ? `${height}px` : height;
    return style;
  };

  if (variant === 'circular') {
    return (
      <div
        aria-hidden="true"
        className={`${baseClasses} rounded-full ${className}`}
        style={getStyle()}
        {...props}
      />
    );
  }

  if (variant === 'text') {
    return (
      <div aria-hidden="true" className="space-y-2" {...props}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`${baseClasses} rounded h-4 ${className}`}
            style={{
              ...getStyle(),
              width: i === lines - 1 && lines > 1 ? '75%' : width || '100%',
            }}
          />
        ))}
      </div>
    );
  }

  // Rectangular (default)
  return (
    <div
      aria-hidden="true"
      className={`${baseClasses} rounded-xl ${className}`}
      style={getStyle()}
      {...props}
    />
  );
}

/**
 * Skeleton for MenuItemCard component
 * Matches the layout of the actual MenuItemCard for smooth transitions
 */
export function MenuItemCardSkeleton({ showPhoto = true }: { showPhoto?: boolean }) {
  return (
    <div
      aria-hidden="true"
      className="bg-white rounded-xl p-4 flex gap-4 border border-gray-100"
      style={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)' }}
    >
      {/* Image skeleton */}
      {showPhoto && (
        <Skeleton
          variant="rectangular"
          width={72}
          height={72}
          className="flex-shrink-0 rounded-lg"
        />
      )}

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        {/* Header */}
        <div>
          {/* Name */}
          <Skeleton width="60%" height={18} className="rounded" />
          {/* Description */}
          <div className="mt-2 space-y-1.5">
            <Skeleton width="100%" height={13} className="rounded" />
            <Skeleton width="80%" height={13} className="rounded" />
          </div>
        </div>

        {/* Price + Button row */}
        <div className="flex items-center justify-between mt-3">
          <Skeleton width={60} height={20} className="rounded" />
          <Skeleton width={80} height={36} className="rounded-lg" />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for category section with title and menu items
 */
export function CategorySkeleton({ itemCount = 3, showPhoto = true }: { itemCount?: number; showPhoto?: boolean }) {
  return (
    <div aria-hidden="true">
      {/* Category title */}
      <div className="flex items-center gap-2 mb-4 mt-2">
        <Skeleton width={120} height={24} className="rounded" />
        <Skeleton width={24} height={16} className="rounded" />
      </div>
      {/* Menu items */}
      <div className="grid gap-3">
        {Array.from({ length: itemCount }).map((_, i) => (
          <MenuItemCardSkeleton key={i} showPhoto={showPhoto} />
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton for OrderCard in history list
 */
export function OrderCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="bg-white rounded-xl shadow-card border border-gray-100 p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          {/* Order ID and status */}
          <div className="flex items-center gap-2 mb-1">
            <Skeleton width={80} height={18} className="rounded" />
            <Skeleton width={70} height={20} className="rounded-full" />
          </div>
          {/* Date */}
          <div className="flex items-center gap-2">
            <Skeleton variant="circular" width={16} height={16} />
            <Skeleton width={150} height={14} className="rounded" />
          </div>
        </div>
        {/* Price */}
        <Skeleton width={60} height={20} className="rounded" />
      </div>
    </div>
  );
}

/**
 * Skeleton for Order Status page
 */
export function OrderStatusSkeleton() {
  return (
    <div aria-hidden="true" className="px-4 py-6 space-y-6">
      {/* Status Card */}
      <div className="bg-white rounded-xl shadow-card border border-gray-100 p-6">
        <div className="text-center">
          <Skeleton variant="circular" width={64} height={64} className="mx-auto mb-4" />
          <Skeleton width={200} height={24} className="mx-auto rounded" />
          <div className="mt-2">
            <Skeleton width="80%" height={16} className="mx-auto rounded" />
          </div>
        </div>
      </div>

      {/* Order Details Card */}
      <div className="bg-white rounded-xl shadow-card border border-gray-100 p-4">
        <Skeleton width={180} height={18} className="mb-3 rounded" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex justify-between">
              <Skeleton width="50%" height={16} className="rounded" />
              <Skeleton width={60} height={16} className="rounded" />
            </div>
          ))}
          <div className="border-t border-gray-100 pt-3 flex justify-between">
            <Skeleton width={50} height={18} className="rounded" />
            <Skeleton width={70} height={18} className="rounded" />
          </div>
        </div>
      </div>

      {/* Pickup Info Card */}
      <div className="bg-white rounded-xl shadow-card border border-gray-100 p-4">
        <Skeleton width={80} height={18} className="mb-3 rounded" />
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton variant="circular" width={16} height={16} />
            <Skeleton width={150} height={14} className="rounded" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton variant="circular" width={16} height={16} />
            <Skeleton width={120} height={14} className="rounded" />
          </div>
        </div>
        {/* Payment notice */}
        <div className="mt-3">
          <Skeleton width="100%" height={44} className="rounded-lg" />
        </div>
      </div>

      {/* Back button */}
      <Skeleton width="100%" height={44} className="rounded-lg" />
    </div>
  );
}

/**
 * Skeleton for Checkout page order summary
 */
export function CheckoutSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-4">
      {/* Order Summary Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        {/* Items */}
        <div className="space-y-3 mb-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton width={56} height={56} className="rounded-lg flex-shrink-0" />
              <div className="flex-1">
                <Skeleton width="70%" height={16} className="rounded mb-1" />
                <Skeleton width={50} height={14} className="rounded" />
              </div>
              <Skeleton width={60} height={16} className="rounded" />
            </div>
          ))}
        </div>
        {/* Total */}
        <div className="border-t border-gray-100 pt-3 flex justify-between">
          <Skeleton width={80} height={18} className="rounded" />
          <Skeleton width={70} height={18} className="rounded" />
        </div>
      </div>

      {/* Form skeleton */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Pickup time section */}
        <div className="p-4 border-b border-gray-100">
          <Skeleton width={60} height={12} className="rounded mb-2" />
          <div className="flex items-center gap-2">
            <Skeleton width={120} height={36} className="rounded-lg" />
            <Skeleton width="100%" height={36} className="rounded-lg" />
          </div>
        </div>

        {/* Contact info section */}
        <div className="p-4 border-b border-gray-100 space-y-3">
          <Skeleton width={80} height={12} className="rounded" />
          <Skeleton width="100%" height={40} className="rounded-lg" />
          <Skeleton width="100%" height={40} className="rounded-lg" />
          <Skeleton width="100%" height={40} className="rounded-lg" />
        </div>

        {/* Notes section */}
        <div className="p-4">
          <Skeleton width={160} height={14} className="rounded" />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for Foodtruck page header
 */
export function FoodtruckHeaderSkeleton() {
  return (
    <div aria-hidden="true">
      {/* Cover image area */}
      <Skeleton width="100%" height={176} className="rounded-none" />

      {/* Info Card */}
      <div className="px-4 -mt-10 relative z-10">
        <div
          className="bg-white rounded-xl border border-gray-100 p-3"
          style={{ boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)' }}
        >
          <div className="flex gap-3">
            <Skeleton
              variant="rectangular"
              width={56}
              height={56}
              className="-mt-7 rounded-lg border-2 border-white"
            />
            <div className="flex-1 min-w-0">
              <Skeleton width="60%" height={20} className="rounded" />
              <Skeleton width="40%" height={14} className="rounded mt-1" />
            </div>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5">
            <Skeleton variant="circular" width={14} height={14} />
            <Skeleton width={200} height={12} className="rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Skeleton;
