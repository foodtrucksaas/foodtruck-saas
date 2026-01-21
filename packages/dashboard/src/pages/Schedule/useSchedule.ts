import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import type { Schedule, Location, ScheduleException } from '@foodtruck/shared';
import { formatLocalDate } from '@foodtruck/shared';
import { supabase } from '../../lib/supabase';
import { useFoodtruck } from '../../contexts/FoodtruckContext';

export interface ScheduleWithLocation extends Schedule {
  location: Location;
}

export interface ExceptionWithLocation extends ScheduleException {
  location?: Location | null;
}

export interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  schedules: ScheduleWithLocation[];
  exception: ExceptionWithLocation | null;
}

export interface ScheduleFormState {
  day_of_week: number;
  location_id: string;
  start_time: string;
  end_time: string;
}

export interface LocationFormState {
  name: string;
  address: string;
  latitude: string;
  longitude: string;
}

export interface DayModalFormState {
  mode: 'normal' | 'override' | 'closed';
  location_id: string;
  start_time: string;
  end_time: string;
  reason: string;
}

export function useSchedule() {
  const { foodtruck } = useFoodtruck();
  const [schedules, setSchedules] = useState<ScheduleWithLocation[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [exceptions, setExceptions] = useState<ExceptionWithLocation[]>([]);
  const [loading, setLoading] = useState(true);

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [showDayModal, setShowDayModal] = useState(false);

  // Form visibility
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [showLocationForm, setShowLocationForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'calendar' | 'recurring' | 'locations'>('calendar');

  // Edit mode
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);

  const [scheduleForm, setScheduleForm] = useState<ScheduleFormState>({
    day_of_week: 1,
    location_id: '',
    start_time: '11:00',
    end_time: '14:00',
  });

  const [locationForm, setLocationForm] = useState<LocationFormState>({
    name: '',
    address: '',
    latitude: '',
    longitude: '',
  });

  const [dayModalForm, setDayModalForm] = useState<DayModalFormState>({
    mode: 'normal',
    location_id: '',
    start_time: '11:00',
    end_time: '14:00',
    reason: '',
  });

  const fetchData = useCallback(async () => {
    if (!foodtruck) return;

    const [schedulesRes, locationsRes, exceptionsRes] = await Promise.all([
      supabase
        .from('schedules')
        .select('*, location:locations(*)')
        .eq('foodtruck_id', foodtruck.id)
        .eq('is_active', true)
        .order('day_of_week')
        .order('start_time'),
      supabase
        .from('locations')
        .select('*')
        .eq('foodtruck_id', foodtruck.id),
      supabase
        .from('schedule_exceptions')
        .select('*, location:locations(*)')
        .eq('foodtruck_id', foodtruck.id)
        .gte('date', formatLocalDate(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1)))
        .order('date'),
    ]);

    setSchedules((schedulesRes.data as ScheduleWithLocation[]) || []);
    setLocations(locationsRes.data || []);
    setExceptions((exceptionsRes.data as ExceptionWithLocation[]) || []);
    setLoading(false);
  }, [foodtruck]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calendar helpers
  const createCalendarDay = useCallback((date: Date, isCurrentMonth: boolean, today: Date): CalendarDay => {
    const dayOfWeek = date.getDay();
    const dateStr = formatLocalDate(date);
    const daySchedules = schedules.filter(s => s.day_of_week === dayOfWeek);
    const exception = exceptions.find(e => e.date === dateStr) || null;

    return {
      date,
      isCurrentMonth,
      isToday: date.getTime() === today.getTime(),
      schedules: daySchedules,
      exception,
    };
  }, [schedules, exceptions]);

  const generateCalendarDays = useCallback((): CalendarDay[] => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days: CalendarDay[] = [];
    const firstDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;

    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push(createCalendarDay(date, false, today));
    }

    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      days.push(createCalendarDay(date, true, today));
    }

    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i);
      days.push(createCalendarDay(date, false, today));
    }

    return days;
  }, [currentMonth, createCalendarDay]);

  const getEffectiveScheduleForDay = useCallback((day: CalendarDay) => {
    if (day.exception) {
      if (day.exception.is_closed) {
        return { type: 'closed' as const, reason: day.exception.reason };
      }
      return {
        type: 'override' as const,
        location: day.exception.location,
        start_time: day.exception.start_time,
        end_time: day.exception.end_time,
      };
    }
    if (day.schedules.length > 0) {
      return { type: 'normal' as const, schedules: day.schedules };
    }
    return { type: 'none' as const };
  }, []);

  // Day modal
  const openDayModal = useCallback((day: CalendarDay) => {
    setSelectedDay(day);
    const effective = getEffectiveScheduleForDay(day);

    if (effective.type === 'closed') {
      setDayModalForm({
        mode: 'closed',
        location_id: '',
        start_time: '11:00',
        end_time: '14:00',
        reason: day.exception?.reason || '',
      });
    } else if (effective.type === 'override') {
      setDayModalForm({
        mode: 'override',
        location_id: day.exception?.location_id || '',
        start_time: day.exception?.start_time || '11:00',
        end_time: day.exception?.end_time || '14:00',
        reason: day.exception?.reason || '',
      });
    } else {
      const firstSchedule = day.schedules[0];
      setDayModalForm({
        mode: 'normal',
        location_id: firstSchedule?.location_id || locations[0]?.id || '',
        start_time: firstSchedule?.start_time || '11:00',
        end_time: firstSchedule?.end_time || '14:00',
        reason: '',
      });
    }
    setShowDayModal(true);
  }, [getEffectiveScheduleForDay, locations]);

  const saveDayException = useCallback(async () => {
    if (!foodtruck || !selectedDay) return;

    const dateStr = formatLocalDate(selectedDay.date);

    // Validate: require location when in override mode
    if (dayModalForm.mode === 'override' && !dayModalForm.location_id) {
      toast.error('Sélectionnez un emplacement');
      return;
    }

    if (dayModalForm.mode === 'normal') {
      if (selectedDay.exception) {
        await supabase.from('schedule_exceptions').delete().eq('id', selectedDay.exception.id);
        toast.success('Retour au planning normal');
      }
    } else if (dayModalForm.mode === 'closed') {
      const data = {
        foodtruck_id: foodtruck.id,
        date: dateStr,
        is_closed: true,
        location_id: null,
        start_time: null,
        end_time: null,
        reason: dayModalForm.reason || null,
      };

      if (selectedDay.exception) {
        await supabase.from('schedule_exceptions').update(data).eq('id', selectedDay.exception.id);
      } else {
        await supabase.from('schedule_exceptions').insert(data);
      }
      toast.success('Jour marque comme ferme');
    } else {
      const data = {
        foodtruck_id: foodtruck.id,
        date: dateStr,
        is_closed: false,
        location_id: dayModalForm.location_id || null,
        start_time: dayModalForm.start_time,
        end_time: dayModalForm.end_time,
        reason: dayModalForm.reason || null,
      };

      if (selectedDay.exception) {
        await supabase.from('schedule_exceptions').update(data).eq('id', selectedDay.exception.id);
      } else {
        await supabase.from('schedule_exceptions').insert(data);
      }
      toast.success('Planning modifie pour ce jour');
    }

    setShowDayModal(false);
    fetchData();
  }, [foodtruck, selectedDay, dayModalForm, fetchData]);

  // Location functions
  const resetLocationForm = useCallback(() => {
    setLocationForm({ name: '', address: '', latitude: '', longitude: '' });
    setEditingLocationId(null);
    setShowLocationForm(false);
  }, []);

  const startEditLocation = useCallback((location: Location) => {
    setLocationForm({
      name: location.name,
      address: location.address || '',
      latitude: location.latitude?.toString() || '',
      longitude: location.longitude?.toString() || '',
    });
    setEditingLocationId(location.id);
    setShowLocationForm(true);
  }, []);

  const handleLocationSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foodtruck) return;

    const lat = locationForm.latitude ? parseFloat(locationForm.latitude) : null;
    const lng = locationForm.longitude ? parseFloat(locationForm.longitude) : null;

    if ((lat && !lng) || (!lat && lng)) {
      toast.error('Latitude et longitude doivent etre fournies ensemble');
      return;
    }

    const data = {
      name: locationForm.name,
      address: locationForm.address || null,
      latitude: lat,
      longitude: lng,
    };

    if (editingLocationId) {
      const { error } = await supabase.from('locations').update(data).eq('id', editingLocationId);
      if (error) {
        toast.error('Erreur lors de la modification');
      } else {
        toast.success('Emplacement modifie');
        resetLocationForm();
        fetchData();
      }
    } else {
      const { error } = await supabase.from('locations').insert({ ...data, foodtruck_id: foodtruck.id });
      if (error) {
        toast.error('Erreur lors de la creation');
      } else {
        toast.success('Emplacement ajoute');
        resetLocationForm();
        fetchData();
      }
    }
  }, [foodtruck, locationForm, editingLocationId, resetLocationForm, fetchData]);

  const deleteLocation = useCallback(async (id: string) => {
    if (!confirm('Supprimer cet emplacement ?')) return;
    await supabase.from('locations').delete().eq('id', id);
    toast.success('Emplacement supprime');
    fetchData();
  }, [fetchData]);

  // Schedule functions
  const resetScheduleForm = useCallback(() => {
    setScheduleForm({ day_of_week: 1, location_id: '', start_time: '11:00', end_time: '14:00' });
    setEditingScheduleId(null);
    setShowScheduleForm(false);
  }, []);

  const startEditSchedule = useCallback((schedule: ScheduleWithLocation) => {
    setScheduleForm({
      day_of_week: schedule.day_of_week,
      location_id: schedule.location_id,
      start_time: schedule.start_time,
      end_time: schedule.end_time,
    });
    setEditingScheduleId(schedule.id);
    setShowScheduleForm(true);
  }, []);

  const handleScheduleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foodtruck) return;

    const data = {
      day_of_week: scheduleForm.day_of_week,
      location_id: scheduleForm.location_id,
      start_time: scheduleForm.start_time,
      end_time: scheduleForm.end_time,
    };

    if (editingScheduleId) {
      const { error } = await supabase.from('schedules').update(data).eq('id', editingScheduleId);
      if (error) {
        toast.error('Erreur lors de la modification');
      } else {
        toast.success('Horaire modifie');
        resetScheduleForm();
        fetchData();
      }
    } else {
      const { error } = await supabase.from('schedules').insert({ ...data, foodtruck_id: foodtruck.id });
      if (error) {
        toast.error('Erreur lors de la creation');
      } else {
        toast.success('Horaire ajoute');
        resetScheduleForm();
        fetchData();
      }
    }
  }, [foodtruck, scheduleForm, editingScheduleId, resetScheduleForm, fetchData]);

  const deleteSchedule = useCallback(async (id: string) => {
    if (!confirm('Supprimer cet horaire ?')) return;
    await supabase.from('schedules').delete().eq('id', id);
    toast.success('Horaire supprime');
    fetchData();
  }, [fetchData]);

  // Month navigation
  const goToPreviousMonth = useCallback(() => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  }, [currentMonth]);

  const goToNextMonth = useCallback(() => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  }, [currentMonth]);

  return {
    // Data
    schedules,
    locations,
    loading,
    currentMonth,
    selectedDay,
    activeTab,

    // Forms
    scheduleForm,
    setScheduleForm,
    locationForm,
    setLocationForm,
    dayModalForm,
    setDayModalForm,
    showScheduleForm,
    showLocationForm,
    showDayModal,
    editingLocationId,
    editingScheduleId,

    // Calendar
    generateCalendarDays,
    getEffectiveScheduleForDay,
    goToPreviousMonth,
    goToNextMonth,

    // Actions
    setActiveTab,
    setShowDayModal,
    openDayModal,
    saveDayException,
    resetLocationForm,
    startEditLocation,
    handleLocationSubmit,
    deleteLocation,
    resetScheduleForm,
    startEditSchedule,
    handleScheduleSubmit,
    deleteSchedule,
    setShowScheduleForm,
    setShowLocationForm,
  };
}
