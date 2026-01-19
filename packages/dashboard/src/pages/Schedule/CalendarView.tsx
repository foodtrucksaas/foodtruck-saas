import { ChevronLeft, ChevronRight, XCircle } from 'lucide-react';
import type { CalendarDay, ScheduleWithLocation } from './useSchedule';

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

type EffectiveSchedule =
  | { type: 'closed'; reason?: string | null }
  | { type: 'override'; location?: { name: string } | null; start_time?: string | null; end_time?: string | null }
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
    <section className="card p-4">
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={onPreviousMonth} className="p-2 hover:bg-gray-100 rounded-lg">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold text-gray-900 capitalize">
          {currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
        </h2>
        <button onClick={onNextMonth} className="p-2 hover:bg-gray-100 rounded-lg">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-primary-100 border border-primary-300" />
          <span className="text-gray-600">Ouvert (récurrent)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-blue-100 border border-blue-300" />
          <span className="text-gray-600">Modifié</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-red-100 border border-red-300" />
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
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, idx) => {
          const effective = getEffectiveScheduleForDay(day);
          const isPast = day.date < new Date(new Date().setHours(0, 0, 0, 0));

          let bgColor = 'bg-white hover:bg-gray-50';
          let borderColor = 'border-gray-100';

          if (effective.type === 'closed') {
            bgColor = 'bg-red-50 hover:bg-red-100';
            borderColor = 'border-red-200';
          } else if (effective.type === 'override') {
            bgColor = 'bg-blue-50 hover:bg-blue-100';
            borderColor = 'border-blue-200';
          } else if (effective.type === 'normal') {
            bgColor = 'bg-primary-50 hover:bg-primary-100';
            borderColor = 'border-primary-200';
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
                min-h-[80px] p-1.5 rounded-lg border text-left transition-all
                ${bgColor} ${borderColor}
                ${!day.isCurrentMonth ? 'opacity-40' : ''}
                ${isPast && !day.isToday ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
                ${day.isToday ? 'ring-2 ring-primary-500' : ''}
              `}
            >
              <div className={`text-sm font-medium ${day.isToday ? 'text-primary-600' : 'text-gray-700'}`}>
                {day.date.getDate()}
              </div>

              {day.isCurrentMonth && (
                <div className="mt-1 space-y-0.5">
                  {effective.type === 'closed' && (
                    <div className="text-[10px] text-red-600 font-medium flex items-center gap-0.5">
                      <XCircle className="w-3 h-3" />
                      Fermé
                    </div>
                  )}
                  {effective.type === 'override' && effective.location && (
                    <div className="text-[10px] text-blue-600 truncate">
                      {effective.location.name}
                    </div>
                  )}
                  {effective.type === 'normal' && effective.schedules.map((s, i) => (
                    <div key={i} className="text-[10px] text-primary-600 truncate">
                      {s.location.name}
                    </div>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <p className="text-xs text-gray-500 mt-4">
        Cliquez sur un jour pour modifier le planning, fermer exceptionnellement ou changer d'emplacement.
      </p>
    </section>
  );
}
