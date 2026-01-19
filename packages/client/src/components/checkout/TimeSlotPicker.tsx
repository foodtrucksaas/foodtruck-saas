import { Clock, Calendar, Loader2 } from 'lucide-react';
import { formatTime, formatLocalDate } from '@foodtruck/shared';
import type { SlotWithLocation, ScheduleWithLocation, ScheduleException } from '../../hooks';

interface TimeSlotPickerProps {
  availableDates: Date[];
  selectedDate: Date;
  slots: SlotWithLocation[];
  schedules: ScheduleWithLocation[];
  slotsLoading: boolean;
  notOpenYet: { openTime: string } | null;
  selectedSlotValue: string;
  onSlotChange: (value: string) => void;
  onOpenDatePicker: () => void;
  allSchedules: ScheduleWithLocation[];
  exceptions: Map<string, ScheduleException>;
}

export function TimeSlotPicker({
  availableDates,
  selectedDate,
  slots,
  schedules,
  slotsLoading,
  notOpenYet,
  selectedSlotValue,
  onSlotChange,
  onOpenDatePicker,
  allSchedules,
  exceptions,
}: TimeSlotPickerProps) {
  const getLocationForSelectedDate = (): string | null => {
    const dateStr = formatLocalDate(selectedDate);
    const exception = exceptions.get(dateStr);

    if (exception && exception.location) {
      return exception.location.name;
    }

    const dayOfWeek = selectedDate.getDay();
    const daySchedules = allSchedules.filter((s) => s.day_of_week === dayOfWeek);
    const locationNames = [...new Set(daySchedules.map((s) => s.location?.name).filter(Boolean))];

    if (locationNames.length === 1) {
      return locationNames[0] as string;
    } else if (locationNames.length > 1) {
      return `${locationNames.length} emplacements`;
    }
    return null;
  };

  const today = new Date();
  const isToday = selectedDate.toDateString() === today.toDateString();
  const locationName = getLocationForSelectedDate();

  // Calculate days until selected date
  const getDaysUntil = () => {
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const selectedStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
    const diffTime = selectedStart.getTime() - todayStart.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };
  const daysUntil = getDaysUntil();

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5" style={{ boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)' }}>
      {/* Date Picker - Compact display */}
      {availableDates.length > 0 ? (
        <>
          {/* Warning banner when not today */}
          {!isToday && daysUntil > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <span className="text-lg">📅</span>
              </div>
              <div>
                <p className="text-sm font-bold text-amber-800">
                  Retrait dans {daysUntil} jour{daysUntil > 1 ? 's' : ''}
                </p>
                <p className="text-xs text-amber-700 capitalize">
                  {selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isToday ? 'bg-green-50' : 'bg-primary-50'}`}>
                <Calendar className={`w-5 h-5 ${isToday ? 'text-green-500' : 'text-primary-500'}`} />
              </div>
              <div>
                <p className="text-sm font-semibold text-anthracite capitalize">
                  {isToday
                    ? "Aujourd'hui"
                    : selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
                {locationName && (
                  <p className="text-xs text-gray-500">{locationName}</p>
                )}
              </div>
            </div>
            {availableDates.length > 1 && (
              <button
                type="button"
                onClick={onOpenDatePicker}
                className="text-sm text-primary-500 font-medium hover:text-primary-600"
              >
                Autre jour ?
              </button>
            )}
          </div>
        </>
      ) : (
        <p className="text-gray-500 text-sm mb-4">Aucune date disponible</p>
      )}

      {/* Time Picker */}
      <h3 className="font-semibold text-anthracite mt-4 mb-3 flex items-center gap-2 text-sm">
        <Clock className="w-4 h-4 text-primary-500" />
        Heure de retrait
      </h3>

      {slotsLoading ? (
        <div className="flex items-center justify-center py-3">
          <Loader2 className="w-5 h-5 animate-spin text-primary-500" />
        </div>
      ) : schedules.length > 0 && slots.length > 0 ? (
        <select
          value={selectedSlotValue}
          onChange={(e) => onSlotChange(e.target.value)}
          className="input w-full"
        >
          {slots.map((slot) => {
            const showLocation = schedules.length > 1;
            return (
              <option
                key={`${slot.time}-${slot.scheduleId}`}
                value={`${slot.time}|${slot.scheduleId}`}
                disabled={!slot.available}
              >
                {formatTime(slot.time)}{showLocation ? ` - ${slot.locationName}` : ''}{!slot.available ? ' (complet)' : ''}
              </option>
            );
          })}
        </select>
      ) : notOpenYet ? (
        <div className="bg-warning-50 border border-warning-100 rounded-xl p-4 text-warning-600 text-sm">
          <p className="font-semibold">Les commandes ouvrent à {formatTime(notOpenYet.openTime)}</p>
          <p className="mt-1 text-warning-500">Revenez à partir de cette heure pour commander.</p>
        </div>
      ) : (
        <p className="text-gray-500">Aucun créneau disponible pour cette date</p>
      )}
    </div>
  );
}

export default TimeSlotPicker;
