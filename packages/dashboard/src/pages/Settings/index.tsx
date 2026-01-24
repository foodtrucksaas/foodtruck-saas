import { useSettings } from './useSettings';
import { ProfileSection } from './ProfileSection';
import { SocialMediaSection } from './SocialMediaSection';
import { PaymentMethodsSection } from './PaymentMethodsSection';
import { BusinessInfoSection } from './BusinessInfoSection';
import { QRCodeSection } from './QRCodeSection';
import { OrderSettingsSection } from './OrderSettingsSection';
import { OffersSettingsSection } from './OffersSettingsSection';
import { AccountSection } from './AccountSection';
import ThemeSection from './ThemeSection';

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
    // Image uploads
    logoUploading,
    coverUploading,
    uploadLogo,
    removeLogo,
    uploadCover,
    removeCover,
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
          Partagez ce lien avec vos clients pour qu'ils puissent consulter votre menu et commander.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            readOnly
            value={clientLink}
            className="input flex-1 bg-gray-50 min-h-[44px]"
          />
          <button
            onClick={copyClientLink}
            className="btn-secondary min-h-[44px] active:scale-[0.98]"
          >
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
        logoUploading={logoUploading}
        coverUploading={coverUploading}
        onUploadLogo={uploadLogo}
        onRemoveLogo={removeLogo}
        onUploadCover={uploadCover}
        onRemoveCover={removeCover}
      />

      {/* Social Media Section */}
      <SocialMediaSection foodtruck={foodtruck} />

      {/* Business Info Section */}
      <BusinessInfoSection foodtruck={foodtruck} />

      {/* Payment Methods Section */}
      <PaymentMethodsSection foodtruck={foodtruck} />

      {/* QR Code Section */}
      <QRCodeSection foodtruck={foodtruck} clientLink={clientLink} />

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

      {/* Offers Settings Section */}
      <OffersSettingsSection
        foodtruck={foodtruck}
        editForm={editForm}
        editingField={editingField}
        editLoading={editLoading}
        onStartEdit={startEditing}
        onSave={saveField}
        onCancel={cancelEditing}
        onUpdateForm={updateEditForm}
      />

      {/* Theme Section */}
      <ThemeSection />

      {/* Account Section */}
      <AccountSection />
    </div>
  );
}
