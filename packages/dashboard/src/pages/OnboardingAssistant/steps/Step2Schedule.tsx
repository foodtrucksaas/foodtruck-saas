import { useState, useEffect, useMemo } from 'react';
import { MapPin, Plus, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useToast, Toast } from '../../../components/Alert';
import { StepContainer } from '../components';

interface Location {
  id: string;
  name: string;
}

interface ScheduleSlot {
  id: string;
  day_of_week: number;
  location_id: string;
  start_time: string;
  end_time: string;
}

interface Step2ScheduleProps {
  foodtruckId: string;
  onNext: () => void;
  onBack: () => void;
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

export function Step2Schedule({ foodtruckId, onNext, onBack }: Step2ScheduleProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const { toast, hideToast, showError } = useToast();

  // Load locations and schedules from DB
  useEffect(() => {
    const load = async () => {
      const [locsRes, schedsRes] = await Promise.all([
        supabase
          .from('locations')
          .select('id, name')
          .eq('foodtruck_id', foodtruckId)
          .order('created_at'),
        supabase
          .from('schedules')
          .select('*')
          .eq('foodtruck_id', foodtruckId)
          .eq('is_active', true)
          .order('start_time'),
      ]);

      if (locsRes.data) {
        setLocations(locsRes.data.map((l) => ({ id: l.id, name: l.name })));
      }
      if (schedsRes.data) {
        setSlots(
          schedsRes.data.map((s) => ({
            id: s.id,
            day_of_week: s.day_of_week,
            location_id: s.location_id,
            start_time: s.start_time?.slice(0, 5) || '11:00',
            end_time: s.end_time?.slice(0, 5) || '14:00',
          }))
        );
        // Auto-expand first day that has slots
        if (schedsRes.data.length > 0) {
          setExpandedDay(schedsRes.data[0].day_of_week);
        }
      }
      setLoading(false);
    };
    load();
  }, [foodtruckId]);

  // Group slots by day
  const slotsByDay = useMemo(() => {
    const map = new Map<number, ScheduleSlot[]>();
    for (const slot of slots) {
      const existing = map.get(slot.day_of_week) || [];
      existing.push(slot);
      map.set(slot.day_of_week, existing);
    }
    return map;
  }, [slots]);

  const defaultLocationId = locations[0]?.id || '';

  const handleAddSlot = async (dayOfWeek: number) => {
    if (!defaultLocationId) return;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('schedules')
        .insert({
          foodtruck_id: foodtruckId,
          day_of_week: dayOfWeek,
          location_id: defaultLocationId,
          start_time: '11:00',
          end_time: '14:00',
          is_active: true,
        })
        .select('id')
        .single();

      if (error) throw error;

      setSlots((prev) => [
        ...prev,
        {
          id: data.id,
          day_of_week: dayOfWeek,
          location_id: defaultLocationId,
          start_time: '11:00',
          end_time: '14:00',
        },
      ]);
      setExpandedDay(dayOfWeek);
    } catch (err) {
      console.error('Error adding slot:', err);
      showError("Erreur lors de l'ajout");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateSlot = async (
    slotId: string,
    field: 'location_id' | 'start_time' | 'end_time',
    value: string
  ) => {
    // Update local state immediately
    setSlots((prev) => prev.map((s) => (s.id === slotId ? { ...s, [field]: value } : s)));

    // Persist to DB
    try {
      await supabase
        .from('schedules')
        .update({ [field]: value })
        .eq('id', slotId);
    } catch (err) {
      console.error('Error updating slot:', err);
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    try {
      await supabase.from('schedules').delete().eq('id', slotId);
      setSlots((prev) => prev.filter((s) => s.id !== slotId));
    } catch (err) {
      console.error('Error deleting slot:', err);
      showError('Erreur lors de la suppression');
    }
  };

  const hasSlots = slots.length > 0;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <StepContainer onBack={onBack} onNext={onNext} nextLabel="Continuer" nextDisabled={!hasSlots}>
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Votre planning</h2>
          <p className="text-sm text-gray-500 mt-1">
            Configurez vos jours et horaires de travail. Vous pouvez ajouter plusieurs creneaux par
            jour.
          </p>
        </div>

        {/* Days list */}
        <div className="space-y-2">
          {DAYS_OF_WEEK.map((day) => {
            const daySlots = slotsByDay.get(day.value) || [];
            const isExpanded = expandedDay === day.value;
            const isActive = daySlots.length > 0;

            return (
              <div
                key={day.value}
                className={`border rounded-xl overflow-hidden transition-colors ${
                  isActive ? 'border-primary-200 bg-white' : 'border-gray-200 bg-gray-50/50'
                }`}
              >
                {/* Day header */}
                <button
                  type="button"
                  onClick={() => setExpandedDay(isExpanded ? null : day.value)}
                  className="w-full flex items-center justify-between p-3.5 text-left"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-sm font-semibold ${
                        isActive ? 'text-gray-900' : 'text-gray-400'
                      }`}
                    >
                      {day.label}
                    </span>
                    {isActive && (
                      <span className="text-xs text-gray-500">
                        {daySlots.length} creneau{daySlots.length > 1 ? 'x' : ''}
                      </span>
                    )}
                  </div>
                  {isActive ? (
                    <span className="text-xs text-primary-500 font-medium">
                      {daySlots.map((s) => `${s.start_time}-${s.end_time}`).join(', ')}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">Repos</span>
                  )}
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="px-3.5 pb-3.5 space-y-2 border-t border-gray-100 pt-3">
                    {daySlots.map((slot) => {
                      const isTimeValid = slot.start_time < slot.end_time;
                      return (
                        <div key={slot.id}>
                          <div className="flex items-center gap-2">
                            {/* Location */}
                            {locations.length > 1 && (
                              <select
                                value={slot.location_id}
                                onChange={(e) =>
                                  handleUpdateSlot(slot.id, 'location_id', e.target.value)
                                }
                                className="input text-sm min-h-[40px] flex-1 min-w-0"
                              >
                                {locations.map((loc) => (
                                  <option key={loc.id} value={loc.id}>
                                    {loc.name}
                                  </option>
                                ))}
                              </select>
                            )}
                            {locations.length === 1 && (
                              <div className="flex items-center gap-1.5 text-sm text-gray-600 flex-1 min-w-0">
                                <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                <span className="truncate">{locations[0].name}</span>
                              </div>
                            )}

                            {/* Time range */}
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <input
                                type="time"
                                value={slot.start_time}
                                onChange={(e) =>
                                  handleUpdateSlot(slot.id, 'start_time', e.target.value)
                                }
                                className={`input text-sm min-h-[40px] w-[100px] ${!isTimeValid ? 'border-red-300' : ''}`}
                              />
                              <span className="text-gray-400 text-xs">-</span>
                              <input
                                type="time"
                                value={slot.end_time}
                                onChange={(e) =>
                                  handleUpdateSlot(slot.id, 'end_time', e.target.value)
                                }
                                className={`input text-sm min-h-[40px] w-[100px] ${!isTimeValid ? 'border-red-300' : ''}`}
                              />
                            </div>

                            {/* Delete */}
                            <button
                              type="button"
                              onClick={() => handleDeleteSlot(slot.id)}
                              className="p-1.5 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                              aria-label="Supprimer ce creneau"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {!isTimeValid && (
                            <p className="text-xs text-red-600 mt-1">
                              L'heure de fin doit être après l'heure de début
                            </p>
                          )}
                        </div>
                      );
                    })}

                    {/* Add slot button */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleAddSlot(day.value)}
                        disabled={saving}
                        className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors disabled:opacity-50"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Ajouter un creneau
                      </button>
                    </div>
                  </div>
                )}

                {/* Quick add button when collapsed and no slots */}
                {!isExpanded && !isActive && (
                  <div className="px-3.5 pb-3">
                    <button
                      type="button"
                      onClick={() => {
                        handleAddSlot(day.value);
                      }}
                      disabled={saving}
                      className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-primary-500 transition-colors disabled:opacity-50"
                    >
                      <Plus className="w-3 h-3" />
                      Ajouter
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Info */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-sm text-blue-800">
          <span className="font-medium">Bon a savoir :</span> vous pourrez gerer les exceptions
          (vacances, jours feries) depuis la page Planning du tableau de bord.
        </div>
      </div>
      <Toast {...toast} onDismiss={hideToast} />
    </StepContainer>
  );
}
