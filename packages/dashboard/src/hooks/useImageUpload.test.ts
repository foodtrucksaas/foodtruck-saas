import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useImageUpload } from './useImageUpload';

// Mock supabase storage
const mockUpload = vi.fn();
const mockRemove = vi.fn();
const mockGetPublicUrl = vi.fn();

vi.mock('../lib/supabase', () => ({
  supabase: {
    storage: {
      from: () => ({
        upload: mockUpload,
        remove: mockRemove,
        getPublicUrl: mockGetPublicUrl,
      }),
    },
  },
}));

// Mock compressImage
vi.mock('../utils/imageCompression', () => ({
  compressImage: vi.fn((file: File) => Promise.resolve(file)),
}));

describe('useImageUpload', () => {
  const defaultOptions = {
    bucket: 'test-bucket',
    folder: 'test-folder',
  };

  const createMockFile = (name: string, size: number, type: string): File => {
    const blob = new Blob(['x'.repeat(size)], { type });
    return new File([blob], name, { type });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUpload.mockResolvedValue({ error: null });
    mockGetPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://example.com/storage/v1/object/public/test-bucket/test-folder/image.webp' },
    });
    mockRemove.mockResolvedValue({ error: null });
  });

  describe('initialization', () => {
    it('should initialize with uploading false', () => {
      const { result } = renderHook(() => useImageUpload(defaultOptions));

      expect(result.current.uploading).toBe(false);
    });

    it('should expose uploadImage and deleteImage functions', () => {
      const { result } = renderHook(() => useImageUpload(defaultOptions));

      expect(typeof result.current.uploadImage).toBe('function');
      expect(typeof result.current.deleteImage).toBe('function');
    });
  });

  describe('uploadImage', () => {
    it('should upload a valid image successfully', async () => {
      const { result } = renderHook(() => useImageUpload(defaultOptions));
      const file = createMockFile('test.jpg', 1000, 'image/jpeg');

      let url: string | null = null;
      await act(async () => {
        url = await result.current.uploadImage(file);
      });

      expect(url).toBe('https://example.com/storage/v1/object/public/test-bucket/test-folder/image.webp');
      expect(mockUpload).toHaveBeenCalledWith(
        expect.stringMatching(/^test-folder\/\d+-[a-z0-9]+\.jpg$/),
        expect.any(File),
        expect.objectContaining({
          cacheControl: '3600',
          upsert: false,
        })
      );
    });

    it('should set uploading to true during upload', async () => {
      let resolveUpload: () => void;
      const uploadPromise = new Promise<{ error: null }>((resolve) => {
        resolveUpload = () => resolve({ error: null });
      });
      mockUpload.mockReturnValueOnce(uploadPromise);

      const { result } = renderHook(() => useImageUpload(defaultOptions));
      const file = createMockFile('test.jpg', 1000, 'image/jpeg');

      act(() => {
        result.current.uploadImage(file);
      });

      expect(result.current.uploading).toBe(true);

      await act(async () => {
        resolveUpload!();
      });

      await waitFor(() => {
        expect(result.current.uploading).toBe(false);
      });
    });

    it('should reject invalid file types', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useImageUpload(defaultOptions));
      const file = createMockFile('test.pdf', 1000, 'application/pdf');

      let url: string | null = null;
      await act(async () => {
        url = await result.current.uploadImage(file);
      });

      expect(url).toBeNull();
      expect(mockUpload).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Type de fichier non supporté'));

      consoleSpy.mockRestore();
    });

    it('should reject files exceeding max size', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() =>
        useImageUpload({ ...defaultOptions, maxSizeMB: 1 })
      );
      // Create a file larger than 1MB
      const file = createMockFile('test.jpg', 2 * 1024 * 1024, 'image/jpeg');

      let url: string | null = null;
      await act(async () => {
        url = await result.current.uploadImage(file);
      });

      expect(url).toBeNull();
      expect(mockUpload).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('trop volumineux'));

      consoleSpy.mockRestore();
    });

    it('should handle upload errors', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockUpload.mockResolvedValueOnce({ error: new Error('Upload failed') });

      const { result } = renderHook(() => useImageUpload(defaultOptions));
      const file = createMockFile('test.jpg', 1000, 'image/jpeg');

      let url: string | null = null;
      await act(async () => {
        url = await result.current.uploadImage(file);
      });

      expect(url).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should use custom allowed types', async () => {
      const { result } = renderHook(() =>
        useImageUpload({
          ...defaultOptions,
          allowedTypes: ['image/svg+xml'],
        })
      );
      const file = createMockFile('test.svg', 1000, 'image/svg+xml');

      let url: string | null = null;
      await act(async () => {
        url = await result.current.uploadImage(file);
      });

      expect(url).not.toBeNull();
      expect(mockUpload).toHaveBeenCalled();
    });

    it('should use custom compression function', async () => {
      const customCompress = vi.fn((file: File) => Promise.resolve(file));

      const { result } = renderHook(() =>
        useImageUpload({
          ...defaultOptions,
          compress: customCompress,
        })
      );
      const file = createMockFile('test.jpg', 1000, 'image/jpeg');

      await act(async () => {
        await result.current.uploadImage(file);
      });

      expect(customCompress).toHaveBeenCalledWith(file);
    });

    it('should support all default image types', async () => {
      const { result } = renderHook(() => useImageUpload(defaultOptions));

      const types = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

      for (const type of types) {
        const ext = type.split('/')[1];
        const file = createMockFile(`test.${ext}`, 1000, type);

        await act(async () => {
          const url = await result.current.uploadImage(file);
          expect(url).not.toBeNull();
        });
      }
    });
  });

  describe('deleteImage', () => {
    const testUrl = 'https://example.com/storage/v1/object/public/test-bucket/test-folder/image.webp';

    it('should delete an image successfully', async () => {
      const { result } = renderHook(() => useImageUpload(defaultOptions));

      let success: boolean = false;
      await act(async () => {
        success = await result.current.deleteImage(testUrl);
      });

      expect(success).toBe(true);
      expect(mockRemove).toHaveBeenCalledWith(['test-folder/image.webp']);
    });

    it('should return false for invalid URL format', async () => {
      const { result } = renderHook(() => useImageUpload(defaultOptions));

      let success: boolean = true;
      await act(async () => {
        success = await result.current.deleteImage('https://example.com/invalid-path');
      });

      expect(success).toBe(false);
    });

    it('should handle delete errors', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockRemove.mockResolvedValueOnce({ error: new Error('Delete failed') });

      const { result } = renderHook(() => useImageUpload(defaultOptions));

      let success: boolean = true;
      await act(async () => {
        success = await result.current.deleteImage(testUrl);
      });

      expect(success).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle URL-encoded paths', async () => {
      const { result } = renderHook(() => useImageUpload(defaultOptions));
      const encodedUrl = 'https://example.com/storage/v1/object/public/test-bucket/test-folder/image%20with%20spaces.webp';

      await act(async () => {
        await result.current.deleteImage(encodedUrl);
      });

      expect(mockRemove).toHaveBeenCalledWith(['test-folder/image with spaces.webp']);
    });
  });

  describe('options', () => {
    it('should use default maxSizeMB of 5', async () => {
      const { result } = renderHook(() => useImageUpload(defaultOptions));

      // File just under 5MB should be accepted
      const file = createMockFile('test.jpg', 4.9 * 1024 * 1024, 'image/jpeg');

      await act(async () => {
        const url = await result.current.uploadImage(file);
        expect(url).not.toBeNull();
      });
    });

    it('should use custom maxSizeMB', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() =>
        useImageUpload({ ...defaultOptions, maxSizeMB: 0.001 }) // 1KB
      );

      const file = createMockFile('test.jpg', 2000, 'image/jpeg');

      await act(async () => {
        const url = await result.current.uploadImage(file);
        expect(url).toBeNull();
      });

      consoleSpy.mockRestore();
    });
  });
});
