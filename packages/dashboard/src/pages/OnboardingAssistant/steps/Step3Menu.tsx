import { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Pencil,
  ChevronUp,
  ChevronDown,
  ArrowLeft,
  X,
  Check,
  Loader2,
  Ruler,
  CircleDot,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useToast, Toast } from '../../../components/Alert';
import { useConfirmDialog } from '../../../hooks/useConfirmDialog';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { StepContainer, PriceInput, QuickSuggestions } from '../components';

// ---------- Types ----------

interface CategoryOption {
  id: string;
  name: string;
  price_modifier: number;
  display_order: number;
}

interface OptionGroup {
  id: string;
  name: string;
  is_required: boolean;
  is_multiple: boolean;
  display_order: number;
  options: CategoryOption[];
}

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number; // cents
  option_prices: Record<string, number> | null; // optionUUID → cents
  display_order: number;
}

interface Category {
  id: string;
  name: string;
  display_order: number;
  optionGroups: OptionGroup[];
  items: MenuItem[];
}

interface Step3MenuProps {
  foodtruckId: string;
  onNext: () => void;
  onBack: () => void;
}

const CATEGORY_SUGGESTIONS = [
  'Entrees',
  'Plats',
  'Desserts',
  'Boissons',
  'Pizzas',
  'Burgers',
  'Salades',
  'Wraps',
];

// ---------- Component ----------

export function Step3Menu({ foodtruckId, onNext, onBack }: Step3MenuProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const { toast, hideToast, showSuccess, showError } = useToast();
  const confirmDialog = useConfirmDialog();

  // Load categories with option groups and items from DB
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('categories')
        .select(
          `*,
          category_option_groups (
            *,
            category_options (*)
          ),
          menu_items (*)
        `
        )
        .eq('foodtruck_id', foodtruckId)
        .order('display_order');

      if (data) {
        setCategories(
          data.map((cat) => ({
            id: cat.id,
            name: cat.name,
            display_order: cat.display_order || 0,
            optionGroups: (cat.category_option_groups || [])
              .sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0))
              .map((og: any) => ({
                id: og.id,
                name: og.name,
                is_required: og.is_required,
                is_multiple: og.is_multiple,
                display_order: og.display_order || 0,
                options: (og.category_options || [])
                  .sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0))
                  .map((opt: any) => ({
                    id: opt.id,
                    name: opt.name,
                    price_modifier: opt.price_modifier || 0,
                    display_order: opt.display_order || 0,
                  })),
              })),
            items: ((cat.menu_items || []) as any[])
              .filter((i) => !i.is_archived)
              .sort(
                (a, b) =>
                  (a.display_order ?? 999) - (b.display_order ?? 999) ||
                  new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              )
              .map((item: any) => ({
                id: item.id,
                name: item.name,
                description: item.description,
                price: item.price,
                option_prices: item.option_prices,
                display_order: item.display_order || 0,
              })),
          }))
        );
      }
      setLoading(false);
    };
    load();
  }, [foodtruckId]);

  // Find the category being edited
  const editingCategory = editingCategoryId
    ? categories.find((c) => c.id === editingCategoryId)
    : null;

  // --- Category CRUD ---

  const handleAddCategory = async (name: string) => {
    if (!name.trim()) return;
    try {
      const { data, error } = await supabase
        .from('categories')
        .insert({
          foodtruck_id: foodtruckId,
          name: name.trim(),
          display_order: categories.length,
        })
        .select('id')
        .single();

      if (error) throw error;

      const newCat: Category = {
        id: data.id,
        name: name.trim(),
        display_order: categories.length,
        optionGroups: [],
        items: [],
      };
      setCategories((prev) => [...prev, newCat]);
      setEditingCategoryId(data.id);
      showSuccess('Categorie creee');
    } catch (err) {
      console.error('Error creating category:', err);
      showError('Erreur lors de la creation');
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    const confirmed = await confirmDialog.confirm({
      title: 'Supprimer cette categorie ?',
      message: 'Tous les articles et options de cette categorie seront supprimes.',
      confirmText: 'Supprimer',
      variant: 'danger',
    });
    if (!confirmed) return;

    try {
      await supabase.from('categories').delete().eq('id', categoryId);
      setCategories((prev) => prev.filter((c) => c.id !== categoryId));
      if (editingCategoryId === categoryId) setEditingCategoryId(null);
      confirmDialog.closeDialog();
      showSuccess('Categorie supprimee');
    } catch (err) {
      console.error('Error deleting category:', err);
      showError('Erreur lors de la suppression');
      confirmDialog.closeDialog();
    }
  };

  const handleMoveCategory = async (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= categories.length) return;

    const reordered = [...categories];
    [reordered[index], reordered[newIndex]] = [reordered[newIndex], reordered[index]];
    setCategories(reordered);

    // Update display_order in DB
    Promise.all(
      reordered.map((cat, i) =>
        supabase.from('categories').update({ display_order: i }).eq('id', cat.id)
      )
    ).catch((err) => console.error('Error reordering categories:', err));
  };

  const handleContinue = () => {
    if (categories.length === 0 || categories.every((c) => c.items.length === 0)) {
      showError('Ajoutez au moins un article avant de continuer');
      return;
    }
    onNext();
  };

  // Reload a single category from DB
  const reloadCategory = async (categoryId: string) => {
    const { data } = await supabase
      .from('categories')
      .select(
        `*,
        category_option_groups (
          *,
          category_options (*)
        ),
        menu_items (*)
      `
      )
      .eq('id', categoryId)
      .single();

    if (!data) return;

    setCategories((prev) =>
      prev.map((c) => {
        if (c.id !== categoryId) return c;
        return {
          ...c,
          name: data.name,
          optionGroups: (data.category_option_groups || [])
            .sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0))
            .map((og: any) => ({
              id: og.id,
              name: og.name,
              is_required: og.is_required,
              is_multiple: og.is_multiple,
              display_order: og.display_order || 0,
              options: (og.category_options || [])
                .sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0))
                .map((opt: any) => ({
                  id: opt.id,
                  name: opt.name,
                  price_modifier: opt.price_modifier || 0,
                  display_order: opt.display_order || 0,
                })),
            })),
          items: ((data.menu_items || []) as any[])
            .filter((i) => !i.is_archived)
            .sort(
              (a, b) =>
                (a.display_order ?? 999) - (b.display_order ?? 999) ||
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            )
            .map((item: any) => ({
              id: item.id,
              name: item.name,
              description: item.description,
              price: item.price,
              option_prices: item.option_prices,
              display_order: item.display_order || 0,
            })),
        };
      })
    );
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
      </div>
    );
  }

  // --- Category Editor View ---
  if (editingCategory) {
    return (
      <CategoryEditor
        category={editingCategory}
        foodtruckId={foodtruckId}
        onBack={() => setEditingCategoryId(null)}
        onReload={() => reloadCategory(editingCategory.id)}
        showSuccess={showSuccess}
        showError={showError}
        toast={toast}
        hideToast={hideToast}
        confirmDialog={confirmDialog}
      />
    );
  }

  // --- Categories List View ---
  return (
    <StepContainer
      onBack={onBack}
      onNext={handleContinue}
      nextLabel="Continuer"
      nextDisabled={categories.length === 0}
    >
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Votre menu</h2>
          <p className="text-sm text-gray-500 mt-1">
            Creez vos categories et ajoutez vos articles.
          </p>
        </div>

        {/* Categories list */}
        {categories.length > 0 && (
          <div className="space-y-2">
            {categories.map((cat, index) => (
              <div
                key={cat.id}
                className="bg-white border border-gray-200 rounded-xl p-4 hover:border-primary-200 transition-colors cursor-pointer"
                onClick={() => setEditingCategoryId(cat.id)}
              >
                <div className="flex items-center gap-3">
                  {/* Reorder */}
                  {categories.length > 1 && (
                    <div className="flex flex-col gap-0.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleMoveCategory(index, 'up')}
                        disabled={index === 0}
                        className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-20"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveCategory(index, 'down')}
                        disabled={index === categories.length - 1}
                        className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-20"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm">{cat.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {cat.items.length} article{cat.items.length !== 1 ? 's' : ''}
                      {cat.optionGroups.length > 0 &&
                        ` · ${cat.optionGroups.map((og) => og.name).join(', ')}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <Pencil className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add category */}
        <AddCategoryForm existingNames={categories.map((c) => c.name)} onAdd={handleAddCategory} />
      </div>

      <Toast {...toast} onDismiss={hideToast} />
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={confirmDialog.handleClose}
        onConfirm={confirmDialog.handleConfirm}
        loading={confirmDialog.loading}
        {...confirmDialog.options}
      />
    </StepContainer>
  );
}

// ---------- AddCategoryForm ----------

function AddCategoryForm({
  existingNames,
  onAdd,
}: {
  existingNames: string[];
  onAdd: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!name.trim()) return;
    setAdding(true);
    await onAdd(name.trim());
    setName('');
    setAdding(false);
  };

  const availableSuggestions = CATEGORY_SUGGESTIONS.filter(
    (s) => !existingNames.some((n) => n.toLowerCase() === s.toLowerCase())
  );

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAdd();
            }
          }}
          className="input min-h-[44px] text-sm flex-1"
          placeholder="Nom de la categorie..."
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!name.trim() || adding}
          className="px-4 min-h-[44px] bg-primary-500 hover:bg-primary-600 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5"
        >
          {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Ajouter
        </button>
      </div>

      {availableSuggestions.length > 0 && (
        <div>
          <p className="text-xs text-gray-400 mb-1.5">Suggestions :</p>
          <QuickSuggestions
            suggestions={availableSuggestions}
            onSelect={setName}
            selectedValue={name}
          />
        </div>
      )}
    </div>
  );
}

// ---------- CategoryEditor ----------

interface CategoryEditorProps {
  category: Category;
  foodtruckId: string;
  onBack: () => void;
  onReload: () => Promise<void>;
  showSuccess: (msg: string) => void;
  showError: (msg: string) => void;
  toast: any;
  hideToast: () => void;
  confirmDialog: ReturnType<typeof import('../../../hooks/useConfirmDialog').useConfirmDialog>;
}

function CategoryEditor({
  category,
  foodtruckId,
  onBack,
  onReload,
  showSuccess,
  showError,
  toast,
  hideToast,
  confirmDialog,
}: CategoryEditorProps) {
  const [categoryName, setCategoryName] = useState(category.name);
  const [showOptionForm, setShowOptionForm] = useState(false);
  const [editingOptionGroup, setEditingOptionGroup] = useState<OptionGroup | null>(null);
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  // Get the size option group (if any)
  const sizeGroup = category.optionGroups.find((og) => og.is_required && !og.is_multiple);
  const sizeOptions = sizeGroup?.options || [];
  const hasSizes = sizeOptions.length > 0;

  // Update category name on blur
  const handleUpdateName = async () => {
    if (!categoryName.trim() || categoryName.trim() === category.name) return;
    try {
      await supabase.from('categories').update({ name: categoryName.trim() }).eq('id', category.id);
      await onReload();
    } catch (err) {
      console.error('Error updating category name:', err);
    }
  };

  // --- Option Group CRUD ---

  const handleDeleteOptionGroup = async (groupId: string) => {
    const confirmed = await confirmDialog.confirm({
      title: 'Supprimer ces options ?',
      message: 'Les prix par taille de vos articles seront aussi supprimes.',
      confirmText: 'Supprimer',
      variant: 'danger',
    });
    if (!confirmed) return;

    try {
      await supabase.from('category_option_groups').delete().eq('id', groupId);
      confirmDialog.closeDialog();
      await onReload();
      showSuccess('Options supprimees');
    } catch (err) {
      console.error('Error deleting option group:', err);
      showError('Erreur lors de la suppression');
      confirmDialog.closeDialog();
    }
  };

  // --- Item CRUD ---

  const handleDeleteItem = async (itemId: string) => {
    const confirmed = await confirmDialog.confirm({
      title: 'Supprimer cet article ?',
      message: 'Cette action est irreversible.',
      confirmText: 'Supprimer',
      variant: 'danger',
    });
    if (!confirmed) return;

    try {
      await supabase.from('menu_items').delete().eq('id', itemId);
      confirmDialog.closeDialog();
      await onReload();
      showSuccess('Article supprime');
    } catch (err) {
      console.error('Error deleting item:', err);
      showError('Erreur lors de la suppression');
      confirmDialog.closeDialog();
    }
  };

  // Format price for display
  const formatItemPrice = (item: MenuItem): string => {
    if (hasSizes && item.option_prices && Object.keys(item.option_prices).length > 0) {
      return sizeOptions
        .map((opt) => {
          const price = item.option_prices?.[opt.id];
          return price !== undefined ? `${opt.name}: ${(price / 100).toFixed(2)}€` : null;
        })
        .filter(Boolean)
        .join(' | ');
    }
    return `${(item.price / 100).toFixed(2)}€`;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 px-4 sm:px-6 pb-4">
        <div className="space-y-6 py-6">
          {/* Back + Category Name */}
          <div>
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-3"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour aux categories
            </button>
            <div className="group flex items-center gap-2">
              <input
                type="text"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                onBlur={handleUpdateName}
                className="text-lg font-semibold text-gray-900 bg-transparent border-b border-dashed border-transparent group-hover:border-gray-300 focus:border-primary-500 outline-none focus:ring-0 p-0 flex-1 transition-colors"
                placeholder="Nom de la categorie"
              />
              <Pencil className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0" />
            </div>
          </div>

          {/* Option Groups */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-700">Options</p>
            </div>

            {category.optionGroups.length > 0 ? (
              <div className="space-y-2 mb-3">
                {category.optionGroups.map((og) => (
                  <div
                    key={og.id}
                    onClick={() => {
                      setEditingOptionGroup(og);
                      setShowOptionForm(true);
                    }}
                    className="flex items-center gap-2 p-2.5 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm cursor-pointer transition-colors"
                  >
                    <div className="w-7 h-7 bg-white rounded-md flex items-center justify-center border border-gray-200 flex-shrink-0">
                      {og.is_required ? (
                        <Ruler className="w-3.5 h-3.5 text-gray-500" />
                      ) : (
                        <CircleDot className="w-3.5 h-3.5 text-gray-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-gray-700">{og.name}</span>
                      <span className="text-gray-500 ml-1.5">
                        ({og.options.map((o) => o.name).join(', ')})
                      </span>
                    </div>
                    <Pencil className="w-3 h-3 text-gray-400 flex-shrink-0" />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteOptionGroup(og.id);
                      }}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 mb-3">
                Aucune option (tailles, choix...) pour cette categorie.
              </p>
            )}

            {showOptionForm ? (
              <AddOptionGroupForm
                categoryId={category.id}
                existingGroupNames={category.optionGroups
                  .filter((og) => og.id !== editingOptionGroup?.id)
                  .map((og) => og.name)}
                editingGroup={editingOptionGroup}
                onSaved={async () => {
                  setShowOptionForm(false);
                  setEditingOptionGroup(null);
                  await onReload();
                  showSuccess(editingOptionGroup ? 'Options modifiees' : 'Options ajoutees');
                }}
                onCancel={() => {
                  setShowOptionForm(false);
                  setEditingOptionGroup(null);
                }}
                showError={showError}
              />
            ) : (
              <button
                type="button"
                onClick={() => {
                  setEditingOptionGroup(null);
                  setShowOptionForm(true);
                }}
                className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Ajouter des options
              </button>
            )}
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-700">
                Articles ({category.items.length})
              </p>
            </div>

            {category.items.length > 0 && (
              <div className="space-y-1.5 mb-3">
                {category.items.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setEditingItemId(item.id);
                      setShowItemForm(true);
                    }}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                      editingItemId === item.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'bg-white border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-medium text-gray-900 text-sm">{item.name}</span>
                      {item.description && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{item.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <span className="text-xs text-gray-500">{formatItemPrice(item)}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteItem(item.id);
                        }}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {showItemForm ? (
              <AddItemForm
                categoryId={category.id}
                foodtruckId={foodtruckId}
                sizeOptions={sizeOptions}
                editingItem={
                  editingItemId ? category.items.find((i) => i.id === editingItemId) || null : null
                }
                onSaved={async () => {
                  setShowItemForm(false);
                  setEditingItemId(null);
                  await onReload();
                }}
                onCancel={() => {
                  setShowItemForm(false);
                  setEditingItemId(null);
                }}
                showSuccess={showSuccess}
                showError={showError}
              />
            ) : (
              <button
                type="button"
                onClick={() => {
                  setEditingItemId(null);
                  setShowItemForm(true);
                }}
                className="w-full p-3 border border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50/50 transition-colors flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Ajouter un article
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sticky bottom bar */}
      <div className="sticky bottom-0 z-10 bg-white/95 backdrop-blur-sm border-t border-gray-100 px-4 sm:px-6 py-3 safe-area-bottom">
        <button
          type="button"
          onClick={onBack}
          className="w-full py-3 min-h-[48px] bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2"
        >
          <Check className="w-4 h-4" />
          Terminer
        </button>
      </div>

      <Toast {...toast} onDismiss={hideToast} />
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={confirmDialog.handleClose}
        onConfirm={confirmDialog.handleConfirm}
        loading={confirmDialog.loading}
        {...confirmDialog.options}
      />
    </div>
  );
}

// ---------- AddOptionGroupForm ----------

function AddOptionGroupForm({
  categoryId,
  existingGroupNames,
  editingGroup,
  onSaved,
  onCancel,
  showError,
}: {
  categoryId: string;
  existingGroupNames: string[];
  editingGroup: OptionGroup | null;
  onSaved: () => Promise<void>;
  onCancel: () => void;
  showError: (msg: string) => void;
}) {
  const [type, setType] = useState<'size' | 'other' | null>(
    editingGroup ? (editingGroup.is_required ? 'size' : 'other') : null
  );
  const [groupName, setGroupName] = useState(editingGroup?.name || '');
  const [optionValues, setOptionValues] = useState<string[]>(
    editingGroup ? editingGroup.options.map((o) => o.name) : []
  );
  const [newOptionValue, setNewOptionValue] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSelectType = (t: 'size' | 'other') => {
    setType(t);
    if (t === 'size') setGroupName('Taille');
  };

  const handleAddValue = () => {
    if (!newOptionValue.trim() || optionValues.includes(newOptionValue.trim())) return;
    setOptionValues((prev) => [...prev, newOptionValue.trim()]);
    setNewOptionValue('');
  };

  const handleSave = async () => {
    // Auto-add any text in the input field before saving
    const finalValues = [...optionValues];
    if (newOptionValue.trim() && !finalValues.includes(newOptionValue.trim())) {
      finalValues.push(newOptionValue.trim());
    }
    if (!type || finalValues.length === 0) return;
    const finalName = groupName.trim() || (type === 'size' ? 'Taille' : 'Option');

    setSaving(true);
    try {
      // If editing, delete the old group first (CASCADE deletes options)
      if (editingGroup) {
        await supabase.from('category_option_groups').delete().eq('id', editingGroup.id);
      }

      // Create the option group
      const { data: ogData, error: ogError } = await supabase
        .from('category_option_groups')
        .insert({
          category_id: categoryId,
          name: finalName,
          is_required: type === 'size',
          is_multiple: false,
          display_order: existingGroupNames.length,
        })
        .select('id')
        .single();

      if (ogError) throw ogError;

      // Create the options
      const optionsToInsert = finalValues.map((name, index) => ({
        option_group_id: ogData.id,
        name,
        price_modifier: 0,
        display_order: index,
      }));

      const { error: optError } = await supabase.from('category_options').insert(optionsToInsert);

      if (optError) throw optError;

      await onSaved();
    } catch (err) {
      console.error('Error saving option group:', err);
      showError('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  // Type selection
  if (!type) {
    const hasSize = existingGroupNames.some(
      (n) => n.toLowerCase() === 'taille' || n.toLowerCase() === 'size'
    );
    return (
      <div className="bg-gray-50 rounded-xl p-4 space-y-3">
        <p className="text-sm font-medium text-gray-700">Type d'option</p>
        <div className="space-y-2">
          {!hasSize && (
            <button
              type="button"
              onClick={() => handleSelectType('size')}
              className="w-full text-left p-3 bg-white rounded-lg border border-gray-200 hover:border-primary-300 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Ruler className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Tailles</p>
                  <p className="text-xs text-gray-500">S, M, L... avec un prix par taille</p>
                </div>
              </div>
            </button>
          )}
          <button
            type="button"
            onClick={() => handleSelectType('other')}
            className="w-full text-left p-3 bg-white rounded-lg border border-gray-200 hover:border-primary-300 transition-colors"
          >
            <div className="flex items-center gap-3">
              <CircleDot className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-sm font-medium text-gray-900">Choix</p>
                <p className="text-xs text-gray-500">Base, cuisson, sauce...</p>
              </div>
            </div>
          </button>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Annuler
        </button>
      </div>
    );
  }

  // Values input
  return (
    <div className="bg-gray-50 rounded-xl p-4 space-y-4">
      {type === 'other' && (
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Nom du groupe</label>
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className="input text-sm min-h-[40px]"
            placeholder="Ex: Base, Cuisson..."
            autoFocus
          />
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">
          {type === 'size' ? 'Tailles disponibles' : 'Options disponibles'}
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={newOptionValue}
            onChange={(e) => setNewOptionValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddValue();
              }
            }}
            className="input text-sm min-h-[40px] flex-1"
            placeholder={type === 'size' ? 'Ex: M, L, XL...' : 'Ex: Tomate, Creme...'}
            autoFocus={type === 'size'}
          />
          <button
            type="button"
            onClick={handleAddValue}
            disabled={!newOptionValue.trim()}
            className="px-3 min-h-[40px] bg-primary-50 hover:bg-primary-100 disabled:bg-gray-100 disabled:text-gray-400 text-primary-600 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {optionValues.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {optionValues.map((value) => (
            <span
              key={value}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary-50 text-primary-700 rounded-md text-sm"
            >
              {value}
              <button
                type="button"
                onClick={() => setOptionValues((prev) => prev.filter((v) => v !== value))}
                className="hover:text-primary-900"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={optionValues.length === 0 || saving}
          className="px-4 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5"
        >
          {saving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Check className="w-3.5 h-3.5" />
          )}
          Valider
        </button>
      </div>
    </div>
  );
}

// ---------- AddItemForm ----------

function AddItemForm({
  categoryId,
  foodtruckId,
  sizeOptions,
  editingItem,
  onSaved,
  onCancel,
  showSuccess,
  showError,
}: {
  categoryId: string;
  foodtruckId: string;
  sizeOptions: CategoryOption[];
  editingItem: MenuItem | null;
  onSaved: () => Promise<void>;
  onCancel: () => void;
  showSuccess: (msg: string) => void;
  showError: (msg: string) => void;
}) {
  const hasSizesInCategory = sizeOptions.length > 0;
  const [useSinglePrice, setUseSinglePrice] = useState(false);
  const hasSizes = hasSizesInCategory && !useSinglePrice;
  const [itemName, setItemName] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Initialize form when editing
  useEffect(() => {
    if (editingItem) {
      setItemName(editingItem.name);
      setItemDescription(editingItem.description || '');
      const displayPrices: Record<string, string> = {};
      // Check if this item uses size prices
      const hasOptionPrices =
        hasSizesInCategory &&
        editingItem.option_prices &&
        Object.keys(editingItem.option_prices).length > 0;
      setUseSinglePrice(hasSizesInCategory && !hasOptionPrices);
      if (hasOptionPrices) {
        for (const opt of sizeOptions) {
          const p = editingItem.option_prices![opt.id];
          if (p !== undefined) {
            displayPrices[opt.id] = (p / 100).toFixed(2);
          }
        }
        // Fallback: if no size prices found, use base price for all
        if (Object.keys(displayPrices).length === 0 && editingItem.price > 0) {
          for (const opt of sizeOptions) {
            displayPrices[opt.id] = (editingItem.price / 100).toFixed(2);
          }
        }
      } else {
        displayPrices.base = (editingItem.price / 100).toFixed(2);
      }
      setPrices(displayPrices);
    } else {
      setItemName('');
      setItemDescription('');
      setUseSinglePrice(false);
      setPrices({});
    }
  }, [editingItem, hasSizesInCategory, sizeOptions]);

  const isValid = (() => {
    if (!itemName.trim()) return false;
    if (hasSizes) {
      return sizeOptions.every((opt) => {
        const p = prices[opt.id];
        return p && parseFloat(p) > 0;
      });
    }
    return prices.base && parseFloat(prices.base) > 0;
  })();

  const handleSave = async () => {
    if (!isValid) return;
    setSaving(true);

    try {
      // Build option_prices and base price
      let basePriceCents: number;
      let optionPricesJson: Record<string, number> | null = null;

      if (hasSizes) {
        optionPricesJson = {};
        let minPrice = Infinity;
        for (const opt of sizeOptions) {
          const cents = Math.round(parseFloat(prices[opt.id]) * 100);
          if (isNaN(cents) || cents <= 0) return;
          optionPricesJson[opt.id] = cents;
          if (cents < minPrice) minPrice = cents;
        }
        basePriceCents = minPrice;
      } else {
        basePriceCents = Math.round(parseFloat(prices.base) * 100);
        if (isNaN(basePriceCents) || basePriceCents <= 0) return;
      }

      if (editingItem) {
        // Update existing item
        const { error } = await supabase
          .from('menu_items')
          .update({
            name: itemName.trim(),
            description: itemDescription.trim() || null,
            price: basePriceCents,
            option_prices: optionPricesJson,
          })
          .eq('id', editingItem.id);

        if (error) throw error;
        showSuccess('Article modifie');
      } else {
        // Count existing items for display_order
        const { count } = await supabase
          .from('menu_items')
          .select('id', { count: 'exact', head: true })
          .eq('category_id', categoryId)
          .eq('foodtruck_id', foodtruckId);

        const { error } = await supabase.from('menu_items').insert({
          foodtruck_id: foodtruckId,
          category_id: categoryId,
          name: itemName.trim(),
          description: itemDescription.trim() || null,
          price: basePriceCents,
          option_prices: optionPricesJson,
          display_order: count || 0,
          is_available: true,
        });

        if (error) throw error;
        showSuccess('Article ajoute');
      }

      await onSaved();
    } catch (err) {
      console.error('Error saving item:', err);
      showError("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-gray-50 rounded-xl p-4 space-y-3">
      <p className="text-sm font-medium text-gray-700">
        {editingItem ? "Modifier l'article" : 'Nouvel article'}
      </p>

      <div className="flex gap-2">
        <input
          type="text"
          value={itemName}
          onChange={(e) => setItemName(e.target.value)}
          className="input text-sm min-h-[44px] flex-1"
          placeholder="Nom de l'article"
          autoFocus
        />
        {!hasSizes && (
          <PriceInput
            value={prices.base || ''}
            onChange={(v) => setPrices((prev) => ({ ...prev, base: v }))}
            className="w-24"
          />
        )}
      </div>

      <textarea
        value={itemDescription}
        onChange={(e) => setItemDescription(e.target.value)}
        className="input text-sm w-full resize-none"
        placeholder="Description (optionnel)"
        rows={2}
      />

      {hasSizesInCategory && (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={useSinglePrice}
            onChange={(e) => {
              setUseSinglePrice(e.target.checked);
              setPrices({});
            }}
            className="rounded border-gray-300 text-primary-500 focus:ring-primary-500"
          />
          <span className="text-sm text-gray-600">Prix unique (pas de taille)</span>
        </label>
      )}

      {hasSizes && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {sizeOptions.map((opt) => (
            <PriceInput
              key={opt.id}
              label={opt.name}
              value={prices[opt.id] || ''}
              onChange={(v) => setPrices((prev) => ({ ...prev, [opt.id]: v }))}
            />
          ))}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!isValid || saving}
          className="px-4 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5"
        >
          {saving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Check className="w-3.5 h-3.5" />
          )}
          {editingItem ? 'Modifier' : 'Ajouter'}
        </button>
      </div>
    </div>
  );
}
