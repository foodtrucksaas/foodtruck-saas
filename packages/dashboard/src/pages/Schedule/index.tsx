import { Calendar, Clock, MapPin } from 'lucide-react';
import { useSchedule } from './useSchedule';
import { CalendarView } from './CalendarView';
import { RecurringScheduleTab } from './RecurringScheduleTab';
import { LocationsTab } from './LocationsTab';
import { DayModal } from './DayModal';

export default function SchedulePage() {
  const {
    schedules,
    locations,
    loading,
    currentMonth,
    selectedDay,
    activeTab,
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
    generateCalendarDays,
    getEffectiveScheduleForDay,
    goToPreviousMonth,
    goToNextMonth,
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
  } = useSchedule();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const calendarDays = generateCalendarDays();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Planning</h1>
        <p className="text-gray-600">Gérez vos horaires, emplacements et exceptions</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('calendar')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'calendar' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Calendar className="w-4 h-4 inline mr-2" />
          Calendrier
        </button>
        <button
          onClick={() => setActiveTab('recurring')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'recurring' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Clock className="w-4 h-4 inline mr-2" />
          Horaires récurrents
        </button>
        <button
          onClick={() => setActiveTab('locations')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'locations' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <MapPin className="w-4 h-4 inline mr-2" />
          Emplacements
        </button>
      </div>

      {/* Calendar Tab */}
      {activeTab === 'calendar' && (
        <CalendarView
          currentMonth={currentMonth}
          calendarDays={calendarDays}
          onPreviousMonth={goToPreviousMonth}
          onNextMonth={goToNextMonth}
          onDayClick={openDayModal}
          getEffectiveScheduleForDay={getEffectiveScheduleForDay}
        />
      )}

      {/* Recurring Schedule Tab */}
      {activeTab === 'recurring' && (
        <RecurringScheduleTab
          schedules={schedules}
          locations={locations}
          showForm={showScheduleForm}
          editingId={editingScheduleId}
          form={scheduleForm}
          onFormChange={setScheduleForm}
          onShowForm={() => { resetScheduleForm(); setShowScheduleForm(true); }}
          onResetForm={resetScheduleForm}
          onSubmit={handleScheduleSubmit}
          onEdit={startEditSchedule}
          onDelete={deleteSchedule}
        />
      )}

      {/* Locations Tab */}
      {activeTab === 'locations' && (
        <LocationsTab
          locations={locations}
          showForm={showLocationForm}
          editingId={editingLocationId}
          form={locationForm}
          onFormChange={setLocationForm}
          onShowForm={() => { resetLocationForm(); setShowLocationForm(true); }}
          onResetForm={resetLocationForm}
          onSubmit={handleLocationSubmit}
          onEdit={startEditLocation}
          onDelete={deleteLocation}
        />
      )}

      {/* Day Modal */}
      {showDayModal && selectedDay && (
        <DayModal
          selectedDay={selectedDay}
          locations={locations}
          form={dayModalForm}
          onFormChange={setDayModalForm}
          onClose={() => setShowDayModal(false)}
          onSave={saveDayException}
        />
      )}
    </div>
  );
}
