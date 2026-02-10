import { describe, it, expect } from 'vitest';
import { calculateBundlePrice } from './pricing';

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
