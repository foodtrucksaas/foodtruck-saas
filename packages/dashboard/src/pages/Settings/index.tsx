import { useSettings } from './useSettings';
import { ProfileSection } from './ProfileSection';
import { OrderSettingsSection } from './OrderSettingsSection';

export default function Settings() {
  const {
    foodtruck,
    clientLink,
    editForm,
    editingField,
    editLoading,
    startEditing,
    cancelEditing,
    saveField,
    toggleCuisineType,
    updateEditForm,
    copyClientLink,
  } = useSettings();

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
        <p className="text-gray-600">Gérez les informations de votre food truck</p>
      </div>

      {/* Client Link */}
      <section className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Lien client</h2>
        <p className="text-gray-600 mb-4">
          Partagez ce lien avec vos clients pour qu'ils puissent consulter votre menu et
          commander.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            readOnly
            value={clientLink}
            className="input flex-1 bg-gray-50"
          />
          <button onClick={copyClientLink} className="btn-secondary">
            Copier
          </button>
        </div>
      </section>

      {/* Profile Section */}
      <ProfileSection
        foodtruck={foodtruck}
        editForm={editForm}
        editingField={editingField}
        editLoading={editLoading}
        onStartEdit={startEditing}
        onSave={saveField}
        onCancel={cancelEditing}
        onUpdateForm={updateEditForm}
        onToggleCuisineType={toggleCuisineType}
      />

      {/* Order Settings Section */}
      <OrderSettingsSection
        foodtruck={foodtruck}
        editForm={editForm}
        editingField={editingField}
        editLoading={editLoading}
        onStartEdit={startEditing}
        onSave={saveField}
        onCancel={cancelEditing}
        onUpdateForm={updateEditForm}
      />
    </div>
  );
}
