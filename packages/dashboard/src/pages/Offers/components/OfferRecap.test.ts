/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { getRecapText, getValidationErrors } from './OfferRecap';
import type { OfferFormState, CategoryWithOptionGroups } from '../useOffers';

// Minimal default form state for testing
function makeForm(overrides: Partial<OfferFormState> = {}): OfferFormState {
  return {
    name: 'Test Offer',
    description: '',
    offerType: 'promo_code',
    isActive: true,
    bundleFixedPrice: '',
    bundleCategories: [],
    bundleFreeOptions: false,
    triggerQuantity: '1',
    rewardQuantity: '1',
    triggerCategoryIds: [],
    rewardCategoryIds: [],
    buyXGetYType: 'category_choice',
    triggerItems: [],
    rewardItems: [],
    promoCode: '',
    promoCodeDiscountType: 'percentage',
    promoCodeDiscountValue: '',
    promoCodeMinOrderAmount: '',
    promoCodeMaxDiscountAmount: '',
    thresholdMinAmount: '',
    thresholdDiscountType: 'percentage',
    thresholdDiscountValue: '',
    startDate: '',
    endDate: '',
    timeStart: '',
    timeEnd: '',
    maxUses: '',
    maxUsesPerCustomer: '',
    ...overrides,
  };
}

const mockCategories: CategoryWithOptionGroups[] = [
  {
    id: 'cat-1',
    name: 'Pizzas',
    food_truck_id: 'ft-1',
    display_order: 0,
    is_available: true,
    created_at: '',
    option_groups: [],
  },
  {
    id: 'cat-2',
    name: 'Boissons',
    food_truck_id: 'ft-1',
    display_order: 1,
    is_available: true,
    created_at: '',
    option_groups: [],
  },
  {
    id: 'cat-3',
    name: 'Desserts',
    food_truck_id: 'ft-1',
    display_order: 2,
    is_available: true,
    created_at: '',
    option_groups: [],
  },
];

// ============================================
// getRecapText
// ============================================

describe('getRecapText', () => {
  it('returns null for incomplete promo_code', () => {
    const form = makeForm({ offerType: 'promo_code', promoCode: '', promoCodeDiscountValue: '' });
    expect(getRecapText(form, [])).toBeNull();
  });

  it('returns recap for complete promo_code (percentage)', () => {
    const form = makeForm({
      offerType: 'promo_code',
      promoCode: 'WELCOME10',
      promoCodeDiscountType: 'percentage',
      promoCodeDiscountValue: '10',
    });
    expect(getRecapText(form, [])).toBe('Code WELCOME10 = -10%');
  });

  it('returns recap for promo_code with min order', () => {
    const form = makeForm({
      offerType: 'promo_code',
      promoCode: 'SAVE5',
      promoCodeDiscountType: 'fixed',
      promoCodeDiscountValue: '5',
      promoCodeMinOrderAmount: '20',
    });
    expect(getRecapText(form, [])).toBe('Code SAVE5 = -5\u202F€, minimum 20\u202F€');
  });

  it('returns null for incomplete threshold_discount', () => {
    const form = makeForm({
      offerType: 'threshold_discount',
      thresholdMinAmount: '25',
      thresholdDiscountValue: '',
    });
    expect(getRecapText(form, [])).toBeNull();
  });

  it('returns recap for complete threshold_discount', () => {
    const form = makeForm({
      offerType: 'threshold_discount',
      thresholdMinAmount: '25',
      thresholdDiscountType: 'percentage',
      thresholdDiscountValue: '10',
    });
    expect(getRecapText(form, [])).toBe("Dès 25\u202F€ d'achat = -10% automatiquement");
  });

  it('returns null for incomplete bundle', () => {
    const form = makeForm({ offerType: 'bundle', bundleFixedPrice: '15', bundleCategories: [] });
    expect(getRecapText(form, mockCategories)).toBeNull();
  });

  it('returns recap for complete bundle', () => {
    const form = makeForm({
      offerType: 'bundle',
      name: 'Menu Midi',
      bundleFixedPrice: '15',
      bundleCategories: [
        { categoryIds: ['cat-1'], label: '' },
        { categoryIds: ['cat-2'], label: '' },
      ],
    });
    expect(getRecapText(form, mockCategories)).toBe('Menu Midi = Pizzas + Boissons pour 15\u202F€');
  });

  it('returns recap for bundle with multi-category elements', () => {
    const form = makeForm({
      offerType: 'bundle',
      name: 'Formule',
      bundleFixedPrice: '12',
      bundleCategories: [
        { categoryIds: ['cat-1', 'cat-2'], label: '' },
        { categoryIds: ['cat-3'], label: '' },
      ],
    });
    expect(getRecapText(form, mockCategories)).toBe(
      'Formule = Pizzas / Boissons + Desserts pour 12\u202F€'
    );
  });

  it('returns null for incomplete buy_x_get_y', () => {
    const form = makeForm({
      offerType: 'buy_x_get_y',
      triggerCategoryIds: ['cat-1'],
      rewardCategoryIds: [],
    });
    expect(getRecapText(form, mockCategories)).toBeNull();
  });

  it('returns recap for complete buy_x_get_y', () => {
    const form = makeForm({
      offerType: 'buy_x_get_y',
      triggerQuantity: '3',
      rewardQuantity: '1',
      triggerCategoryIds: ['cat-1'],
      rewardCategoryIds: ['cat-2'],
    });
    expect(getRecapText(form, mockCategories)).toBe('3 Pizzas achetés = 1 Boissons offert');
  });

  it('handles plural reward in buy_x_get_y', () => {
    const form = makeForm({
      offerType: 'buy_x_get_y',
      triggerQuantity: '2',
      rewardQuantity: '2',
      triggerCategoryIds: ['cat-1'],
      rewardCategoryIds: ['cat-3'],
    });
    expect(getRecapText(form, mockCategories)).toBe('2 Pizzas achetés = 2 Desserts offerts');
  });
});

// ============================================
// getValidationErrors
// ============================================

describe('getValidationErrors', () => {
  it('returns name error when name is empty', () => {
    const form = makeForm({ name: '' });
    const errors = getValidationErrors(form);
    expect(errors).toContain("Nom de l'offre manquant");
  });

  it('returns no errors for valid promo_code', () => {
    const form = makeForm({
      offerType: 'promo_code',
      promoCode: 'ABC',
      promoCodeDiscountValue: '10',
    });
    expect(getValidationErrors(form)).toEqual([]);
  });

  it('returns promo_code error when code is missing', () => {
    const form = makeForm({ offerType: 'promo_code', promoCode: '' });
    const errors = getValidationErrors(form);
    expect(errors).toContain('Code promo manquant');
  });

  it('returns bundle errors for incomplete config', () => {
    const form = makeForm({
      offerType: 'bundle',
      bundleFixedPrice: '',
      bundleCategories: [{ categoryIds: ['cat-1'], label: '' }],
    });
    const errors = getValidationErrors(form);
    expect(errors).toContain('Prix de la formule manquant');
    expect(errors).toContain('Une formule doit avoir au moins 2 éléments');
  });

  it('returns buy_x_get_y errors for missing categories', () => {
    const form = makeForm({
      offerType: 'buy_x_get_y',
      triggerCategoryIds: [],
      rewardCategoryIds: [],
    });
    const errors = getValidationErrors(form);
    expect(errors).toContain('Choisis les catégories à acheter.');
    expect(errors).toContain('Choisis les catégories offertes.');
  });

  it('returns threshold error for missing minimum', () => {
    const form = makeForm({
      offerType: 'threshold_discount',
      thresholdMinAmount: '',
      thresholdDiscountValue: '10',
    });
    const errors = getValidationErrors(form);
    expect(errors).toContain('Montant minimum manquant');
  });
});
