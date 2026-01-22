import { vi } from 'vitest';

// Mock API
export const mockApi = {
  promoCodes: {
    validate: vi.fn(),
    countActive: vi.fn(),
    getByFoodtruck: vi.fn(),
  },
  deals: {
    getApplicable: vi.fn(),
    getByFoodtruck: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  loyalty: {
    getCustomerLoyalty: vi.fn(),
  },
  schedules: {
    getByFoodtruck: vi.fn(),
    getExceptions: vi.fn(),
    getAvailableSlots: vi.fn(),
  },
  foodtrucks: {
    getSettings: vi.fn(),
  },
};

// Reset all mocks
export function resetMocks(): void {
  Object.values(mockApi).forEach((module) => {
    Object.values(module).forEach((fn) => {
      if (typeof fn === 'function' && fn.mockReset) {
        fn.mockReset();
      }
    });
  });
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
