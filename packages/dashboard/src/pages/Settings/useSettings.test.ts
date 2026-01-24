import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSettings } from './useSettings';

// Mock useImageUpload
const mockUploadImage = vi.fn();
const mockDeleteImage = vi.fn();
vi.mock('../../hooks/useImageUpload', () => ({
  useImageUpload: () => ({
    uploading: false,
    uploadImage: mockUploadImage,
    deleteImage: mockDeleteImage,
  }),
}));

// Mock image compression
vi.mock('../../utils/imageCompression', () => ({
  compressLogo: vi.fn((file) => Promise.resolve(file)),
  compressCover: vi.fn((file) => Promise.resolve(file)),
}));

// Mock FoodtruckContext
const mockFoodtruck = {
  id: 'ft-1',
  name: 'Test Foodtruck',
  description: 'A test foodtruck',
  cuisine_types: ['burger', 'frites'],
  phone: '0612345678',
  email: 'test@foodtruck.com',
  is_mobile: true,
  show_menu_photos: true,
  auto_accept_orders: false,
  max_orders_per_slot: 10,
  order_slot_interval: 15,
  show_order_popup: true,
  use_ready_status: false,
  allow_advance_orders: true,
  advance_order_days: 7,
  allow_asap_orders: false,
  min_preparation_time: 15,
  send_confirmation_email: true,
  send_reminder_email: false,
  offers_stackable: false,
  promo_codes_stackable: true,
  logo_url: 'https://example.com/logo.png',
  cover_image_url: 'https://example.com/cover.png',
};

const mockUpdateFoodtruck = vi.fn();

vi.mock('../../contexts/FoodtruckContext', () => ({
  useFoodtruck: () => ({
    foodtruck: mockFoodtruck,
    updateFoodtruck: mockUpdateFoodtruck,
  }),
}));

// Mock AuthContext
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
  }),
}));

// Mock clipboard
const mockWriteText = vi.fn();
Object.assign(navigator, {
  clipboard: {
    writeText: mockWriteText,
  },
});

describe('useSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateFoodtruck.mockResolvedValue(undefined);
    mockUploadImage.mockResolvedValue('https://example.com/new-image.png');
  });

  describe('initialization', () => {
    it('should return foodtruck data', () => {
      const { result } = renderHook(() => useSettings());

      expect(result.current.foodtruck).toEqual(mockFoodtruck);
    });

    it('should initialize with no editing field', () => {
      const { result } = renderHook(() => useSettings());

      expect(result.current.editingField).toBeNull();
    });

    it('should initialize with editLoading false', () => {
      const { result } = renderHook(() => useSettings());

      expect(result.current.editLoading).toBe(false);
    });

    it('should generate client link', () => {
      const { result } = renderHook(() => useSettings());

      expect(result.current.clientLink).toContain('ft-1');
    });
  });

  describe('startEditing', () => {
    it('should set editingField and populate editForm', () => {
      const { result } = renderHook(() => useSettings());

      act(() => {
        result.current.startEditing('name');
      });

      expect(result.current.editingField).toBe('name');
      expect(result.current.editForm.name).toBe('Test Foodtruck');
    });

    it('should populate cuisine_types from foodtruck', () => {
      const { result } = renderHook(() => useSettings());

      act(() => {
        result.current.startEditing('cuisine_types');
      });

      expect(result.current.editForm.cuisine_types).toEqual(['burger', 'frites']);
    });

    it('should populate contact fields', () => {
      const { result } = renderHook(() => useSettings());

      act(() => {
        result.current.startEditing('contact');
      });

      expect(result.current.editForm.phone).toBe('0612345678');
      expect(result.current.editForm.email).toBe('test@foodtruck.com');
    });

    it('should populate boolean fields correctly', () => {
      const { result } = renderHook(() => useSettings());

      act(() => {
        result.current.startEditing('show_menu_photos');
      });

      expect(result.current.editForm.show_menu_photos).toBe(true);
      expect(result.current.editForm.auto_accept_orders).toBe(false);
    });
  });

  describe('cancelEditing', () => {
    it('should set editingField to null', () => {
      const { result } = renderHook(() => useSettings());

      act(() => {
        result.current.startEditing('name');
      });

      expect(result.current.editingField).toBe('name');

      act(() => {
        result.current.cancelEditing();
      });

      expect(result.current.editingField).toBeNull();
    });
  });

  describe('updateEditForm', () => {
    it('should update single field in editForm', () => {
      const { result } = renderHook(() => useSettings());

      act(() => {
        result.current.startEditing('name');
      });

      act(() => {
        result.current.updateEditForm('name', 'New Name');
      });

      expect(result.current.editForm.name).toBe('New Name');
    });

    it('should update boolean field', () => {
      const { result } = renderHook(() => useSettings());

      act(() => {
        result.current.startEditing('show_menu_photos');
      });

      act(() => {
        result.current.updateEditForm('show_menu_photos', false);
      });

      expect(result.current.editForm.show_menu_photos).toBe(false);
    });

    it('should update number field', () => {
      const { result } = renderHook(() => useSettings());

      act(() => {
        result.current.startEditing('order_slot_interval');
      });

      act(() => {
        result.current.updateEditForm('order_slot_interval', 30);
      });

      expect(result.current.editForm.order_slot_interval).toBe(30);
    });
  });

  describe('toggleCuisineType', () => {
    it('should add cuisine type if not present', () => {
      const { result } = renderHook(() => useSettings());

      act(() => {
        result.current.startEditing('cuisine_types');
      });

      act(() => {
        result.current.toggleCuisineType('pizza');
      });

      expect(result.current.editForm.cuisine_types).toContain('pizza');
    });

    it('should remove cuisine type if present', () => {
      const { result } = renderHook(() => useSettings());

      act(() => {
        result.current.startEditing('cuisine_types');
      });

      expect(result.current.editForm.cuisine_types).toContain('burger');

      act(() => {
        result.current.toggleCuisineType('burger');
      });

      expect(result.current.editForm.cuisine_types).not.toContain('burger');
    });
  });

  describe('saveField', () => {
    it('should save name field', async () => {
      const { result } = renderHook(() => useSettings());

      act(() => {
        result.current.startEditing('name');
        result.current.updateEditForm('name', 'Updated Name');
      });

      await act(async () => {
        await result.current.saveField('name');
      });

      expect(mockUpdateFoodtruck).toHaveBeenCalledWith({ name: 'Updated Name' });
      expect(result.current.editingField).toBeNull();
    });

    it('should not save empty name', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useSettings());

      act(() => {
        result.current.startEditing('name');
        result.current.updateEditForm('name', '   ');
      });

      await act(async () => {
        await result.current.saveField('name');
      });

      expect(mockUpdateFoodtruck).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('name is required'));

      consoleSpy.mockRestore();
    });

    it('should not save empty cuisine_types', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useSettings());

      act(() => {
        result.current.startEditing('cuisine_types');
        result.current.updateEditForm('cuisine_types', []);
      });

      await act(async () => {
        await result.current.saveField('cuisine_types');
      });

      expect(mockUpdateFoodtruck).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('cuisine type is required'));

      consoleSpy.mockRestore();
    });

    it('should save description field', async () => {
      const { result } = renderHook(() => useSettings());

      act(() => {
        result.current.startEditing('description');
        result.current.updateEditForm('description', 'New description');
      });

      await act(async () => {
        await result.current.saveField('description');
      });

      expect(mockUpdateFoodtruck).toHaveBeenCalledWith({ description: 'New description' });
    });

    it('should save contact fields', async () => {
      const { result } = renderHook(() => useSettings());

      act(() => {
        result.current.startEditing('contact');
        result.current.updateEditForm('phone', '0698765432');
        result.current.updateEditForm('email', 'new@email.com');
      });

      await act(async () => {
        await result.current.saveField('contact');
      });

      expect(mockUpdateFoodtruck).toHaveBeenCalledWith({
        phone: '0698765432',
        email: 'new@email.com',
      });
    });

    it('should save boolean settings', async () => {
      const { result } = renderHook(() => useSettings());

      act(() => {
        result.current.startEditing('show_menu_photos');
        result.current.updateEditForm('show_menu_photos', false);
      });

      await act(async () => {
        await result.current.saveField('show_menu_photos');
      });

      expect(mockUpdateFoodtruck).toHaveBeenCalledWith({ show_menu_photos: false });
    });

    it('should save auto_accept_orders', async () => {
      const { result } = renderHook(() => useSettings());

      act(() => {
        result.current.startEditing('auto_accept_orders');
        result.current.updateEditForm('auto_accept_orders', true);
      });

      await act(async () => {
        await result.current.saveField('auto_accept_orders');
      });

      expect(mockUpdateFoodtruck).toHaveBeenCalledWith({ auto_accept_orders: true });
    });

    it('should save order_slot_interval', async () => {
      const { result } = renderHook(() => useSettings());

      act(() => {
        result.current.startEditing('order_slot_interval');
        result.current.updateEditForm('order_slot_interval', 30);
      });

      await act(async () => {
        await result.current.saveField('order_slot_interval');
      });

      expect(mockUpdateFoodtruck).toHaveBeenCalledWith({ order_slot_interval: 30 });
    });

    it('should save max_orders_per_slot', async () => {
      const { result } = renderHook(() => useSettings());

      act(() => {
        result.current.startEditing('max_orders_per_slot');
        result.current.updateEditForm('max_orders_per_slot', 20);
      });

      await act(async () => {
        await result.current.saveField('max_orders_per_slot');
      });

      expect(mockUpdateFoodtruck).toHaveBeenCalledWith({ max_orders_per_slot: 20 });
    });

    it('should save allow_advance_orders with advance_order_days', async () => {
      const { result } = renderHook(() => useSettings());

      act(() => {
        result.current.startEditing('allow_advance_orders');
        result.current.updateEditForm('allow_advance_orders', true);
        result.current.updateEditForm('advance_order_days', 14);
      });

      await act(async () => {
        await result.current.saveField('allow_advance_orders');
      });

      expect(mockUpdateFoodtruck).toHaveBeenCalledWith({
        allow_advance_orders: true,
        advance_order_days: 14,
      });
    });

    it('should set advance_order_days to null when disabling advance orders', async () => {
      const { result } = renderHook(() => useSettings());

      act(() => {
        result.current.startEditing('allow_advance_orders');
        result.current.updateEditForm('allow_advance_orders', false);
      });

      await act(async () => {
        await result.current.saveField('allow_advance_orders');
      });

      expect(mockUpdateFoodtruck).toHaveBeenCalledWith({
        allow_advance_orders: false,
        advance_order_days: null,
      });
    });

    it('should save min_preparation_time', async () => {
      const { result } = renderHook(() => useSettings());

      act(() => {
        result.current.startEditing('min_preparation_time');
        result.current.updateEditForm('min_preparation_time', 30);
      });

      await act(async () => {
        await result.current.saveField('min_preparation_time');
      });

      expect(mockUpdateFoodtruck).toHaveBeenCalledWith({ min_preparation_time: 30 });
    });

    it('should save offers_stackable', async () => {
      const { result } = renderHook(() => useSettings());

      act(() => {
        result.current.startEditing('offers_stackable');
        result.current.updateEditForm('offers_stackable', true);
      });

      await act(async () => {
        await result.current.saveField('offers_stackable');
      });

      expect(mockUpdateFoodtruck).toHaveBeenCalledWith({ offers_stackable: true });
    });

    it('should handle save error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockUpdateFoodtruck.mockRejectedValueOnce(new Error('Save error'));

      const { result } = renderHook(() => useSettings());

      act(() => {
        result.current.startEditing('name');
        result.current.updateEditForm('name', 'New Name');
      });

      await act(async () => {
        await result.current.saveField('name');
      });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Error updating settings'), expect.any(Error));
      expect(result.current.editLoading).toBe(false);

      consoleSpy.mockRestore();
    });

    it('should not save if field is null', async () => {
      const { result } = renderHook(() => useSettings());

      await act(async () => {
        await result.current.saveField(null);
      });

      expect(mockUpdateFoodtruck).not.toHaveBeenCalled();
    });
  });

  describe('copyClientLink', () => {
    it('should copy client link to clipboard', () => {
      const { result } = renderHook(() => useSettings());

      act(() => {
        result.current.copyClientLink();
      });

      expect(mockWriteText).toHaveBeenCalledWith(expect.stringContaining('ft-1'));
    });
  });

  describe('image uploads', () => {
    it('should upload logo', async () => {
      const { result } = renderHook(() => useSettings());

      const file = new File(['test'], 'logo.png', { type: 'image/png' });

      await act(async () => {
        await result.current.uploadLogo(file);
      });

      expect(mockUploadImage).toHaveBeenCalledWith(file);
      expect(mockDeleteImage).toHaveBeenCalledWith('https://example.com/logo.png');
      expect(mockUpdateFoodtruck).toHaveBeenCalledWith({ logo_url: 'https://example.com/new-image.png' });
    });

    it('should remove logo', async () => {
      const { result } = renderHook(() => useSettings());

      await act(async () => {
        await result.current.removeLogo();
      });

      expect(mockDeleteImage).toHaveBeenCalledWith('https://example.com/logo.png');
      expect(mockUpdateFoodtruck).toHaveBeenCalledWith({ logo_url: null });
    });

    it('should upload cover', async () => {
      const { result } = renderHook(() => useSettings());

      const file = new File(['test'], 'cover.png', { type: 'image/png' });

      await act(async () => {
        await result.current.uploadCover(file);
      });

      expect(mockUploadImage).toHaveBeenCalledWith(file);
      expect(mockDeleteImage).toHaveBeenCalledWith('https://example.com/cover.png');
      expect(mockUpdateFoodtruck).toHaveBeenCalledWith({ cover_image_url: 'https://example.com/new-image.png' });
    });

    it('should remove cover', async () => {
      const { result } = renderHook(() => useSettings());

      await act(async () => {
        await result.current.removeCover();
      });

      expect(mockDeleteImage).toHaveBeenCalledWith('https://example.com/cover.png');
      expect(mockUpdateFoodtruck).toHaveBeenCalledWith({ cover_image_url: null });
    });

    it('should not update foodtruck if upload returns null', async () => {
      mockUploadImage.mockResolvedValueOnce(null);

      const { result } = renderHook(() => useSettings());

      const file = new File(['test'], 'logo.png', { type: 'image/png' });

      await act(async () => {
        await result.current.uploadLogo(file);
      });

      expect(mockUpdateFoodtruck).not.toHaveBeenCalled();
    });
  });

  describe('editForm default values', () => {
    it('should have correct default values', () => {
      const { result } = renderHook(() => useSettings());

      expect(result.current.editForm.name).toBe('');
      expect(result.current.editForm.description).toBe('');
      expect(result.current.editForm.cuisine_types).toEqual([]);
      expect(result.current.editForm.show_menu_photos).toBe(true);
      expect(result.current.editForm.auto_accept_orders).toBe(false);
      expect(result.current.editForm.order_slot_interval).toBe(15);
    });
  });
});
