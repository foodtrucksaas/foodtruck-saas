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
  MenuItemCard,
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
    moveCategoryUp,
    moveCategoryDown,

    // Item reordering
    moveItemUp,
    moveItemDown,

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
          Catégories
          {showCategoryManager ? (
            <ChevronDown className="w-4 h-4 ml-1" />
          ) : (
            <ChevronRight className="w-4 h-4 ml-1" />
          )}
        </button>
      </div>

      {/* Mobile action button */}
      <div className="flex lg:hidden">
        <button
          onClick={() => setShowCategoryManager(!showCategoryManager)}
          className="btn-secondary flex-1"
        >
          <FolderOpen className="w-5 h-5 mr-2" />
          Catégories
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
        onMoveCategoryUp={moveCategoryUp}
        onMoveCategoryDown={moveCategoryDown}
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
        {categories.map((category) => (
          <div key={category.id}>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">{category.name}</h2>
              <button
                onClick={() => {
                  setFormData((prev) => ({ ...prev, category_id: category.id }));
                  setShowForm(true);
                }}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-primary-500 hover:bg-primary-600 text-white flex items-center justify-center transition-colors active:scale-95"
                title="Ajouter un plat"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <button
                onClick={() => openOptionsWizard(category)}
                className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 min-h-[36px] sm:min-h-[40px] text-[11px] sm:text-xs text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors active:scale-[0.98]"
              >
                <Pencil className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                Options
              </button>
            </div>
            {groupedItems[category.id]?.length > 0 ? (
              <div className="grid grid-cols-1 gap-2 sm:gap-3">
                {groupedItems[category.id].map((item, index) => (
                  <MenuItemCard
                    key={item.id}
                    item={item}
                    index={index}
                    totalItems={groupedItems[category.id].length}
                    onEdit={handleEdit}
                    onToggle={toggleAvailability}
                    onDelete={deleteItem}
                    onMoveUp={() => moveItemUp(item, groupedItems[category.id], index)}
                    onMoveDown={() => moveItemDown(item, groupedItems[category.id], index)}
                  />
                ))}
              </div>
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
        ))}

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
            <div className="grid grid-cols-1 gap-2 sm:gap-3">
              {uncategorizedItems.map((item, index) => (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  index={index}
                  totalItems={uncategorizedItems.length}
                  onEdit={handleEdit}
                  onToggle={toggleAvailability}
                  onDelete={deleteItem}
                  onMoveUp={() => moveItemUp(item, uncategorizedItems, index)}
                  onMoveDown={() => moveItemDown(item, uncategorizedItems, index)}
                />
              ))}
            </div>
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
              <span className="text-[10px] sm:text-xs bg-gray-200 text-gray-600 px-1.5 sm:px-2 py-0.5 rounded-full">
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
                        className="flex items-center justify-center gap-1.5 px-3 py-2 min-h-[40px] text-xs sm:text-sm text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors active:scale-[0.98] w-full sm:w-auto"
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
