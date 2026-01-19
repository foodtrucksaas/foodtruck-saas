/**
 * Format a Date to YYYY-MM-DD string using local timezone (not UTC).
 * This avoids the timezone bug where toISOString() shifts dates by one day
 * in positive UTC offset timezones like Europe/Paris.
 */
export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const DAY_NAMES = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

export const DAY_NAMES_SHORT = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

export function getDayName(dayOfWeek: number): string {
  return DAY_NAMES[dayOfWeek] || '';
}

export function getDayNameShort(dayOfWeek: number): string {
  return DAY_NAMES_SHORT[dayOfWeek] || '';
}

export function generateTimeSlots(
  startTime: string,
  endTime: string,
  intervalMinutes: number = 15
): string[] {
  const slots: string[] = [];
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  let currentMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  while (currentMinutes < endMinutes) {
    const hours = Math.floor(currentMinutes / 60);
    const mins = currentMinutes % 60;
    slots.push(`${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`);
    currentMinutes += intervalMinutes;
  }

  return slots;
}

export function isTimeInRange(time: string, startTime: string, endTime: string): boolean {
  const [h, m] = time.split(':').map(Number);
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);

  const timeMinutes = h * 60 + m;
  const startMinutes = sh * 60 + sm;
  const endMinutes = eh * 60 + em;

  return timeMinutes >= startMinutes && timeMinutes < endMinutes;
}

export function getNextAvailableSlot(
  startTime: string,
  endTime: string,
  intervalMinutes: number = 15,
  bufferMinutes: number = 30
): string | null {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes() + bufferMinutes;

  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  let slotMinutes = Math.max(currentMinutes, startMinutes);
  slotMinutes = Math.ceil(slotMinutes / intervalMinutes) * intervalMinutes;

  if (slotMinutes >= endMinutes) {
    return null;
  }

  const hours = Math.floor(slotMinutes / 60);
  const mins = slotMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

export function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const totalMinutes = h * 60 + m + minutes;
  const hours = Math.floor(totalMinutes / 60) % 24;
  const mins = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

export function getWeekDates(): Date[] {
  const dates: Date[] = [];
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));

  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    dates.push(date);
  }

  return dates;
}
