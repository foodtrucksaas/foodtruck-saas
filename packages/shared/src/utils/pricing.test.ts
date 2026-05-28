import { describe, it, expect, vi } from 'vitest';
import {
  calculateBundlePrice,
  computeMenuItemPrice,
  getCheapestAbsolutePrice,
  computeCartItemUnitPrice,
} from './pricing';
import type { PricingOptionGroup } from './pricing';
import type { SelectedOption } from '../types';

// ============================================
// computeMenuItemPrice
// ============================================

describe('computeMenuItemPrice', () => {
  it('returns base price when no groups', () => {
    const result = computeMenuItemPrice(1200, [], []);
    expect(result.basePrice).toBe(1200);
    expect(result.modifiersTotal).toBe(0);
    expect(result.unitPrice).toBe(1200);
  });

  it('returns base price when no options selected', () => {
    const groups: PricingOptionGroup[] = [
      {
        id: 'g1',
        price_mode: 'absolute',
        display_order: 0,
        options: [
          { id: 'opt-s', price_modifier: 900, is_available: true },
          { id: 'opt-m', price_modifier: 1100, is_available: true },
        ],
      },
    ];
    const result = computeMenuItemPrice(900, groups, []);
    expect(result.basePrice).toBe(900);
    expect(result.unitPrice).toBe(900);
  });

  it('uses absolute option price as base when selected', () => {
    const groups: PricingOptionGroup[] = [
      {
        id: 'g1',
        price_mode: 'absolute',
        display_order: 0,
        options: [
          { id: 'opt-s', price_modifier: 900, is_available: true },
          { id: 'opt-m', price_modifier: 1100, is_available: true },
          { id: 'opt-l', price_modifier: 1300, is_available: true },
        ],
      },
    ];
    const result = computeMenuItemPrice(900, groups, ['opt-l']);
    expect(result.basePrice).toBe(1300);
    expect(result.modifiersTotal).toBe(0);
    expect(result.unitPrice).toBe(1300);
  });

  it('adds modifier options to base price', () => {
    const groups: PricingOptionGroup[] = [
      {
        id: 'g-supp',
        price_mode: 'modifier',
        display_order: 1,
        options: [
          { id: 'opt-cheese', price_modifier: 150, is_available: true },
          { id: 'opt-bacon', price_modifier: 200, is_available: true },
        ],
      },
    ];
    const result = computeMenuItemPrice(1000, groups, ['opt-cheese', 'opt-bacon']);
    expect(result.basePrice).toBe(1000);
    expect(result.modifiersTotal).toBe(350);
    expect(result.unitPrice).toBe(1350);
  });

  it('combines absolute + modifier groups correctly', () => {
    const groups: PricingOptionGroup[] = [
      {
        id: 'g-size',
        price_mode: 'absolute',
        display_order: 0,
        options: [
          { id: 'opt-m', price_modifier: 1000, is_available: true },
          { id: 'opt-l', price_modifier: 1300, is_available: true },
        ],
      },
      {
        id: 'g-supp',
        price_mode: 'modifier',
        display_order: 1,
        options: [{ id: 'opt-cheese', price_modifier: 150, is_available: true }],
      },
    ];
    // Taille L (13€) + fromage (+1.50€) = 14.50€
    const result = computeMenuItemPrice(1000, groups, ['opt-l', 'opt-cheese']);
    expect(result.basePrice).toBe(1300);
    expect(result.modifiersTotal).toBe(150);
    expect(result.unitPrice).toBe(1450);
  });

  it('ignores unavailable options in modifier groups', () => {
    const groups: PricingOptionGroup[] = [
      {
        id: 'g-supp',
        price_mode: 'modifier',
        display_order: 0,
        options: [{ id: 'opt-cheese', price_modifier: 150, is_available: false }],
      },
    ];
    const result = computeMenuItemPrice(1000, groups, ['opt-cheese']);
    expect(result.modifiersTotal).toBe(0);
    expect(result.unitPrice).toBe(1000);
  });

  it('ignores unavailable options in absolute groups', () => {
    const groups: PricingOptionGroup[] = [
      {
        id: 'g-size',
        price_mode: 'absolute',
        display_order: 0,
        options: [{ id: 'opt-l', price_modifier: 1300, is_available: false }],
      },
    ];
    const result = computeMenuItemPrice(900, groups, ['opt-l']);
    expect(result.basePrice).toBe(900); // Fallback to menuItem.price
  });

  it('handles multiple modifier groups', () => {
    const groups: PricingOptionGroup[] = [
      {
        id: 'g-base',
        price_mode: 'modifier',
        display_order: 0,
        options: [
          { id: 'opt-tomate', price_modifier: 0, is_available: true },
          { id: 'opt-creme', price_modifier: 50, is_available: true },
        ],
      },
      {
        id: 'g-supp',
        price_mode: 'modifier',
        display_order: 1,
        options: [{ id: 'opt-cheese', price_modifier: 150, is_available: true }],
      },
    ];
    const result = computeMenuItemPrice(1000, groups, ['opt-creme', 'opt-cheese']);
    expect(result.modifiersTotal).toBe(200);
    expect(result.unitPrice).toBe(1200);
  });

  it('warns and uses first absolute group if multiple exist', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const groups: PricingOptionGroup[] = [
      {
        id: 'g1',
        price_mode: 'absolute',
        display_order: 1, // Higher order
        options: [{ id: 'opt-a', price_modifier: 2000, is_available: true }],
      },
      {
        id: 'g2',
        price_mode: 'absolute',
        display_order: 0, // Lower order — should be used
        options: [{ id: 'opt-b', price_modifier: 500, is_available: true }],
      },
    ];
    const result = computeMenuItemPrice(900, groups, ['opt-b']);
    expect(result.basePrice).toBe(500);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Multiple absolute groups'));
    warnSpy.mockRestore();
  });

  it('handles zero-price modifier options (gratuit)', () => {
    const groups: PricingOptionGroup[] = [
      {
        id: 'g-supp',
        price_mode: 'modifier',
        display_order: 0,
        options: [{ id: 'opt-ketchup', price_modifier: 0, is_available: true }],
      },
    ];
    const result = computeMenuItemPrice(1000, groups, ['opt-ketchup']);
    expect(result.modifiersTotal).toBe(0);
    expect(result.unitPrice).toBe(1000);
  });

  it('ignores selected options that are not in any group', () => {
    const groups: PricingOptionGroup[] = [
      {
        id: 'g1',
        price_mode: 'modifier',
        display_order: 0,
        options: [{ id: 'opt-a', price_modifier: 100, is_available: true }],
      },
    ];
    const result = computeMenuItemPrice(1000, groups, ['opt-a', 'opt-unknown']);
    expect(result.modifiersTotal).toBe(100);
    expect(result.unitPrice).toBe(1100);
  });
});

// ============================================
// getCheapestAbsolutePrice
// ============================================

describe('getCheapestAbsolutePrice', () => {
  it('returns null when no groups', () => {
    expect(getCheapestAbsolutePrice([])).toBeNull();
  });

  it('returns null when no absolute group', () => {
    const groups: PricingOptionGroup[] = [
      {
        id: 'g1',
        price_mode: 'modifier',
        display_order: 0,
        options: [{ id: 'opt-a', price_modifier: 100, is_available: true }],
      },
    ];
    expect(getCheapestAbsolutePrice(groups)).toBeNull();
  });

  it('returns cheapest available option in absolute group', () => {
    const groups: PricingOptionGroup[] = [
      {
        id: 'g1',
        price_mode: 'absolute',
        display_order: 0,
        options: [
          { id: 'opt-s', price_modifier: 900, is_available: true },
          { id: 'opt-m', price_modifier: 1100, is_available: true },
          { id: 'opt-l', price_modifier: 1300, is_available: true },
        ],
      },
    ];
    expect(getCheapestAbsolutePrice(groups)).toBe(900);
  });

  it('skips unavailable options', () => {
    const groups: PricingOptionGroup[] = [
      {
        id: 'g1',
        price_mode: 'absolute',
        display_order: 0,
        options: [
          { id: 'opt-s', price_modifier: 900, is_available: false },
          { id: 'opt-m', price_modifier: 1100, is_available: true },
        ],
      },
    ];
    expect(getCheapestAbsolutePrice(groups)).toBe(1100);
  });

  it('returns null when all absolute options are unavailable', () => {
    const groups: PricingOptionGroup[] = [
      {
        id: 'g1',
        price_mode: 'absolute',
        display_order: 0,
        options: [{ id: 'opt-s', price_modifier: 900, is_available: false }],
      },
    ];
    expect(getCheapestAbsolutePrice(groups)).toBeNull();
  });
});

// ============================================
// computeCartItemUnitPrice
// ============================================

describe('computeCartItemUnitPrice', () => {
  it('returns menuItemPrice when no options', () => {
    expect(computeCartItemUnitPrice(1200)).toBe(1200);
    expect(computeCartItemUnitPrice(1200, [])).toBe(1200);
    expect(computeCartItemUnitPrice(1200, undefined)).toBe(1200);
  });

  it('uses absolute option as base (priceMode)', () => {
    const options: SelectedOption[] = [
      {
        optionId: 'o1',
        optionGroupId: 'g1',
        name: 'XL',
        groupName: 'Taille',
        priceModifier: 1500,
        priceMode: 'absolute',
      },
    ];
    expect(computeCartItemUnitPrice(1200, options)).toBe(1500);
  });

  it('uses absolute option as base (legacy isSizeOption)', () => {
    const options: SelectedOption[] = [
      {
        optionId: 'o1',
        optionGroupId: 'g1',
        name: 'XL',
        groupName: 'Taille',
        priceModifier: 1500,
        isSizeOption: true,
      },
    ];
    expect(computeCartItemUnitPrice(1200, options)).toBe(1500);
  });

  it('adds modifier options', () => {
    const options: SelectedOption[] = [
      {
        optionId: 'o1',
        optionGroupId: 'g1',
        name: 'Fromage',
        groupName: 'Extras',
        priceModifier: 200,
        priceMode: 'modifier',
      },
      {
        optionId: 'o2',
        optionGroupId: 'g1',
        name: 'Bacon',
        groupName: 'Extras',
        priceModifier: 300,
        priceMode: 'modifier',
      },
    ];
    expect(computeCartItemUnitPrice(1000, options)).toBe(1500);
  });

  it('combines absolute and modifier options', () => {
    const options: SelectedOption[] = [
      {
        optionId: 'o1',
        optionGroupId: 'g1',
        name: 'XL',
        groupName: 'Taille',
        priceModifier: 1500,
        priceMode: 'absolute',
      },
      {
        optionId: 'o2',
        optionGroupId: 'g2',
        name: 'Fromage',
        groupName: 'Extras',
        priceModifier: 200,
        priceMode: 'modifier',
      },
    ];
    expect(computeCartItemUnitPrice(1000, options)).toBe(1700);
  });

  it('priceMode takes precedence over isSizeOption', () => {
    const options: SelectedOption[] = [
      {
        optionId: 'o1',
        optionGroupId: 'g1',
        name: 'Normal',
        groupName: 'Taille',
        priceModifier: 100,
        priceMode: 'modifier',
        isSizeOption: true,
      },
    ];
    // priceMode says modifier, so it adds to base, not replaces
    expect(computeCartItemUnitPrice(1000, options)).toBe(1100);
  });

  it('agrees with computeMenuItemPrice for the same inputs', () => {
    // Simulate the same scenario via both functions
    const groups: PricingOptionGroup[] = [
      {
        id: 'g1',
        price_mode: 'absolute',
        display_order: 0,
        options: [
          { id: 'opt-s', price_modifier: 900, is_available: true },
          { id: 'opt-l', price_modifier: 1400, is_available: true },
        ],
      },
      {
        id: 'g2',
        price_mode: 'modifier',
        display_order: 1,
        options: [{ id: 'opt-cheese', price_modifier: 200, is_available: true }],
      },
    ];
    const selectedIds = ['opt-l', 'opt-cheese'];
    const { unitPrice } = computeMenuItemPrice(1000, groups, selectedIds);

    // Same scenario via cart function
    const cartOptions: SelectedOption[] = [
      {
        optionId: 'opt-l',
        optionGroupId: 'g1',
        name: 'Large',
        groupName: 'Taille',
        priceModifier: 1400,
        priceMode: 'absolute',
      },
      {
        optionId: 'opt-cheese',
        optionGroupId: 'g2',
        name: 'Fromage',
        groupName: 'Extras',
        priceModifier: 200,
        priceMode: 'modifier',
      },
    ];
    const cartUnitPrice = computeCartItemUnitPrice(1000, cartOptions);

    expect(unitPrice).toBe(1600);
    expect(cartUnitPrice).toBe(1600);
    expect(unitPrice).toBe(cartUnitPrice);
  });
});

describe('calculateBundlePrice', () => {
  // ── Base cases ──

  it('returns fixedPrice when no options and no supplements', () => {
    const result = calculateBundlePrice({
      fixedPrice: 1200,
      freeOptions: false,
      selections: [
        { supplement: 0, selectedOptions: [] },
        { supplement: 0, selectedOptions: [] },
      ],
    });

    expect(result.fixedPrice).toBe(1200);
    expect(result.supplementsTotal).toBe(0);
    expect(result.optionsTotal).toBe(0);
    expect(result.unitPrice).toBe(1200);
    expect(result.total).toBe(1200);
  });

  it('multiplies by quantity', () => {
    const result = calculateBundlePrice(
      {
        fixedPrice: 1200,
        freeOptions: false,
        selections: [{ supplement: 0, selectedOptions: [] }],
      },
      3
    );

    expect(result.unitPrice).toBe(1200);
    expect(result.total).toBe(3600);
  });

  // ── Size options affect price ──

  it('includes size option price modifiers (S = 0, M = 300, L = 600)', () => {
    const resultS = calculateBundlePrice({
      fixedPrice: 1200,
      freeOptions: false,
      selections: [
        {
          supplement: 0,
          selectedOptions: [
            {
              optionId: 's',
              optionGroupId: 'size',
              name: 'S',
              groupName: 'Taille',
              priceModifier: 0,
            },
          ],
        },
      ],
    });

    const resultM = calculateBundlePrice({
      fixedPrice: 1200,
      freeOptions: false,
      selections: [
        {
          supplement: 0,
          selectedOptions: [
            {
              optionId: 'm',
              optionGroupId: 'size',
              name: 'M',
              groupName: 'Taille',
              priceModifier: 300,
            },
          ],
        },
      ],
    });

    const resultL = calculateBundlePrice({
      fixedPrice: 1200,
      freeOptions: false,
      selections: [
        {
          supplement: 0,
          selectedOptions: [
            {
              optionId: 'l',
              optionGroupId: 'size',
              name: 'L',
              groupName: 'Taille',
              priceModifier: 600,
            },
          ],
        },
      ],
    });

    expect(resultS.unitPrice).toBe(1200);
    expect(resultM.unitPrice).toBe(1500);
    expect(resultL.unitPrice).toBe(1800);

    // Different sizes must produce different prices
    expect(resultM.unitPrice).toBeGreaterThan(resultS.unitPrice);
    expect(resultL.unitPrice).toBeGreaterThan(resultM.unitPrice);
  });

  // ── Supplements (from bundle config) ──

  it('adds supplements from bundle config', () => {
    const result = calculateBundlePrice({
      fixedPrice: 1200,
      freeOptions: false,
      selections: [
        { supplement: 300, selectedOptions: [] },
        { supplement: 0, selectedOptions: [] },
      ],
    });

    expect(result.supplementsTotal).toBe(300);
    expect(result.unitPrice).toBe(1500);
  });

  it('sums supplements from multiple selections', () => {
    const result = calculateBundlePrice({
      fixedPrice: 1200,
      freeOptions: false,
      selections: [
        { supplement: 300, selectedOptions: [] },
        { supplement: 200, selectedOptions: [] },
      ],
    });

    expect(result.supplementsTotal).toBe(500);
    expect(result.unitPrice).toBe(1700);
  });

  // ── Non-size options (extras, base, etc.) ──

  it('adds non-size option modifiers', () => {
    const result = calculateBundlePrice({
      fixedPrice: 1200,
      freeOptions: false,
      selections: [
        {
          supplement: 0,
          selectedOptions: [
            {
              optionId: 's',
              optionGroupId: 'size',
              name: 'S',
              groupName: 'Taille',
              priceModifier: 0,
            },
            {
              optionId: 'cheese',
              optionGroupId: 'extras',
              name: 'Extra fromage',
              groupName: 'Suppléments',
              priceModifier: 150,
            },
          ],
        },
      ],
    });

    expect(result.optionsTotal).toBe(150);
    expect(result.unitPrice).toBe(1350);
  });

  // ── Free options ──

  it('ignores all option modifiers when freeOptions is true', () => {
    const result = calculateBundlePrice({
      fixedPrice: 1200,
      freeOptions: true,
      selections: [
        {
          supplement: 0,
          selectedOptions: [
            {
              optionId: 'm',
              optionGroupId: 'size',
              name: 'M',
              groupName: 'Taille',
              priceModifier: 300,
            },
            {
              optionId: 'cheese',
              optionGroupId: 'extras',
              name: 'Extra fromage',
              groupName: 'Suppléments',
              priceModifier: 150,
            },
          ],
        },
      ],
    });

    expect(result.optionsTotal).toBe(0);
    expect(result.unitPrice).toBe(1200);
  });

  it('still includes supplements even when freeOptions is true', () => {
    const result = calculateBundlePrice({
      fixedPrice: 1200,
      freeOptions: true,
      selections: [
        {
          supplement: 300,
          selectedOptions: [
            {
              optionId: 'm',
              optionGroupId: 'size',
              name: 'M',
              groupName: 'Taille',
              priceModifier: 300,
            },
          ],
        },
      ],
    });

    expect(result.supplementsTotal).toBe(300);
    expect(result.optionsTotal).toBe(0);
    expect(result.unitPrice).toBe(1500);
  });

  // ── Full realistic bundle: 2 pizzas ──

  it('calculates a realistic 2-pizza bundle correctly', () => {
    const result = calculateBundlePrice(
      {
        fixedPrice: 2000, // Bundle base: 20€
        freeOptions: false,
        selections: [
          {
            // Pizza 1: Napoli M + tomate
            supplement: 0,
            selectedOptions: [
              {
                optionId: 'm',
                optionGroupId: 'size',
                name: 'M',
                groupName: 'Taille',
                priceModifier: 300,
              },
              {
                optionId: 'tom',
                optionGroupId: 'base',
                name: 'Tomate',
                groupName: 'Base',
                priceModifier: 0,
              },
            ],
          },
          {
            // Pizza 2: Margherita L + crème
            supplement: 0,
            selectedOptions: [
              {
                optionId: 'l',
                optionGroupId: 'size',
                name: 'L',
                groupName: 'Taille',
                priceModifier: 600,
              },
              {
                optionId: 'cream',
                optionGroupId: 'base',
                name: 'Crème',
                groupName: 'Base',
                priceModifier: 0,
              },
              {
                optionId: 'cheese',
                optionGroupId: 'extras',
                name: 'Extra fromage',
                groupName: 'Suppléments',
                priceModifier: 150,
              },
            ],
          },
        ],
      },
      2
    );

    // Options: 300 (M) + 0 (tomate) + 600 (L) + 0 (crème) + 150 (fromage) = 1050
    expect(result.optionsTotal).toBe(1050);
    expect(result.unitPrice).toBe(2000 + 1050);
    expect(result.total).toBe((2000 + 1050) * 2);
  });

  // ── Edge cases ──

  it('handles selections with undefined selectedOptions', () => {
    const result = calculateBundlePrice({
      fixedPrice: 1200,
      freeOptions: false,
      selections: [
        { supplement: 0 } as any, // no selectedOptions property
      ],
    });

    expect(result.optionsTotal).toBe(0);
    expect(result.unitPrice).toBe(1200);
  });

  it('handles empty selections array', () => {
    const result = calculateBundlePrice({
      fixedPrice: 1200,
      freeOptions: false,
      selections: [],
    });

    expect(result.unitPrice).toBe(1200);
    expect(result.total).toBe(1200);
  });

  it('defaults quantity to 1', () => {
    const result = calculateBundlePrice({
      fixedPrice: 1200,
      freeOptions: false,
      selections: [],
    });

    expect(result.total).toBe(result.unitPrice);
  });
});
