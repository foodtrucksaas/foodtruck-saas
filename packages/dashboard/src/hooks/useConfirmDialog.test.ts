import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useConfirmDialog, type ConfirmOptions } from './useConfirmDialog';

describe('useConfirmDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with isOpen false', () => {
      const { result } = renderHook(() => useConfirmDialog());

      expect(result.current.isOpen).toBe(false);
    });

    it('should initialize with loading false', () => {
      const { result } = renderHook(() => useConfirmDialog());

      expect(result.current.loading).toBe(false);
    });

    it('should initialize with empty options', () => {
      const { result } = renderHook(() => useConfirmDialog());

      expect(result.current.options.title).toBe('');
      expect(result.current.options.message).toBe('');
    });
  });

  describe('confirm', () => {
    it('should open dialog with provided options', async () => {
      const { result } = renderHook(() => useConfirmDialog());

      const options: ConfirmOptions = {
        title: 'Delete Item',
        message: 'Are you sure you want to delete this item?',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        variant: 'danger',
      };

      act(() => {
        result.current.confirm(options);
      });

      expect(result.current.isOpen).toBe(true);
      expect(result.current.options.title).toBe('Delete Item');
      expect(result.current.options.message).toBe('Are you sure you want to delete this item?');
      expect(result.current.options.confirmText).toBe('Delete');
      expect(result.current.options.cancelText).toBe('Cancel');
      expect(result.current.options.variant).toBe('danger');
    });

    it('should return a promise', () => {
      const { result } = renderHook(() => useConfirmDialog());

      let promise: Promise<boolean>;

      act(() => {
        promise = result.current.confirm({
          title: 'Test',
          message: 'Test message',
        });
      });

      expect(promise!).toBeInstanceOf(Promise);
    });

    it('should reset loading when opening dialog', async () => {
      const { result } = renderHook(() => useConfirmDialog());

      // First, simulate a previous confirm that set loading
      act(() => {
        result.current.confirm({
          title: 'First',
          message: 'First message',
        });
      });

      act(() => {
        result.current.handleConfirm();
      });

      expect(result.current.loading).toBe(true);

      // Open a new dialog
      act(() => {
        result.current.confirm({
          title: 'Second',
          message: 'Second message',
        });
      });

      expect(result.current.loading).toBe(false);
    });
  });

  describe('handleConfirm', () => {
    it('should resolve promise with true', async () => {
      const { result } = renderHook(() => useConfirmDialog());

      let resolved = false;
      let resolvedValue: boolean | null = null;

      act(() => {
        result.current.confirm({
          title: 'Test',
          message: 'Test message',
        }).then((value) => {
          resolved = true;
          resolvedValue = value;
        });
      });

      act(() => {
        result.current.handleConfirm();
      });

      // Wait for promise to resolve
      await vi.waitFor(() => {
        expect(resolved).toBe(true);
      });

      expect(resolvedValue).toBe(true);
    });

    it('should set loading to true', () => {
      const { result } = renderHook(() => useConfirmDialog());

      act(() => {
        result.current.confirm({
          title: 'Test',
          message: 'Test message',
        });
      });

      act(() => {
        result.current.handleConfirm();
      });

      expect(result.current.loading).toBe(true);
    });

    it('should not close dialog immediately', () => {
      const { result } = renderHook(() => useConfirmDialog());

      act(() => {
        result.current.confirm({
          title: 'Test',
          message: 'Test message',
        });
      });

      act(() => {
        result.current.handleConfirm();
      });

      // Dialog stays open until caller closes it
      expect(result.current.isOpen).toBe(true);
    });
  });

  describe('handleClose', () => {
    it('should resolve promise with false', async () => {
      const { result } = renderHook(() => useConfirmDialog());

      let resolved = false;
      let resolvedValue: boolean | null = null;

      act(() => {
        result.current.confirm({
          title: 'Test',
          message: 'Test message',
        }).then((value) => {
          resolved = true;
          resolvedValue = value;
        });
      });

      act(() => {
        result.current.handleClose();
      });

      await vi.waitFor(() => {
        expect(resolved).toBe(true);
      });

      expect(resolvedValue).toBe(false);
    });

    it('should close dialog', () => {
      const { result } = renderHook(() => useConfirmDialog());

      act(() => {
        result.current.confirm({
          title: 'Test',
          message: 'Test message',
        });
      });

      expect(result.current.isOpen).toBe(true);

      act(() => {
        result.current.handleClose();
      });

      expect(result.current.isOpen).toBe(false);
    });

    it('should reset loading', () => {
      const { result } = renderHook(() => useConfirmDialog());

      act(() => {
        result.current.confirm({
          title: 'Test',
          message: 'Test message',
        });
      });

      act(() => {
        result.current.handleConfirm();
      });

      expect(result.current.loading).toBe(true);

      act(() => {
        result.current.handleClose();
      });

      expect(result.current.loading).toBe(false);
    });
  });

  describe('closeDialog', () => {
    it('should close dialog without resolving promise', () => {
      const { result } = renderHook(() => useConfirmDialog());

      act(() => {
        result.current.confirm({
          title: 'Test',
          message: 'Test message',
        });
      });

      expect(result.current.isOpen).toBe(true);

      act(() => {
        result.current.closeDialog();
      });

      expect(result.current.isOpen).toBe(false);
    });

    it('should reset loading', () => {
      const { result } = renderHook(() => useConfirmDialog());

      act(() => {
        result.current.confirm({
          title: 'Test',
          message: 'Test message',
        });
      });

      act(() => {
        result.current.handleConfirm();
      });

      expect(result.current.loading).toBe(true);

      act(() => {
        result.current.closeDialog();
      });

      expect(result.current.loading).toBe(false);
    });
  });

  describe('variant options', () => {
    it('should accept danger variant', () => {
      const { result } = renderHook(() => useConfirmDialog());

      act(() => {
        result.current.confirm({
          title: 'Delete',
          message: 'This is dangerous',
          variant: 'danger',
        });
      });

      expect(result.current.options.variant).toBe('danger');
    });

    it('should accept warning variant', () => {
      const { result } = renderHook(() => useConfirmDialog());

      act(() => {
        result.current.confirm({
          title: 'Warning',
          message: 'This is a warning',
          variant: 'warning',
        });
      });

      expect(result.current.options.variant).toBe('warning');
    });

    it('should accept info variant', () => {
      const { result } = renderHook(() => useConfirmDialog());

      act(() => {
        result.current.confirm({
          title: 'Info',
          message: 'This is informational',
          variant: 'info',
        });
      });

      expect(result.current.options.variant).toBe('info');
    });
  });

  describe('multiple confirm calls', () => {
    it('should handle multiple sequential confirm calls', async () => {
      const { result } = renderHook(() => useConfirmDialog());

      // First confirm
      act(() => {
        result.current.confirm({
          title: 'First',
          message: 'First message',
        });
      });

      expect(result.current.options.title).toBe('First');

      // Close first
      act(() => {
        result.current.handleClose();
      });

      // Second confirm
      act(() => {
        result.current.confirm({
          title: 'Second',
          message: 'Second message',
        });
      });

      expect(result.current.options.title).toBe('Second');
      expect(result.current.isOpen).toBe(true);
    });
  });

  describe('usage pattern', () => {
    it('should work with confirm followed by handleConfirm', async () => {
      const { result } = renderHook(() => useConfirmDialog());

      let promiseResolved = false;
      let resolvedValue: boolean | null = null;

      act(() => {
        result.current.confirm({
          title: 'Confirm Action',
          message: 'Do you want to proceed?',
        }).then((value) => {
          promiseResolved = true;
          resolvedValue = value;
        });
      });

      expect(result.current.isOpen).toBe(true);

      act(() => {
        result.current.handleConfirm();
      });

      await vi.waitFor(() => {
        expect(promiseResolved).toBe(true);
      });

      expect(resolvedValue).toBe(true);
    });
  });
});
