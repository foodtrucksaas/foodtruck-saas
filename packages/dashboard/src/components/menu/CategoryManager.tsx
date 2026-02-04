import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, GripVertical } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Category, MenuItem } from '@foodtruck/shared';
import { Modal, Button, Input } from '@foodtruck/shared/components';

export interface CategoryFormData {
  name: string;
  display_order: number;
}

interface SortableCategoryItemProps {
  category: Category;
  itemCount: number;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
}

function SortableCategoryItem({
  category,
  itemCount,
  onEdit,
  onDelete,
}: SortableCategoryItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between p-3 bg-gray-50 rounded-xl ${
        isDragging ? 'shadow-lg ring-2 ring-primary-300 bg-primary-50' : ''
      }`}
    >
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          {...attributes}
          {...listeners}
          className="flex items-center justify-center w-10 h-10 min-w-[44px] min-h-[44px] text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing touch-none"
          aria-label="Glisser pour réorganiser"
        >
          <GripVertical className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <span className="font-medium text-gray-900 block truncate">{category.name}</span>
          <span className="text-xs sm:text-sm text-gray-500">
            ({itemCount} plat{itemCount > 1 ? 's' : ''})
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={() => onEdit(category)}
          className="min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center rounded-lg hover:bg-gray-200 active:scale-95 transition-all"
          aria-label="Modifier la catégorie"
        >
          <Edit2 className="w-5 h-5 text-gray-500" />
        </button>
        <button
          onClick={() => onDelete(category)}
          className="min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center rounded-lg hover:bg-red-50 active:scale-95 transition-all"
          aria-label="Supprimer la catégorie"
        >
          <Trash2 className="w-5 h-5 text-red-500" />
        </button>
      </div>
    </div>
  );
}

interface CategoryManagerProps {
  isOpen: boolean;
  categories: Category[];
  groupedItems: Record<string, MenuItem[]>;
  onCreateCategory: (data: CategoryFormData) => Promise<void>;
  onUpdateCategory: (id: string, data: CategoryFormData) => Promise<void>;
  onDeleteCategory: (category: Category) => Promise<void>;
  onReorderCategories: (categories: Category[]) => Promise<void>;
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
  onReorderCategories,
  openWithForm,
  onOpenWithFormHandled,
}: CategoryManagerProps) {
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryFormData, setCategoryFormData] = useState<CategoryFormData>({
    name: '',
    display_order: 0,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = categories.findIndex((cat) => cat.id === active.id);
      const newIndex = categories.findIndex((cat) => cat.id === over.id);
      const newCategories = arrayMove(categories, oldIndex, newIndex);
      onReorderCategories(newCategories);
    }
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
          <p className="text-gray-500 text-sm">
            Aucune catégorie. Créez-en une pour organiser vos plats.
          </p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={categories.map((c) => c.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {categories.map((category) => (
                  <SortableCategoryItem
                    key={category.id}
                    category={category}
                    itemCount={groupedItems[category.id]?.length || 0}
                    onEdit={handleEditCategory}
                    onDelete={onDeleteCategory}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
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
            <Button
              type="button"
              variant="secondary"
              onClick={resetCategoryForm}
              className="flex-1"
            >
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
