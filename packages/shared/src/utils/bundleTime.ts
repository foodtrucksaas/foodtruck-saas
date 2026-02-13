import { formatTime } from './formatters';

const DAY_LABELS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

/**
 * Check if a bundle is valid for a given pickup date/time
 * Returns true if no restrictions or if pickup falls within allowed window
 */
export function isBundleValidForPickup(
  bundle: {
    timeStart?: string | null;
    timeEnd?: string | null;
    daysOfWeek?: number[] | null;
  },
  pickupDate: Date
): boolean {
  // Check day of week restriction
  if (bundle.daysOfWeek && bundle.daysOfWeek.length > 0) {
    if (!bundle.daysOfWeek.includes(pickupDate.getDay())) {
      return false;
    }
  }

  // Check time window restriction
  if (bundle.timeStart && bundle.timeEnd) {
    const pickupMinutes = pickupDate.getHours() * 60 + pickupDate.getMinutes();
    const [startH, startM] = bundle.timeStart.split(':').map(Number);
    const [endH, endM] = bundle.timeEnd.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (pickupMinutes < startMinutes || pickupMinutes > endMinutes) {
      return false;
    }
  }

  return true;
}

/**
 * Format bundle time/day restrictions for display
 * Returns null if no restrictions
 */
export function formatBundleRestrictions(
  timeStart: string | null | undefined,
  timeEnd: string | null | undefined,
  daysOfWeek: number[] | null | undefined
): string | null {
  const parts: string[] = [];

  if (daysOfWeek && daysOfWeek.length > 0 && daysOfWeek.length < 7) {
    const sorted = [...daysOfWeek].sort((a, b) => a - b);
    // Check if consecutive
    const isConsecutive =
      sorted.length > 1 && sorted.every((d, i) => i === 0 || d === sorted[i - 1] + 1);

    if (isConsecutive && sorted.length >= 3) {
      parts.push(`${DAY_LABELS[sorted[0]]}-${DAY_LABELS[sorted[sorted.length - 1]]}`);
    } else {
      parts.push(sorted.map((d) => DAY_LABELS[d]).join(', '));
    }
  }

  if (timeStart && timeEnd) {
    parts.push(`${formatTime(timeStart)} - ${formatTime(timeEnd)}`);
  }

  if (parts.length === 0) return null;
  return parts.join(' · ');
}
