import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, ChevronDown, GripVertical } from 'lucide-react';
import type { Category, MenuItem } from '@foodtruck/shared';
import { Modal, Button, Input } from '@foodtruck/shared/components';

export interface CategoryFormData {
  name: string;
  display_order: number;
}

interface CategoryManagerProps {
  isOpen: boolean;
  categories: Category[];
  groupedItems: Record<string, MenuItem[]>;
  onCreateCategory: (data: CategoryFormData) => Promise<void>;
  onUpdateCategory: (id: string, data: CategoryFormData) => Promise<void>;
  onDeleteCategory: (category: Category) => Promise<void>;
  onMoveCategoryUp: (category: Category, index: number) => Promise<void>;
  onMoveCategoryDown: (category: Category, index: number) => Promise<void>;
  openWithForm?: boolean;
  onOpenWithFormHandled?: () => void;
}

export function CategoryManager({
  isOpen,
  categories,
  groupedItems,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
  onMoveCategoryUp,
  onMoveCategoryDown,
  openWithForm,
  onOpenWithFormHandled,
}: CategoryManagerProps) {
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryFormData, setCategoryFormData] = useState<CategoryFormData>({
    name: '',
    display_order: 0,
  });

  // Open form directly when openWithForm is true
  useEffect(() => {
    if (openWithForm && isOpen) {
      setCategoryFormData({ name: '', display_order: 0 });
      setEditingCategory(null);
      setShowCategoryForm(true);
      onOpenWithFormHandled?.();
    }
  }, [openWithForm, isOpen, onOpenWithFormHandled]);

  const resetCategoryForm = () => {
    setCategoryFormData({ name: '', display_order: 0 });
    setEditingCategory(null);
    setShowCategoryForm(false);
  };

  const handleEditCategory = (category: Category) => {
    setCategoryFormData({
      name: category.name,
      display_order: category.display_order ?? 0,
    });
    setEditingCategory(category);
    setShowCategoryForm(true);
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingCategory) {
      await onUpdateCategory(editingCategory.id, categoryFormData);
    } else {
      await onCreateCategory(categoryFormData);
    }
    resetCategoryForm();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="card p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Gérer les catégories</h2>
          <Button
            variant="secondary"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => {
              setCategoryFormData({ name: '', display_order: 0 });
              setEditingCategory(null);
              setShowCategoryForm(true);
            }}
          >
            Nouvelle catégorie
          </Button>
        </div>

        {categories.length === 0 ? (
          <p className="text-gray-500 text-sm">Aucune catégorie. Créez-en une pour organiser vos plats.</p>
        ) : (
          <div className="space-y-2">
            {categories.map((category, index) => (
              <div
                key={category.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="flex flex-col">
                    <button
                      onClick={() => onMoveCategoryUp(category, index)}
                      disabled={index === 0}
                      className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    >
                      <ChevronDown className="w-4 h-4 rotate-180" />
                    </button>
                    <button
                      onClick={() => onMoveCategoryDown(category, index)}
                      disabled={index === categories.length - 1}
                      className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                  <GripVertical className="w-4 h-4 text-gray-400" />
                  <span className="font-medium text-gray-900">{category.name}</span>
                  <span className="text-sm text-gray-500">
                    ({groupedItems[category.id]?.length || 0} plat{(groupedItems[category.id]?.length || 0) > 1 ? 's' : ''})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEditCategory(category)}
                    className="p-1.5 rounded hover:bg-gray-200"
                  >
                    <Edit2 className="w-4 h-4 text-gray-500" />
                  </button>
                  <button
                    onClick={() => onDeleteCategory(category)}
                    className="p-1.5 rounded hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* Category Form Modal */}
      <Modal
        isOpen={showCategoryForm}
        onClose={resetCategoryForm}
        title={editingCategory ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
        size="md"
      >
        <form onSubmit={handleCategorySubmit} className="p-6 space-y-4">
          <Input
            label="Nom de la catégorie *"
            value={categoryFormData.name}
            onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
            placeholder="Ex: Entrées, Plats, Desserts..."
            required
          />
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={resetCategoryForm} className="flex-1">
              Annuler
            </Button>
            <Button type="submit" variant="primary" className="flex-1">
              Sauvegarder
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
