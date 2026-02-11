import { useState, useMemo } from 'react';
import { Calendar, Clock, MapPin, Copy, Check } from 'lucide-react';
import { useOnboarding } from '../OnboardingContext';
import { AssistantBubble, StepContainer } from '../components';

const DAYS_OF_WEEK = [
  { value: 1, label: 'Lundi', short: 'Lun' },
  { value: 2, label: 'Mardi', short: 'Mar' },
  { value: 3, label: 'Mercredi', short: 'Mer' },
  { value: 4, label: 'Jeudi', short: 'Jeu' },
  { value: 5, label: 'Vendredi', short: 'Ven' },
  { value: 6, label: 'Samedi', short: 'Sam' },
  { value: 0, label: 'Dimanche', short: 'Dim' },
];

type ScheduleSubStep = 'select-days' | 'configure-days' | 'calendar-info';

export function Step2Schedule() {
  const { state, dispatch, nextStep, prevStep } = useOnboarding();
  const [subStep, setSubStep] = useState<ScheduleSubStep>('select-days');
  const [currentDayConfig, setCurrentDayConfig] = useState({
    location_id: state.locations[0]?.id || '',
    start_time: '11:00',
    end_time: '14:00',
  });

  // Sort selected days in order (Mon-Sun)
  const sortedSelectedDays = useMemo(() => {
    return [...state.selectedDays].sort((a, b) => {
      // Monday (1) first, Sunday (0) last
      const orderA = a === 0 ? 7 : a;
      const orderB = b === 0 ? 7 : b;
      return orderA - orderB;
    });
  }, [state.selectedDays]);

  const currentDayValue = sortedSelectedDays[state.currentDayIndex];
  const currentDay = DAYS_OF_WEEK.find((d) => d.value === currentDayValue);
  const isLastDay = state.currentDayIndex === sortedSelectedDays.length - 1;

  const toggleDay = (dayValue: number) => {
    const newDays = state.selectedDays.includes(dayValue)
      ? state.selectedDays.filter((d) => d !== dayValue)
      : [...state.selectedDays, dayValue];
    dispatch({ type: 'SET_SELECTED_DAYS', days: newDays });
  };

  const handleDaysSelected = () => {
    if (state.selectedDays.length === 0) return;
    dispatch({ type: 'SET_CURRENT_DAY_INDEX', index: 0 });
    // Initialize with first location if available
    if (state.locations.length > 0 && state.locations[0].id) {
      setCurrentDayConfig((prev) => ({
        ...prev,
        location_id: state.locations[0].id!,
      }));
    }
    setSubStep('configure-days');
  };

  const handleSaveDay = () => {
    // Save schedule for current day
    const schedule = {
      day_of_week: currentDayValue,
      location_id: currentDayConfig.location_id,
      start_time: currentDayConfig.start_time,
      end_time: currentDayConfig.end_time,
    };

    // Update or add schedule
    const existingIndex = state.schedules.findIndex((s) => s.day_of_week === currentDayValue);
    if (existingIndex >= 0) {
      const newSchedules = [...state.schedules];
      newSchedules[existingIndex] = schedule;
      dispatch({ type: 'SET_SCHEDULES', schedules: newSchedules });
    } else {
      dispatch({ type: 'ADD_SCHEDULE', schedule });
    }

    // Move to next day or finish
    if (isLastDay) {
      setSubStep('calendar-info');
    } else {
      dispatch({ type: 'SET_CURRENT_DAY_INDEX', index: state.currentDayIndex + 1 });
    }
  };

  const handleCopyToAll = () => {
    // Copy current config to all remaining days
    const newSchedules = sortedSelectedDays.map((dayValue) => ({
      day_of_week: dayValue,
      location_id: currentDayConfig.location_id,
      start_time: currentDayConfig.start_time,
      end_time: currentDayConfig.end_time,
    }));
    dispatch({ type: 'SET_SCHEDULES', schedules: newSchedules });
    setSubStep('calendar-info');
  };

  const handleFinish = () => {
    nextStep();
  };

  // Step: Select days
  if (subStep === 'select-days') {
    return (
      <StepContainer
        onBack={prevStep}
        onNext={handleDaysSelected}
        nextLabel="Continuer"
        nextDisabled={state.selectedDays.length === 0}
      >
        <div className="space-y-6">
          <AssistantBubble
            message="Quand travaillez-vous ? Sélectionnez vos jours de travail."
            emoji="📅"
          />

          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
            {DAYS_OF_WEEK.map((day) => {
              const isSelected = state.selectedDays.includes(day.value);
              return (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleDay(day.value)}
                  className={`flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl border-2 transition-all active:scale-95 ${
                    isSelected
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}
                >
                  <span className="text-sm font-medium">{day.short}</span>
                  {isSelected && <Check className="w-4 h-4 mt-1 text-primary-500" />}
                </button>
              );
            })}
          </div>

          {state.selectedDays.length > 0 && (
            <p className="text-sm text-gray-600 text-center">
              {state.selectedDays.length} jour{state.selectedDays.length > 1 ? 's' : ''} sélectionné
              {state.selectedDays.length > 1 ? 's' : ''}
            </p>
          )}
        </div>
      </StepContainer>
    );
  }

  // Step: Configure each day
  if (subStep === 'configure-days' && currentDay) {
    return (
      <StepContainer
        onBack={() => {
          if (state.currentDayIndex === 0) {
            setSubStep('select-days');
          } else {
            dispatch({ type: 'SET_CURRENT_DAY_INDEX', index: state.currentDayIndex - 1 });
          }
        }}
        onNext={handleSaveDay}
        nextLabel={isLastDay ? 'Terminer' : 'Jour suivant'}
      >
        <div className="space-y-6">
          <AssistantBubble
            message={`Configuration du ${currentDay.label.toLowerCase()}`}
            emoji="📅"
          />

          {/* Progress indicator */}
          <div className="flex items-center justify-center gap-1">
            {sortedSelectedDays.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index <= state.currentDayIndex ? 'bg-primary-500' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>

          {/* Day header */}
          <div className="bg-primary-50 border border-primary-100 rounded-xl p-4 text-center">
            <Calendar className="w-8 h-8 text-primary-600 mx-auto mb-2" />
            <h3 className="text-lg font-semibold text-primary-700">{currentDay.label}</h3>
          </div>

          {/* Location selector */}
          {state.locations.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <MapPin className="w-4 h-4 inline mr-1" />
                Où êtes-vous ?
              </label>
              <select
                value={currentDayConfig.location_id}
                onChange={(e) =>
                  setCurrentDayConfig((prev) => ({ ...prev, location_id: e.target.value }))
                }
                className="input min-h-[48px] text-base"
              >
                {state.locations.map((loc, index) => (
                  <option key={loc.id || index} value={loc.id || loc.name}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Time inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <Clock className="w-4 h-4 inline mr-1" />
                Arrivée
              </label>
              <input
                type="time"
                value={currentDayConfig.start_time}
                onChange={(e) =>
                  setCurrentDayConfig((prev) => ({ ...prev, start_time: e.target.value }))
                }
                className="input min-h-[48px] text-base"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <Clock className="w-4 h-4 inline mr-1" />
                Départ
              </label>
              <input
                type="time"
                value={currentDayConfig.end_time}
                onChange={(e) =>
                  setCurrentDayConfig((prev) => ({ ...prev, end_time: e.target.value }))
                }
                className="input min-h-[48px] text-base"
              />
            </div>
          </div>

          {/* Copy to all button (only on first day if multiple days) */}
          {state.currentDayIndex === 0 && sortedSelectedDays.length > 1 && (
            <button
              type="button"
              onClick={handleCopyToAll}
              className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-primary-300 hover:text-primary-600 hover:bg-primary-50 transition-colors"
            >
              <Copy className="w-4 h-4" />
              Appliquer à tous les jours
            </button>
          )}
        </div>
      </StepContainer>
    );
  }

  // Step: Calendar info
  return (
    <StepContainer onNext={handleFinish} nextLabel="J'ai compris" showBack={false}>
      <div className="space-y-6">
        <AssistantBubble message="Bon à savoir !" emoji="💡" variant="tip" />

        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
          <p className="text-gray-800">
            Votre planning est maintenant configuré pour chaque semaine.
          </p>

          {/* Mini calendar preview */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Aperçu</span>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, index) => (
                <div key={index} className="text-gray-500 py-1">
                  {day}
                </div>
              ))}
              {[1, 2, 3, 4, 5, 6, 0].map((dayValue) => {
                const isWorking = state.selectedDays.includes(dayValue);
                return (
                  <div
                    key={dayValue}
                    className={`w-6 h-6 mx-auto rounded-full flex items-center justify-center ${
                      isWorking ? 'bg-success-500 text-white' : 'bg-gray-200 text-gray-400'
                    }`}
                  >
                    <span className="sr-only">{isWorking ? 'Travail' : 'Repos'}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <AssistantBubble
          message="Pour gérer les exceptions (vacances, jours fériés, changements ponctuels), vous pourrez cliquer sur n'importe quel jour dans le calendrier de votre tableau de bord."
          variant="info"
        />

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <h4 className="font-medium text-blue-900 mb-2">Types d'exceptions</h4>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-center gap-2">
              <span className="w-3 h-3 bg-red-500 rounded-full"></span>
              Fermeture exceptionnelle
            </li>
            <li className="flex items-center gap-2">
              <span className="w-3 h-3 bg-amber-500 rounded-full"></span>
              Horaires ou lieu différent
            </li>
            <li className="flex items-center gap-2">
              <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
              Vacances
            </li>
          </ul>
        </div>
      </div>
    </StepContainer>
  );
}
