import { Store, Check, MapPin, Building2, Image as ImageIcon } from 'lucide-react';
import { CUISINE_TYPES } from '@foodtruck/shared';
import { EditableField } from './EditableField';
import { ToggleCards } from './ToggleCards';
import { ImageUpload } from '../../components/ImageUpload';
import type { EditingField, EditFormState } from './useSettings';
import type { Foodtruck } from '@foodtruck/shared';

interface ProfileSectionProps {
  foodtruck: Foodtruck | null;
  editForm: EditFormState;
  editingField: EditingField;
  editLoading: boolean;
  onStartEdit: (field: EditingField) => void;
  onSave: (field: EditingField) => void;
  onCancel: () => void;
  onUpdateForm: <K extends keyof EditFormState>(key: K, value: EditFormState[K]) => void;
  onToggleCuisineType: (type: string) => void;
  // Image uploads
  logoUploading: boolean;
  coverUploading: boolean;
  onUploadLogo: (file: File) => Promise<void>;
  onRemoveLogo: () => Promise<void>;
  onUploadCover: (file: File) => Promise<void>;
  onRemoveCover: () => Promise<void>;
}

export function ProfileSection({
  foodtruck,
  editForm,
  editingField,
  editLoading,
  onStartEdit,
  onSave,
  onCancel,
  onUpdateForm,
  onToggleCuisineType,
  logoUploading,
  coverUploading,
  onUploadLogo,
  onRemoveLogo,
  onUploadCover,
  onRemoveCover,
}: ProfileSectionProps) {
  return (
    <section className="card p-6">
      <div className="flex items-center gap-3 mb-6">
        <Store className="w-6 h-6 text-primary-500" />
        <h2 className="text-lg font-semibold text-gray-900">Profil du food truck</h2>
      </div>

      <div className="space-y-6">
        {/* Images */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-700">Images</h3>

          {/* Cover Image */}
          <div>
            <label className="block text-xs text-gray-500 mb-2">Image de couverture</label>
            <ImageUpload
              currentUrl={foodtruck?.cover_image_url}
              onUpload={onUploadCover}
              onRemove={onRemoveCover}
              uploading={coverUploading}
              aspectRatio="cover"
              placeholder="Ajouter une bannière"
            />
          </div>

          {/* Logo */}
          <div>
            <label className="block text-xs text-gray-500 mb-2">Logo</label>
            <ImageUpload
              currentUrl={foodtruck?.logo_url}
              onUpload={onUploadLogo}
              onRemove={onRemoveLogo}
              uploading={logoUploading}
              aspectRatio="square"
              placeholder="Ajouter un logo"
              className="w-32"
            />
          </div>
        </div>

        <hr className="border-gray-200" />

        {/* Nom */}
        <EditableField
          label="Nom du food truck"
          field="name"
          editingField={editingField}
          editLoading={editLoading}
          onStartEdit={onStartEdit}
          onSave={onSave}
          onCancel={onCancel}
          displayValue={<p className="text-gray-900 font-medium">{foodtruck?.name || '-'}</p>}
          editContent={
            <input
              type="text"
              value={editForm.name}
              onChange={(e) => onUpdateForm('name', e.target.value)}
              className="input"
              autoFocus
            />
          }
        />

        {/* Types de cuisine */}
        <EditableField
          label="Types de cuisine"
          field="cuisine_types"
          editingField={editingField}
          editLoading={editLoading}
          onStartEdit={onStartEdit}
          onSave={onSave}
          onCancel={onCancel}
          displayValue={
            <div className="flex flex-wrap gap-2">
              {foodtruck?.cuisine_types?.length ? (
                foodtruck.cuisine_types.map((type) => (
                  <span key={type} className="px-2 py-1 bg-primary-50 text-primary-700 rounded-md text-sm font-medium">
                    {type}
                  </span>
                ))
              ) : (
                <span className="text-gray-400">-</span>
              )}
            </div>
          }
          editContent={
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CUISINE_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => onToggleCuisineType(type)}
                  className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                    editForm.cuisine_types.includes(type)
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {editForm.cuisine_types.includes(type) && <Check className="w-4 h-4" />}
                  {type}
                </button>
              ))}
            </div>
          }
        />

        {/* Type d'activite */}
        <EditableField
          label="Type d'activite"
          field="is_mobile"
          editingField={editingField}
          editLoading={editLoading}
          onStartEdit={onStartEdit}
          onSave={onSave}
          onCancel={onCancel}
          displayValue={
            <div className="flex items-center gap-2">
              {foodtruck?.is_mobile ? (
                <>
                  <MapPin className="w-5 h-5 text-primary-500" />
                  <span className="text-gray-900 font-medium">Itinerant</span>
                </>
              ) : (
                <>
                  <Building2 className="w-5 h-5 text-primary-500" />
                  <span className="text-gray-900 font-medium">Fixe</span>
                </>
              )}
            </div>
          }
          editContent={
            <ToggleCards
              currentValue={editForm.is_mobile}
              onChange={(value) => onUpdateForm('is_mobile', value)}
              options={[
                { value: false, icon: Building2, title: 'Fixe', description: 'Toujours au meme endroit' },
                { value: true, icon: MapPin, title: 'Itinerant', description: 'Change d\'emplacement selon le planning' },
              ]}
            />
          }
        />

        {/* Description */}
        <EditableField
          label="Description"
          field="description"
          editingField={editingField}
          editLoading={editLoading}
          onStartEdit={onStartEdit}
          onSave={onSave}
          onCancel={onCancel}
          displayValue={
            <p className="text-gray-900">
              {foodtruck?.description || <span className="text-gray-400">Aucune description</span>}
            </p>
          }
          editContent={
            <textarea
              value={editForm.description}
              onChange={(e) => onUpdateForm('description', e.target.value)}
              className="input min-h-[100px] resize-none"
              placeholder="Decrivez votre food truck..."
              autoFocus
            />
          }
        />

        {/* Contact */}
        <EditableField
          label="Contact"
          field="contact"
          editingField={editingField}
          editLoading={editLoading}
          onStartEdit={onStartEdit}
          onSave={onSave}
          onCancel={onCancel}
          hasBorder={false}
          displayValue={
            <div className="space-y-1">
              <p className="text-gray-900">{foodtruck?.phone || <span className="text-gray-400">Aucun telephone</span>}</p>
              <p className="text-gray-900">{foodtruck?.email || <span className="text-gray-400">Aucun email</span>}</p>
            </div>
          }
          editContent={
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="label text-xs">Telephone</label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => onUpdateForm('phone', e.target.value)}
                  className="input"
                  placeholder="06 12 34 56 78"
                  autoFocus
                />
              </div>
              <div>
                <label className="label text-xs">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => onUpdateForm('email', e.target.value)}
                  className="input"
                  placeholder="contact@example.com"
                />
              </div>
            </div>
          }
        />

        {/* Affichage des photos */}
        <EditableField
          label="Affichage du menu"
          field="show_menu_photos"
          editingField={editingField}
          editLoading={editLoading}
          onStartEdit={onStartEdit}
          onSave={onSave}
          onCancel={onCancel}
          hasBorder={false}
          displayValue={
            <div className="flex items-center gap-2">
              {foodtruck?.show_menu_photos !== false ? (
                <>
                  <ImageIcon className="w-5 h-5 text-primary-500" />
                  <span className="text-gray-900 font-medium">Avec photos</span>
                </>
              ) : (
                <>
                  <Store className="w-5 h-5 text-primary-500" />
                  <span className="text-gray-900 font-medium">Sans photos</span>
                </>
              )}
            </div>
          }
          editContent={
            <ToggleCards
              currentValue={editForm.show_menu_photos}
              onChange={(value) => onUpdateForm('show_menu_photos', value)}
              options={[
                { value: true, icon: ImageIcon, title: 'Avec photos', description: 'Les photos des plats sont affichees' },
                { value: false, icon: Store, title: 'Sans photos', description: 'Menu en mode liste simple' },
              ]}
            />
          }
        />
      </div>
    </section>
  );
}
