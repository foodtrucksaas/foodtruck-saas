import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCategories } from './useCategories';
import type { Category } from '@foodtruck/shared';

// Mock the api module
const mockCreateCategory = vi.fn();
const mockUpdateCategory = vi.fn();
const mockDeleteCategory = vi.fn();
const mockReorderCategories = vi.fn();

vi.mock('../lib/api', () => ({
  api: {
    menu: {
      createCategory: () => mockCreateCategory(),
      updateCategory: (id: string, updates: unknown) => mockUpdateCategory(id, updates),
      deleteCategory: (id: string) => mockDeleteCategory(id),
      reorderCategories: (updates: unknown) => mockReorderCategories(updates),
    },
  },
}));

// Mock window.confirm
const mockConfirm = vi.fn();
global.confirm = mockConfirm;

describe('useCategories', () => {
  const mockCategory: Category = {
    id: 'cat-1',
    foodtruck_id: 'ft-1',
    name: 'Entrées',
    display_order: 0,
    created_at: '2024-01-01',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockConfirm.mockReturnValue(true);
  });

  it('should initialize with saving false', () => {
    const { result } = renderHook(() => useCategories());

    expect(result.current.saving).toBe(false);
  });

  it('should create category successfully', async () => {
    const newCategory = { ...mockCategory, id: 'cat-new' };
    mockCreateCategory.mockResolvedValue(newCategory);

    const onSuccess = vi.fn();
    const { result } = renderHook(() => useCategories(onSuccess));

    let createdCategory: Category | null = null;
    await act(async () => {
      createdCategory = await result.current.createCategory({
        foodtruck_id: 'ft-1',
        name: 'Entrées',
        display_order: 0,
      });
    });

    expect(createdCategory).toEqual(newCategory);
    expect(onSuccess).toHaveBeenCalled();
    expect(result.current.saving).toBe(false);
  });

  it('should handle create category error', async () => {
    mockCreateCategory.mockRejectedValue(new Error('Create error'));

    const { result } = renderHook(() => useCategories());

    let createdCategory: Category | null = null;
    await act(async () => {
      createdCategory = await result.current.createCategory({
        foodtruck_id: 'ft-1',
        name: 'Entrées',
        display_order: 0,
      });
    });

    expect(createdCategory).toBeNull();
    expect(result.current.saving).toBe(false);
  });

  it('should update category successfully', async () => {
    mockUpdateCategory.mockResolvedValue(mockCategory);

    const onSuccess = vi.fn();
    const { result } = renderHook(() => useCategories(onSuccess));

    let success = false;
    await act(async () => {
      success = await result.current.updateCategory('cat-1', { name: 'New Name' });
    });

    expect(success).toBe(true);
    expect(onSuccess).toHaveBeenCalled();
  });

  it('should handle update category error', async () => {
    mockUpdateCategory.mockRejectedValue(new Error('Update error'));

    const { result } = renderHook(() => useCategories());

    let success = false;
    await act(async () => {
      success = await result.current.updateCategory('cat-1', { name: 'New Name' });
    });

    expect(success).toBe(false);
  });

  it('should not delete category with items', async () => {
    const { result } = renderHook(() => useCategories());

    const menuItems = [{ category_id: 'cat-1', id: 'item-1' }];

    let success = false;
    await act(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      success = await result.current.deleteCategory(mockCategory, menuItems as any);
    });

    expect(success).toBe(false);
    expect(mockDeleteCategory).not.toHaveBeenCalled();
  });

  it('should delete empty category after confirmation', async () => {
    mockDeleteCategory.mockResolvedValue(undefined);
    mockConfirm.mockReturnValue(true);

    const onSuccess = vi.fn();
    const { result } = renderHook(() => useCategories(onSuccess));

    let success = false;
    await act(async () => {
      success = await result.current.deleteCategory(mockCategory, []);
    });

    expect(mockConfirm).toHaveBeenCalled();
    expect(success).toBe(true);
    expect(onSuccess).toHaveBeenCalled();
  });

  it('should not delete if confirmation cancelled', async () => {
    mockConfirm.mockReturnValue(false);

    const { result } = renderHook(() => useCategories());

    let success = false;
    await act(async () => {
      success = await result.current.deleteCategory(mockCategory, []);
    });

    expect(success).toBe(false);
    expect(mockDeleteCategory).not.toHaveBeenCalled();
  });

  it('should move category up', async () => {
    mockReorderCategories.mockResolvedValue(undefined);

    const categories: Category[] = [
      { ...mockCategory, id: 'cat-1', display_order: 0 },
      { ...mockCategory, id: 'cat-2', display_order: 1 },
    ];

    const onSuccess = vi.fn();
    const { result } = renderHook(() => useCategories(onSuccess));

    let success = false;
    await act(async () => {
      success = await result.current.moveCategoryUp(categories, categories[1], 1);
    });

    expect(success).toBe(true);
    expect(mockReorderCategories).toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalled();
  });

  it('should not move first category up', async () => {
    const categories: Category[] = [{ ...mockCategory, id: 'cat-1', display_order: 0 }];

    const { result } = renderHook(() => useCategories());

    let success = false;
    await act(async () => {
      success = await result.current.moveCategoryUp(categories, categories[0], 0);
    });

    expect(success).toBe(false);
    expect(mockReorderCategories).not.toHaveBeenCalled();
  });

  it('should move category down', async () => {
    mockReorderCategories.mockResolvedValue(undefined);

    const categories: Category[] = [
      { ...mockCategory, id: 'cat-1', display_order: 0 },
      { ...mockCategory, id: 'cat-2', display_order: 1 },
    ];

    const onSuccess = vi.fn();
    const { result } = renderHook(() => useCategories(onSuccess));

    let success = false;
    await act(async () => {
      success = await result.current.moveCategoryDown(categories, categories[0], 0);
    });

    expect(success).toBe(true);
    expect(mockReorderCategories).toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalled();
  });

  it('should not move last category down', async () => {
    const categories: Category[] = [{ ...mockCategory, id: 'cat-1', display_order: 0 }];

    const { result } = renderHook(() => useCategories());

    let success = false;
    await act(async () => {
      success = await result.current.moveCategoryDown(categories, categories[0], 0);
    });

    expect(success).toBe(false);
    expect(mockReorderCategories).not.toHaveBeenCalled();
  });
});
