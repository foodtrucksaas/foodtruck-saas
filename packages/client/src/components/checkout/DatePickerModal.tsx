import { X, Check } from 'lucide-react';
import { formatLocalDate } from '@foodtruck/shared';
import type { ScheduleWithLocation, ScheduleException } from '../../hooks';

interface DatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableDates: Date[];
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  allSchedules: ScheduleWithLocation[];
  exceptions: Map<string, ScheduleException>;
}

export function DatePickerModal({
  isOpen,
  onClose,
  availableDates,
  selectedDate,
  onSelectDate,
  allSchedules,
  exceptions,
}: DatePickerModalProps) {
  if (!isOpen) return null;

  const getLocationForDate = (date: Date): string[] => {
    const dateStr = formatLocalDate(date);
    const exception = exceptions.get(dateStr);

    if (exception && exception.location) {
      return [exception.location.name];
    }

    const dayOfWeek = date.getDay();
    const daySchedules = allSchedules.filter((s) => s.day_of_week === dayOfWeek);
    return [...new Set(daySchedules.map((s) => s.location?.name).filter(Boolean))] as string[];
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center backdrop-blur-sm">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm max-h-[80vh] overflow-hidden shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="font-bold text-anthracite">Choisir une date</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Fermer"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Date List */}
        <div className="p-4 space-y-2 overflow-y-auto max-h-[60vh]">
          {availableDates.map((date) => {
            const isSelected = date.toDateString() === selectedDate.toDateString();
            const isToday = date.toDateString() === new Date().toDateString();
            const locationNames = getLocationForDate(date);

            return (
              <button
                key={date.toISOString()}
                type="button"
                onClick={() => {
                  onSelectDate(date);
                  onClose();
                }}
                className={`w-full flex items-center justify-between p-4 min-h-[72px] rounded-xl border-2 transition-all ${
                  isSelected
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-100 hover:border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center ${
                      isSelected ? 'bg-primary-500 text-white' : 'bg-gray-100 text-anthracite'
                    }`}
                  >
                    <span className="text-xs font-medium uppercase leading-none">
                      {isToday
                        ? 'Auj'
                        : date.toLocaleDateString('fr-FR', { weekday: 'short' }).slice(0, 3)}
                    </span>
                    <span className="text-lg font-bold leading-none">{date.getDate()}</span>
                  </div>
                  <div className="text-left">
                    <p
                      className={`font-medium ${isSelected ? 'text-primary-700' : 'text-anthracite'}`}
                    >
                      {isToday
                        ? "Aujourd'hui"
                        : date.toLocaleDateString('fr-FR', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                          })}
                    </p>
                    <p className="text-xs text-gray-500">
                      {locationNames.length === 1
                        ? locationNames[0]
                        : `${locationNames.length} emplacements`}
                    </p>
                  </div>
                </div>
                {isSelected && <Check className="w-5 h-5 text-primary-500" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default DatePickerModal;
