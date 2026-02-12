import { useState, useMemo, useEffect } from 'react';
import { Calendar, Clock, MapPin, Copy, Check } from 'lucide-react';
import { useOnboarding } from '../OnboardingContext';
import { AssistantBubble, StepContainer } from '../components';

interface Step2ScheduleProps {
  saveSchedules: (
    locationIds: string[],
    schedulesOverride?: import('../OnboardingContext').OnboardingSchedule[]
  ) => Promise<void>;
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'Lundi', short: 'Lun' },
  { value: 2, label: 'Mardi', short: 'Mar' },
  { value: 3, label: 'Mercredi', short: 'Mer' },
  { value: 4, label: 'Jeudi', short: 'Jeu' },
  { value: 5, label: 'Vendredi', short: 'Ven' },
  { value: 6, label: 'Samedi', short: 'Sam' },
  { value: 0, label: 'Dimanche', short: 'Dim' },
];

type ScheduleSubStep = 'select-days' | 'configure-days';

export function Step2Schedule({ saveSchedules }: Step2ScheduleProps) {
  const { state, dispatch, nextStep, prevStep } = useOnboarding();
  const [saving, setSaving] = useState(false);

  // Sort selected days in order (Mon-Sun) — computed first so init fns can use it
  const sortedSelectedDays = useMemo(() => {
    return [...state.selectedDays].sort((a, b) => {
      const orderA = a === 0 ? 7 : a;
      const orderB = b === 0 ? 7 : b;
      return orderA - orderB;
    });
  }, [state.selectedDays]);

  const currentDayValue = sortedSelectedDays[state.currentDayIndex];

  // Restore sub-step if days were already selected
  const [subStep, setSubStep] = useState<ScheduleSubStep>(() => {
    if (state.selectedDays.length > 0) {
      return 'configure-days';
    }
    return 'select-days';
  });

  // Initialize config from saved schedule for current day (or defaults)
  const [currentDayConfig, setCurrentDayConfig] = useState(() => {
    const saved = state.schedules.find((s) => s.day_of_week === currentDayValue);
    return saved
      ? { location_id: saved.location_id, start_time: saved.start_time, end_time: saved.end_time }
      : { location_id: state.locations[0]?.id || '', start_time: '11:00', end_time: '14:00' };
  });

  // Sync config when navigating between days
  useEffect(() => {
    if (currentDayValue == null) return;
    const saved = state.schedules.find((s) => s.day_of_week === currentDayValue);
    if (saved) {
      setCurrentDayConfig({
        location_id: saved.location_id,
        start_time: saved.start_time,
        end_time: saved.end_time,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDayValue]);
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

  const isTimeValid = currentDayConfig.start_time < currentDayConfig.end_time;

  const doSaveSchedules = async (schedules: typeof state.schedules) => {
    const locationIds = state.locations.map((l) => l.id).filter(Boolean) as string[];
    if (locationIds.length === 0) return;
    setSaving(true);
    try {
      await saveSchedules(locationIds, schedules);
    } catch (err) {
      console.error('Error saving schedules:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDay = async () => {
    // Save schedule for current day
    const schedule = {
      day_of_week: currentDayValue,
      location_id: currentDayConfig.location_id,
      start_time: currentDayConfig.start_time,
      end_time: currentDayConfig.end_time,
    };

    // Update or add schedule
    const existingIndex = state.schedules.findIndex((s) => s.day_of_week === currentDayValue);
    let newSchedules: typeof state.schedules;
    if (existingIndex >= 0) {
      newSchedules = [...state.schedules];
      newSchedules[existingIndex] = schedule;
    } else {
      newSchedules = [...state.schedules, schedule];
    }
    dispatch({ type: 'SET_SCHEDULES', schedules: newSchedules });

    // Move to next day or finish — pre-fill next day with current config
    if (isLastDay) {
      await doSaveSchedules(newSchedules);
      nextStep();
      return;
    } else {
      dispatch({ type: 'SET_CURRENT_DAY_INDEX', index: state.currentDayIndex + 1 });
      // Keep current config for the next day (pre-fill)
    }
  };

  const handleCopyToAll = async () => {
    // Copy current config to all remaining days
    const newSchedules = sortedSelectedDays.map((dayValue) => ({
      day_of_week: dayValue,
      location_id: currentDayConfig.location_id,
      start_time: currentDayConfig.start_time,
      end_time: currentDayConfig.end_time,
    }));
    dispatch({ type: 'SET_SCHEDULES', schedules: newSchedules });
    await doSaveSchedules(newSchedules);
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
                  className={`flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl border-2 transition-all active:scale-95 ${
                    isSelected
                      ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-md'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600 shadow-card'
                  }`}
                >
                  <span className="text-sm font-medium">{day.short}</span>
                  <Check
                    className={`w-4 h-4 mt-1 transition-opacity ${isSelected ? 'text-primary-500 opacity-100' : 'opacity-0'}`}
                  />
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
        nextDisabled={!isTimeValid}
        nextLoading={saving}
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
          <div className="bg-white border border-gray-100 rounded-2xl p-4 text-center shadow-card">
            <Calendar className="w-8 h-8 text-primary-500 mx-auto mb-2" />
            <h3 className="text-lg font-bold text-gray-900">{currentDay.label}</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              Jour {state.currentDayIndex + 1} sur {sortedSelectedDays.length}
            </p>
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
                Début
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
                Fin
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

          {/* Time validation warning */}
          {!isTimeValid && currentDayConfig.start_time && currentDayConfig.end_time && (
            <p className="text-sm text-red-500">L'heure de fin doit être après l'heure de début.</p>
          )}

          {/* Info about exceptions */}
          {isLastDay && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-sm text-blue-800">
              <span className="font-medium">Bon à savoir :</span> Pour les exceptions (vacances,
              jours fériés), vous pourrez les gérer depuis la page Planning.
            </div>
          )}

          {/* Copy to all remaining days button */}
          {sortedSelectedDays.length > 1 && !isLastDay && (
            <button
              type="button"
              onClick={handleCopyToAll}
              className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 rounded-2xl text-gray-600 hover:border-primary-300 hover:text-primary-600 hover:bg-primary-50 transition-colors font-medium"
            >
              <Copy className="w-4 h-4" />
              Appliquer aux jours restants
            </button>
          )}
        </div>
      </StepContainer>
    );
  }

  return null;
}
