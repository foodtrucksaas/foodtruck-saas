import type { OfferType, MenuItem, CategoryOption } from '@foodtruck/shared';
import type { OfferFormState, CategoryWithOptionGroups } from '../useOffers';
import { Package, Gift, Tag, TrendingUp } from 'lucide-react';

export interface WizardFormProps {
  form: OfferFormState;
  categories: CategoryWithOptionGroups[];
  menuItems: MenuItem[];
  updateForm: (updates: Partial<OfferFormState>) => void;
}

export const typeIcons: Record<OfferType, typeof Package> = {
  bundle: Package,
  buy_x_get_y: Gift,
  promo_code: Tag,
  threshold_discount: TrendingUp,
};

export const DAYS = [
  { value: 0, label: 'Dim' },
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mer' },
  { value: 4, label: 'Jeu' },
  { value: 5, label: 'Ven' },
  { value: 6, label: 'Sam' },
];

// Get size options for a category (first required single-selection group)
export function getSizeOptions(
  category: CategoryWithOptionGroups | undefined
): CategoryOption[] | null {
  if (!category?.category_option_groups) return null;

  // Find the first required single-selection group (=size group)
  const sizeGroup = category.category_option_groups
    .filter((g) => g.is_required && !g.is_multiple)
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))[0];

  if (!sizeGroup?.category_options?.length) return null;

  return sizeGroup.category_options.filter((o) => o.is_available !== false);
}

// Get all single-select option groups for a category (sizes + other single-select like "Base")
export function getSingleSelectGroups(category: CategoryWithOptionGroups | undefined) {
  if (!category?.category_option_groups) return [];
  return category.category_option_groups
    .filter((g) => !g.is_multiple && g.category_options?.length)
    .sort((a, b) => {
      if (a.is_required !== b.is_required) return a.is_required ? -1 : 1;
      return (a.display_order ?? 0) - (b.display_order ?? 0);
    })
    .map((g) => ({
      group: g,
      options: (g.category_options || []).filter((o) => o.is_available !== false),
    }));
}

export function getItemsForCategories(menuItems: MenuItem[], categoryIds: string[]) {
  return menuItems.filter(
    (item) => item.category_id && categoryIds.includes(item.category_id) && item.is_available
  );
}
