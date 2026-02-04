import { useState } from 'react';
import {
  Plus,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import { formatPrice } from '@foodtruck/shared';
import { useMenuPage } from '../hooks';
import {
  SortableMenuItemList,
  MenuItemForm,
  CategoryManager,
  OptionsWizard,
  CategoryOptionsModal,
} from '../components/menu';

export default function Menu() {
  const {
    // Data
    categories,
    groupedItems,
    uncategorizedItems,

    // Menu item form
    showForm,
    setShowForm,
    editingItem,
    formData,
    setFormData,
    selectedCategorySizeOptions,
    selectedCategorySupplements,
    requiredOptionGroups,
    supplementOptionGroups,
    handleEdit,
    handleSubmit,
    resetForm,
    toggleAvailability,
    deleteItem,

    // Archived items
    archivedItems,
    showArchivedSection,
    setShowArchivedSection,
    restoreItem,

    // Category manager
    showCategoryManager,
    setShowCategoryManager,
    createCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,

    // Item reordering
    reorderCategoryItems,

    // Options wizard
    showOptionsWizard,
    optionsWizardCategory,
    optionsWizardGroups,
    setOptionsWizardGroups,
    savingOptionsWizard,
    openOptionsWizard,
    closeOptionsWizard,
    saveOptionsWizard,

    // Category options modal
    showCategoryOptionsModal,
    selectedCategoryForOptions,
    categoryOptionGroups,
    setCategoryOptionGroups,
    savingOptions,
    closeCategoryOptionsModal,
    saveCategoryOptionGroups,
  } = useMenuPage();

  const [openCategoryForm, setOpenCategoryForm] = useState(false);

  return (
    <div className="space-y-6">
      {/* Page header - hidden on mobile (Layout provides header) */}
      <div className="hidden lg:flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Menu</h1>
          <p className="text-gray-600">Gérez les plats de votre food truck</p>
        </div>
        <button
          onClick={() => setShowCategoryManager(!showCategoryManager)}
          className="btn-secondary"
        >
          <FolderOpen className="w-5 h-5 mr-2" />
          Gérer les catégories
          {showCategoryManager ? (
            <ChevronDown className="w-4 h-4 ml-1" />
          ) : (
            <ChevronRight className="w-4 h-4 ml-1" />
          )}
        </button>
      </div>

      {/* Mobile action buttons */}
      <div className="flex flex-wrap gap-2 lg:hidden">
        <button
          onClick={() => setShowCategoryManager(!showCategoryManager)}
          className="btn-secondary flex-1"
        >
          <FolderOpen className="w-5 h-5 mr-2" />
          Gérer les catégories
        </button>
      </div>

      {/* Category Manager */}
      <CategoryManager
        isOpen={showCategoryManager}
        categories={categories}
        groupedItems={groupedItems}
        onCreateCategory={createCategory}
        onUpdateCategory={updateCategory}
        onDeleteCategory={deleteCategory}
        onReorderCategories={reorderCategories}
        openWithForm={openCategoryForm}
        onOpenWithFormHandled={() => setOpenCategoryForm(false)}
      />

      {/* Menu Item Form Modal */}
      <MenuItemForm
        isOpen={showForm}
        editingItem={editingItem}
        formData={formData}
        categories={categories}
        sizeOptions={selectedCategorySizeOptions}
        supplements={selectedCategorySupplements}
        requiredOptionGroups={requiredOptionGroups}
        supplementOptionGroups={supplementOptionGroups}
        onFormDataChange={setFormData}
        onSubmit={handleSubmit}
        onClose={resetForm}
      />

      {/* Options Wizard Modal */}
      <OptionsWizard
        isOpen={showOptionsWizard}
        category={optionsWizardCategory}
        groups={optionsWizardGroups}
        saving={savingOptionsWizard}
        onGroupsChange={setOptionsWizardGroups}
        onSave={saveOptionsWizard}
        onClose={closeOptionsWizard}
      />

      {/* Category Options Modal */}
      <CategoryOptionsModal
        isOpen={showCategoryOptionsModal}
        category={selectedCategoryForOptions}
        optionGroups={categoryOptionGroups}
        saving={savingOptions}
        onOptionGroupsChange={setCategoryOptionGroups}
        onSave={saveCategoryOptionGroups}
        onClose={closeCategoryOptionsModal}
      />

      {/* Menu Items */}
      <div className="space-y-4 sm:space-y-6">
        {categories.map((category) => {
          const items = groupedItems[category.id] || [];
          const unavailableCount = items.filter((item) => !item.is_available).length;

          return (
            <div key={category.id}>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3 sm:mb-4 bg-gray-50 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">
                  {category.name}
                </h2>
                <span className="text-xs text-gray-400 font-medium">
                  {items.length} {items.length > 1 ? 'plats' : 'plat'}
                  {unavailableCount > 0 && (
                    <span className="text-amber-600 ml-1">· {unavailableCount} indispo</span>
                  )}
                </span>
                <div className="flex items-center gap-1 sm:gap-2 ml-auto">
                  <button
                    onClick={() => openOptionsWizard(category)}
                    className="inline-flex items-center gap-1 sm:gap-1.5 px-3 py-2 min-h-[44px] text-xs text-gray-500 hover:text-primary-600 hover:bg-white rounded-lg transition-colors active:scale-[0.98]"
                  >
                    <Pencil className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    Options
                  </button>
                  <button
                    onClick={() => {
                      setFormData((prev) => ({ ...prev, category_id: category.id }));
                      setShowForm(true);
                    }}
                    className="w-10 h-10 sm:w-11 sm:h-11 min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px] rounded-full bg-primary-500 hover:bg-primary-600 text-white flex items-center justify-center transition-colors active:scale-95 shadow-sm"
                    title="Ajouter un plat"
                    aria-label="Ajouter un plat"
                  >
                    <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>
              </div>
              {groupedItems[category.id]?.length > 0 ? (
                <SortableMenuItemList
                  items={groupedItems[category.id]}
                  isReorderMode={true}
                  onEdit={handleEdit}
                  onToggle={toggleAvailability}
                  onDelete={deleteItem}
                  onReorder={reorderCategoryItems}
                />
              ) : (
                <button
                  onClick={() => {
                    setFormData((prev) => ({ ...prev, category_id: category.id }));
                    setShowForm(true);
                  }}
                  className="text-primary-500 hover:text-primary-600 text-xs sm:text-sm font-medium min-h-[44px] px-2 active:opacity-70"
                >
                  + Ajouter un item
                </button>
              )}
            </div>
          );
        })}

        {/* Add new category button */}
        <button
          onClick={() => {
            setOpenCategoryForm(true);
            setShowCategoryManager(true);
          }}
          className="w-full py-3 sm:py-4 min-h-[48px] sm:min-h-[52px] border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50 transition-colors flex items-center justify-center gap-2 active:scale-[0.99]"
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="font-medium text-sm sm:text-base">Ajouter une catégorie</span>
        </button>

        {uncategorizedItems.length > 0 && (
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-3">
              Sans catégorie
            </h2>
            <SortableMenuItemList
              items={uncategorizedItems}
              isReorderMode={true}
              onEdit={handleEdit}
              onToggle={toggleAvailability}
              onDelete={deleteItem}
              onReorder={reorderCategoryItems}
            />
          </div>
        )}

        {/* Archived Items Section */}
        <div className="border-t pt-4 sm:pt-6 mt-4 sm:mt-6">
          <button
            onClick={() => setShowArchivedSection(!showArchivedSection)}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors min-h-[44px] px-2 -mx-2 rounded-lg active:bg-gray-100"
          >
            <Trash2 className="w-4 h-4" />
            <span className="text-xs sm:text-sm font-medium">Articles supprimés</span>
            {archivedItems.length > 0 && (
              <span className="text-xs bg-gray-200 text-gray-600 px-1.5 sm:px-2 py-0.5 rounded-full">
                {archivedItems.length}
              </span>
            )}
            {showArchivedSection ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>

          {showArchivedSection && (
            <div className="mt-3 sm:mt-4">
              {archivedItems.length === 0 ? (
                <p className="text-xs sm:text-sm text-gray-400 italic">Aucun article supprimé</p>
              ) : (
                <div className="grid gap-2">
                  {archivedItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 p-2.5 sm:p-3 bg-gray-50 border border-gray-200 rounded-lg opacity-60 hover:opacity-100 transition-opacity"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-700 truncate text-sm sm:text-base">
                          {item.name}
                        </p>
                        <p className="text-xs sm:text-sm text-gray-500">
                          {formatPrice(item.price)}
                        </p>
                      </div>
                      <button
                        onClick={() => restoreItem(item)}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 min-h-[44px] text-xs sm:text-sm text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors active:scale-[0.98] w-full sm:w-auto"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Restaurer
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
