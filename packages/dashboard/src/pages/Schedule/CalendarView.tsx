import { ChevronLeft, ChevronRight, XCircle } from 'lucide-react';
import type { CalendarDay, ScheduleWithLocation } from './useSchedule';

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

type EffectiveSchedule =
  | { type: 'closed'; reason?: string | null }
  | {
      type: 'override';
      location?: { name: string } | null;
      start_time?: string | null;
      end_time?: string | null;
    }
  | { type: 'normal'; schedules: ScheduleWithLocation[] }
  | { type: 'none' };

interface CalendarViewProps {
  currentMonth: Date;
  calendarDays: CalendarDay[];
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onDayClick: (day: CalendarDay) => void;
  getEffectiveScheduleForDay: (day: CalendarDay) => EffectiveSchedule;
}

export function CalendarView({
  currentMonth,
  calendarDays,
  onPreviousMonth,
  onNextMonth,
  onDayClick,
  getEffectiveScheduleForDay,
}: CalendarViewProps) {
  return (
    <section className="card p-3 sm:p-4">
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <button
          onClick={onPreviousMonth}
          className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-gray-100 rounded-xl transition-colors active:scale-95"
          aria-label="Mois précédent"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 capitalize">
          {currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
        </h2>
        <button
          onClick={onNextMonth}
          className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-gray-100 rounded-xl transition-colors active:scale-95"
          aria-label="Mois suivant"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Legend - scrollable on mobile */}
      <div className="flex flex-wrap gap-2 sm:gap-4 mb-3 sm:mb-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-success-500/25 border border-success-400" />
          <span className="text-gray-600">Ouvert</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-warning-500/25 border border-warning-400" />
          <span className="text-gray-600">Modifié</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-error-500/25 border border-error-400" />
          <span className="text-gray-600">Fermé</span>
        </div>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map((day) => (
          <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
        {calendarDays.map((day, idx) => {
          const effective = getEffectiveScheduleForDay(day);
          const isPast = day.date < new Date(new Date().setHours(0, 0, 0, 0));

          let bgColor = 'bg-white hover:bg-gray-50';
          let borderColor = 'border-gray-100';

          if (effective.type === 'closed') {
            bgColor = 'bg-error-500/15 hover:bg-error-500/25';
            borderColor = 'border-error-400';
          } else if (effective.type === 'override') {
            bgColor = 'bg-warning-500/15 hover:bg-warning-500/25';
            borderColor = 'border-warning-400';
          } else if (effective.type === 'normal') {
            bgColor = 'bg-success-500/15 hover:bg-success-500/25';
            borderColor = 'border-success-400';
          }

          if (!day.isCurrentMonth) {
            bgColor = 'bg-gray-50';
            borderColor = 'border-gray-100';
          }

          return (
            <button
              key={idx}
              onClick={() => onDayClick(day)}
              disabled={isPast && !day.isToday}
              className={`
                min-h-[60px] sm:min-h-[80px] p-1 sm:p-2 rounded-lg border text-left transition-all
                ${bgColor} ${borderColor}
                ${!day.isCurrentMonth ? 'opacity-40' : ''}
                ${isPast && !day.isToday ? 'cursor-not-allowed opacity-50' : 'cursor-pointer active:scale-[0.98]'}
                ${day.isToday ? 'ring-2 ring-primary-500' : ''}
              `}
            >
              <div
                className={`text-xs sm:text-sm font-medium ${day.isToday ? 'text-primary-600' : 'text-gray-700'}`}
              >
                {day.date.getDate()}
              </div>

              {day.isCurrentMonth && (
                <div className="mt-0.5 sm:mt-1 space-y-0.5">
                  {effective.type === 'closed' && (
                    <div className="text-xs text-error-600 font-medium flex items-center gap-0.5">
                      <XCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      <span className="hidden sm:inline">Fermé</span>
                    </div>
                  )}
                  {effective.type === 'override' && effective.location && (
                    <div className="text-xs text-warning-700 truncate">
                      {effective.location.name}
                    </div>
                  )}
                  {effective.type === 'normal' &&
                    effective.schedules.slice(0, 1).map((s, i) => (
                      <div key={i} className="text-xs text-success-700 truncate">
                        {s.location.name}
                      </div>
                    ))}
                  {effective.type === 'normal' && effective.schedules.length > 1 && (
                    <div className="text-xs text-success-600">
                      +{effective.schedules.length - 1}
                    </div>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <p className="text-xs text-gray-500 mt-3 sm:mt-4">
        Cliquez sur un jour pour modifier le planning.
      </p>
    </section>
  );
}
