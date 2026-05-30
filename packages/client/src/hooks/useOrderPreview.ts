import { useState, useEffect, useRef, useMemo } from 'react';
import type { CartItem, OrderCalculation } from '@foodtruck/shared';
import type { PreviewOrderPayload } from '@foodtruck/shared';
import { api } from '../lib/api';

interface UseOrderPreviewInput {
  foodtruckId: string | undefined;
  items: CartItem[];
  customer?: { email?: string; phone?: string };
  promoCode?: string;
  useLoyaltyReward?: boolean;
  loyaltyRewardCount?: number;
  enabled?: boolean;
}

interface UseOrderPreviewResult {
  data: OrderCalculation | null;
  isLoading: boolean;
  error: Error | null;
  warnings: string[];
}

const DEBOUNCE_MS = 400;

/** Convert CartItem[] to the simplified preview payload items. */
function buildPayloadItems(items: CartItem[]): PreviewOrderPayload['items'] {
  const result: PreviewOrderPayload['items'] = [];
  for (const item of items) {
    if (item.bundleInfo) {
      for (const sel of item.bundleInfo.selections) {
        result.push({
          menu_item_id: sel.menuItem.id,
          quantity: item.quantity,
          selected_option_ids: sel.selectedOptions?.map((o) => o.optionId) ?? [],
          bundle_id: item.bundleInfo!.bundleId,
        });
      }
    } else {
      result.push({
        menu_item_id: item.menuItem.id,
        quantity: item.quantity,
        selected_option_ids: item.selectedOptions?.map((o) => o.optionId) ?? [],
        notes: item.notes,
      });
    }
  }
  return result;
}

/** Stable JSON key for payload to detect changes. */
function payloadKey(payload: PreviewOrderPayload): string {
  return JSON.stringify(payload);
}

export function useOrderPreview({
  foodtruckId,
  items,
  customer,
  promoCode,
  useLoyaltyReward,
  loyaltyRewardCount,
  enabled = true,
}: UseOrderPreviewInput): UseOrderPreviewResult {
  const [data, setData] = useState<OrderCalculation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const lastKeyRef = useRef<string>('');
  const abortRef = useRef<AbortController | null>(null);

  // Build the payload, memoized to avoid unnecessary recalculations
  const payload = useMemo((): PreviewOrderPayload | null => {
    if (!foodtruckId || items.length === 0 || !enabled) return null;

    return {
      foodtruck_id: foodtruckId,
      items: buildPayloadItems(items),
      customer: customer?.email ? { email: customer.email, phone: customer.phone } : undefined,
      promo_code: promoCode || undefined,
      use_loyalty_reward: useLoyaltyReward,
      loyalty_reward_count: loyaltyRewardCount,
    };
  }, [
    foodtruckId,
    items,
    customer?.email,
    customer?.phone,
    promoCode,
    useLoyaltyReward,
    loyaltyRewardCount,
    enabled,
  ]);

  useEffect(() => {
    // Skip if no payload
    if (!payload) {
      setData(null);
      setIsLoading(false);
      setError(null);
      setWarnings([]);
      lastKeyRef.current = '';
      return;
    }

    // Skip if payload unchanged
    const key = payloadKey(payload);
    if (key === lastKeyRef.current) return;

    // Cancel previous in-flight request
    abortRef.current?.abort();

    setIsLoading(true);

    const timer = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const result = await api.orders.previewOrder(payload);

        if (controller.signal.aborted) return;

        lastKeyRef.current = key;
        setData(result);
        setWarnings(result.warnings ?? []);
        setError(null);
      } catch (err) {
        if (controller.signal.aborted) return;

        lastKeyRef.current = '';
        setError(err instanceof Error ? err : new Error('Preview failed'));
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [payload]);

  return { data, isLoading, error, warnings };
}
