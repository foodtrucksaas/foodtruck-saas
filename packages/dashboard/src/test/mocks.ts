import { vi } from 'vitest';

// Mock API
export const mockMenuApi = {
  getCategories: vi.fn(),
  getItems: vi.fn(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
  reorderCategories: vi.fn(),
  createItem: vi.fn(),
  updateItem: vi.fn(),
  deleteItem: vi.fn(),
  toggleAvailability: vi.fn(),
  getOptionGroups: vi.fn(),
  getCategoryOptions: vi.fn(),
};

export const mockApi = {
  menu: mockMenuApi,
  orders: {
    getByFoodtruck: vi.fn(),
    updateStatus: vi.fn(),
  },
  schedules: {
    getByFoodtruck: vi.fn(),
  },
  locations: {
    getByFoodtruck: vi.fn(),
  },
  foodtrucks: {
    getByUserId: vi.fn(),
    update: vi.fn(),
  },
};

// Reset all mocks
export function resetMocks() {
  const resetObject = (obj: Record<string, unknown>) => {
    Object.values(obj).forEach((value) => {
      if (typeof value === 'function' && 'mockReset' in value) {
        (value as ReturnType<typeof vi.fn>).mockReset();
      } else if (typeof value === 'object' && value !== null) {
        resetObject(value as Record<string, unknown>);
      }
    });
  };
  resetObject(mockApi);
}

// Mock toast
export const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  loading: vi.fn(),
};

vi.mock('react-hot-toast', () => ({
  default: mockToast,
  toast: mockToast,
}));
