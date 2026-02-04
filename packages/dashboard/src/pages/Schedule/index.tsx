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
    <div className="space-y-4 sm:space-y-6">
      {/* Header - hidden on mobile (Layout provides header) */}
      <div className="hidden sm:block">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Planning</h1>
        <p className="text-sm sm:text-base text-gray-600">
          Gerez vos horaires, emplacements et exceptions
        </p>
      </div>

      {/* Tabs - full width on mobile, scrollable */}
      <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 no-scrollbar">
        <div className="flex gap-1 bg-gray-100/80 p-1.5 rounded-2xl w-full sm:w-fit backdrop-blur-sm min-w-max">
          <button
            onClick={() => setActiveTab('calendar')}
            className={`flex-1 sm:flex-none px-3 sm:px-4 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm font-medium transition-all active:scale-95 flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap ${
              activeTab === 'calendar'
                ? 'bg-white shadow-md text-gray-900'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Calendrier
          </button>
          <button
            onClick={() => setActiveTab('recurring')}
            className={`flex-1 sm:flex-none px-3 sm:px-4 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm font-medium transition-all active:scale-95 flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap ${
              activeTab === 'recurring'
                ? 'bg-white shadow-md text-gray-900'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`}
          >
            <Clock className="w-4 h-4" />
            Horaires
          </button>
          <button
            onClick={() => setActiveTab('locations')}
            className={`flex-1 sm:flex-none px-3 sm:px-4 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm font-medium transition-all active:scale-95 flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap ${
              activeTab === 'locations'
                ? 'bg-white shadow-md text-gray-900'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`}
          >
            <MapPin className="w-4 h-4" />
            Lieux
          </button>
        </div>
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
          onShowForm={() => {
            resetScheduleForm();
            setShowScheduleForm(true);
          }}
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
          onShowForm={() => {
            resetLocationForm();
            setShowLocationForm(true);
          }}
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
