import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { Campaign, Location } from '@foodtruck/shared';
import { useCampaigns, SEGMENT_OPTIONS, type CampaignForm, type SegmentType } from './useCampaigns';

// Mock supabase
const mockFrom = vi.fn();
const mockRpc = vi.fn();
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

// Mock FoodtruckContext
const mockFoodtruck = {
  id: 'ft-1',
  name: 'Test Foodtruck',
};

vi.mock('../../contexts/FoodtruckContext', () => ({
  useFoodtruck: () => ({
    foodtruck: mockFoodtruck,
  }),
}));

// Mock confirm
global.confirm = vi.fn(() => true);

// Mock fetch for sendCampaign
global.fetch = vi.fn();

describe('useCampaigns', () => {
  const mockLocations: Location[] = [
    { id: 'loc-1', foodtruck_id: 'ft-1', name: 'Marché Central', address: '1 Place du Marché', latitude: null, longitude: null, created_at: '2024-01-01' },
    { id: 'loc-2', foodtruck_id: 'ft-1', name: 'Place de la Gare', address: '2 Rue de la Gare', latitude: null, longitude: null, created_at: '2024-01-01' },
  ];

  const mockCampaigns: Campaign[] = [
    {
      id: 'camp-1',
      foodtruck_id: 'ft-1',
      name: 'Campagne test',
      type: 'manual',
      trigger_type: 'manual',
      channel: 'email',
      status: 'draft',
      targeting: { segment: 'all' },
      email_subject: 'Sujet test',
      email_body: 'Corps du mail',
      sms_body: null,
      schedule: null,
      recipients_count: 50,
      sent_count: 0,
      delivered_count: 0,
      opened_count: 0,
      clicked_count: 0,
      last_sent_at: null,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    },
    {
      id: 'camp-2',
      foodtruck_id: 'ft-1',
      name: 'Campagne SMS',
      type: 'manual',
      trigger_type: 'manual',
      channel: 'sms',
      status: 'completed',
      targeting: { segment: 'loyal', min_orders: 5 },
      email_subject: null,
      email_body: null,
      sms_body: 'Message SMS',
      schedule: null,
      recipients_count: 25,
      sent_count: 25,
      delivered_count: 25,
      opened_count: 0,
      clicked_count: 0,
      last_sent_at: '2024-01-05T12:00:00Z',
      created_at: '2024-01-05',
      updated_at: '2024-01-05',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    mockFrom.mockImplementation((table: string) => {
      if (table === 'campaigns') {
        return {
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve({ data: mockCampaigns, error: null }),
            }),
          }),
          insert: () => Promise.resolve({ error: null }),
          update: () => ({
            eq: () => Promise.resolve({ error: null }),
          }),
          delete: () => ({
            eq: () => Promise.resolve({ error: null }),
          }),
        };
      }
      if (table === 'locations') {
        return {
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve({ data: mockLocations, error: null }),
            }),
          }),
        };
      }
      return { select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: [], error: null }) }) }) };
    });

    mockRpc.mockResolvedValue({ data: 50, error: null });

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
  });

  describe('initialization', () => {
    it('should initialize with loading state', async () => {
      const { result } = renderHook(() => useCampaigns());

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('should fetch campaigns and locations on mount', async () => {
      const { result } = renderHook(() => useCampaigns());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.campaigns).toHaveLength(2);
      expect(result.current.locations).toHaveLength(2);
    });

    it('should have showModal false initially', async () => {
      const { result } = renderHook(() => useCampaigns());

      expect(result.current.showModal).toBe(false);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('openNewCampaign', () => {
    it('should open modal with empty form', async () => {
      const { result } = renderHook(() => useCampaigns());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.openNewCampaign();
      });

      expect(result.current.showModal).toBe(true);
      expect(result.current.editingCampaign).toBeNull();
      expect(result.current.form.name).toBe('');
      expect(result.current.form.channel).toBe('email');
      expect(result.current.form.segment).toBe('all');
    });

    it('should set default locationId from first location', async () => {
      const { result } = renderHook(() => useCampaigns());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.openNewCampaign();
      });

      expect(result.current.form.locationId).toBe('loc-1');
    });
  });

  describe('openEditCampaign', () => {
    it('should open modal with campaign data', async () => {
      const { result } = renderHook(() => useCampaigns());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.openEditCampaign(mockCampaigns[0]);
      });

      expect(result.current.showModal).toBe(true);
      expect(result.current.editingCampaign).toEqual(mockCampaigns[0]);
      expect(result.current.form.name).toBe('Campagne test');
      expect(result.current.form.channel).toBe('email');
      expect(result.current.form.emailSubject).toBe('Sujet test');
      expect(result.current.form.emailBody).toBe('Corps du mail');
    });

    it('should populate segment from targeting', async () => {
      const { result } = renderHook(() => useCampaigns());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.openEditCampaign(mockCampaigns[1]);
      });

      expect(result.current.form.segment).toBe('loyal');
      expect(result.current.form.smsBody).toBe('Message SMS');
    });
  });

  describe('closeModal', () => {
    it('should close modal and reset form', async () => {
      const { result } = renderHook(() => useCampaigns());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.openNewCampaign();
      });

      expect(result.current.showModal).toBe(true);

      act(() => {
        result.current.closeModal();
      });

      expect(result.current.showModal).toBe(false);
      expect(result.current.editingCampaign).toBeNull();
    });
  });

  describe('form state', () => {
    it('should update form via setForm', async () => {
      const { result } = renderHook(() => useCampaigns());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.openNewCampaign();
      });

      act(() => {
        result.current.setForm((prev: CampaignForm) => ({ ...prev, name: 'New Campaign' }));
      });

      expect(result.current.form.name).toBe('New Campaign');
    });

    it('should update channel', async () => {
      const { result } = renderHook(() => useCampaigns());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.openNewCampaign();
        result.current.setForm((prev: CampaignForm) => ({ ...prev, channel: 'sms' }));
      });

      expect(result.current.form.channel).toBe('sms');
    });
  });

  describe('saveCampaign validation', () => {
    it('should not save if name is empty', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useCampaigns());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.openNewCampaign();
      });

      await act(async () => {
        await result.current.saveCampaign();
      });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('campaign name is required'));

      consoleSpy.mockRestore();
    });

    it('should not save email campaign without subject', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useCampaigns());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.openNewCampaign();
        result.current.setForm((prev: CampaignForm) => ({
          ...prev,
          name: 'Test Campaign',
          channel: 'email',
          emailSubject: '',
        }));
      });

      await act(async () => {
        await result.current.saveCampaign();
      });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('email subject is required'));

      consoleSpy.mockRestore();
    });

    it('should not save sms campaign without body', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useCampaigns());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.openNewCampaign();
        result.current.setForm((prev: CampaignForm) => ({
          ...prev,
          name: 'Test Campaign',
          channel: 'sms',
          smsBody: '',
        }));
      });

      await act(async () => {
        await result.current.saveCampaign();
      });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('SMS body is required'));

      consoleSpy.mockRestore();
    });
  });

  describe('saveCampaign success', () => {
    it('should create new campaign', async () => {
      const { result } = renderHook(() => useCampaigns());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.openNewCampaign();
        result.current.setForm((prev: CampaignForm) => ({
          ...prev,
          name: 'New Email Campaign',
          channel: 'email',
          emailSubject: 'Subject',
          emailBody: 'Body content',
        }));
      });

      await act(async () => {
        await result.current.saveCampaign();
      });

      expect(mockFrom).toHaveBeenCalledWith('campaigns');
      expect(result.current.showModal).toBe(false);
    });

    it('should update existing campaign', async () => {
      const { result } = renderHook(() => useCampaigns());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.openEditCampaign(mockCampaigns[0]);
        result.current.setForm((prev: CampaignForm) => ({
          ...prev,
          name: 'Updated Campaign Name',
        }));
      });

      await act(async () => {
        await result.current.saveCampaign();
      });

      expect(result.current.showModal).toBe(false);
    });
  });

  describe('deleteCampaign', () => {
    it('should delete campaign after confirmation', async () => {
      const { result } = renderHook(() => useCampaigns());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.deleteCampaign('camp-1');
      });

      expect(global.confirm).toHaveBeenCalledWith('Supprimer cette campagne ?');
      expect(mockFrom).toHaveBeenCalledWith('campaigns');
    });

    it('should not delete if user cancels', async () => {
      (global.confirm as ReturnType<typeof vi.fn>).mockReturnValueOnce(false);

      const { result } = renderHook(() => useCampaigns());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const callCountBefore = mockFrom.mock.calls.length;

      await act(async () => {
        await result.current.deleteCampaign('camp-1');
      });

      // Should not have made additional calls after confirm
      expect(mockFrom.mock.calls.length).toBe(callCountBefore);
    });
  });

  describe('sendCampaign', () => {
    it('should send campaign via edge function', async () => {
      const { result } = renderHook(() => useCampaigns());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.sendCampaign(mockCampaigns[0]);
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/functions/v1/send-campaign'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ campaign_id: 'camp-1' }),
        })
      );
    });

    it('should set sending state during send', async () => {
      let resolveResponse: (value: unknown) => void;
      const responsePromise = new Promise((resolve) => {
        resolveResponse = resolve;
      });

      (global.fetch as ReturnType<typeof vi.fn>).mockReturnValueOnce(responsePromise);

      const { result } = renderHook(() => useCampaigns());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.sendCampaign(mockCampaigns[0]);
      });

      expect(result.current.sending).toBe('camp-1');

      await act(async () => {
        resolveResponse!({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });
      });

      await waitFor(() => {
        expect(result.current.sending).toBeNull();
      });
    });

    it('should handle send errors', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Send failed' }),
      });

      const { result } = renderHook(() => useCampaigns());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.sendCampaign(mockCampaigns[0]);
      });

      expect(consoleSpy).toHaveBeenCalled();
      expect(result.current.sending).toBeNull();

      consoleSpy.mockRestore();
    });
  });

  describe('recipientCount', () => {
    it('should fetch recipient count when modal opens', async () => {
      const { result } = renderHook(() => useCampaigns());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.openNewCampaign();
      });

      await waitFor(() => {
        expect(result.current.recipientCount).toBe(50);
      });

      expect(mockRpc).toHaveBeenCalledWith(
        'count_campaign_recipients',
        expect.objectContaining({
          p_foodtruck_id: 'ft-1',
        })
      );
    });
  });

  describe('SEGMENT_OPTIONS', () => {
    it('should have all segment types', () => {
      const keys = SEGMENT_OPTIONS.map(s => s.key);
      expect(keys).toContain('all');
      expect(keys).toContain('location');
      expect(keys).toContain('inactive');
      expect(keys).toContain('loyal');
      expect(keys).toContain('new');
    });

    it('should have French labels', () => {
      const allSegment = SEGMENT_OPTIONS.find(s => s.key === 'all');
      expect(allSegment?.label).toBe('Tous les clients');
    });
  });

  describe('targeting building', () => {
    it('should build location targeting', async () => {
      const { result } = renderHook(() => useCampaigns());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.openNewCampaign();
        result.current.setForm((prev: CampaignForm) => ({
          ...prev,
          segment: 'location' as SegmentType,
          locationId: 'loc-2',
        }));
      });

      // Targeting is built internally, we test by checking rpc calls
      await waitFor(() => {
        expect(mockRpc).toHaveBeenCalledWith(
          'count_campaign_recipients',
          expect.objectContaining({
            p_targeting: expect.objectContaining({
              segment: 'location',
              location_id: 'loc-2',
            }),
          })
        );
      });
    });

    it('should build inactive targeting with days', async () => {
      const { result } = renderHook(() => useCampaigns());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.openNewCampaign();
        result.current.setForm((prev: CampaignForm) => ({
          ...prev,
          segment: 'inactive' as SegmentType,
          inactiveDays: 45,
        }));
      });

      await waitFor(() => {
        expect(mockRpc).toHaveBeenCalledWith(
          'count_campaign_recipients',
          expect.objectContaining({
            p_targeting: expect.objectContaining({
              segment: 'inactive',
              days: 45,
            }),
          })
        );
      });
    });
  });
});
