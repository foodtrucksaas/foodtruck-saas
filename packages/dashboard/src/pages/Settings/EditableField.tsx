import { ReactNode } from 'react';
import { Loader2, Pencil, X } from 'lucide-react';
import type { EditingField } from './useSettings';

interface EditableFieldProps {
  label: string;
  field: EditingField;
  editingField: EditingField;
  editLoading: boolean;
  displayValue: ReactNode;
  editContent: ReactNode;
  onStartEdit: (field: EditingField) => void;
  onSave: (field: EditingField) => void;
  onCancel: () => void;
  hasBorder?: boolean;
}

export function EditableField({
  label,
  field,
  editingField,
  editLoading,
  displayValue,
  editContent,
  onStartEdit,
  onSave,
  onCancel,
  hasBorder = true,
}: EditableFieldProps) {
  const isEditing = editingField === field;

  return (
    <div className={hasBorder ? 'border-b border-gray-100 pb-4' : ''}>
      <div className="flex items-center justify-between mb-1">
        <label className="text-sm font-medium text-gray-500">{label}</label>
        {!isEditing && (
          <button
            onClick={() => onStartEdit(field)}
            className="text-primary-500 hover:text-primary-600 text-sm font-medium flex items-center gap-1"
          >
            <Pencil className="w-3.5 h-3.5" />
            Modifier
          </button>
        )}
      </div>
      {isEditing ? (
        <div className="space-y-3">
          {editContent}
          <EditButtons
            loading={editLoading}
            onSave={() => onSave(field)}
            onCancel={onCancel}
          />
        </div>
      ) : (
        displayValue
      )}
    </div>
  );
}

interface EditButtonsProps {
  loading: boolean;
  onSave: () => void;
  onCancel: () => void;
}

export function EditButtons({ loading, onSave, onCancel }: EditButtonsProps) {
  return (
    <div className="flex gap-2">
      <button
        onClick={onSave}
        disabled={loading}
        className="btn-primary text-sm py-2"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Valider'}
      </button>
      <button
        onClick={onCancel}
        disabled={loading}
        className="btn-secondary text-sm py-2"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
