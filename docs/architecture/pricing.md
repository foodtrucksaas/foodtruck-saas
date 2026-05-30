# Pricing Architecture

## Principle: Server-Authoritative Pricing

The pricing engine (`supabase/functions/_shared/pricing-engine/`) is the **single source of truth** for all order totals. The client never sends prices to the server -- it sends only item IDs, quantities, and customer info.

## How it works

```
Client (checkout)          Edge Function (create-order)
  |                              |
  | POST { items: [{             |
  |   menu_item_id, quantity,    |
  |   selected_option_ids }],    |
  |   promo_code, customer... }  |
  |----------------------------->|
  |                              | calculateOrderTotal()
  |                              |   -> resolveLineItems (DB lookup)
  |                              |   -> run discount engines
  |                              |   -> return { subtotal, total,
  |                              |        discounts[], line_items[] }
  |                              |
  |   { order, total, discounts }|
  |<-----------------------------|
```

### Preview vs Submit

- **Preview** (`preview-order`): Same engine, returns calculation without creating an order. Used by `useOrderPreview` hook for real-time total display during checkout.
- **Submit** (`create-order`): Runs the engine, creates the order with the authoritative total.

## Discount Engines

Each discount type has its own engine in `pricing-engine/engines/`:

| Engine                    | Type                 | Description                                       |
| ------------------------- | -------------------- | ------------------------------------------------- |
| `BundleEngine`            | `bundle`             | Fixed-price menus (e.g., pizza + dessert = 16EUR) |
| `BuyXGetYEngine`          | `buy_x_get_y`        | Buy N items, get M free/discounted                |
| `HappyHourEngine`         | `happy_hour`         | Time-based discounts                              |
| `ThresholdDiscountEngine` | `threshold_discount` | Discount above a cart minimum                     |
| `PromoCodeEngine`         | `promo_code`         | Percentage or fixed discount codes                |
| `LoyaltyRewardEngine`     | `loyalty_reward`     | Loyalty points redemption                         |

### Adding a new discount type

1. Create a new engine implementing `DiscountEngine` interface
2. Register it in `calculate-order-total.ts` engine list
3. Add the type to `EngineDiscountType` in `pricing-engine/types.ts`
4. Add corresponding client type in `packages/shared/src/types/pricing.ts`

## Client-Side Pricing (Display Only)

`packages/shared/src/utils/pricing.ts` contains functions (`computeCartItemUnitPrice`, `calculateBundlePrice`) used **only for instant UI feedback** (cart bar, options modal). These are NOT authoritative -- the preview/submit flow always uses the server engine.

The server counterpart is `pricing-engine/resolve-line-items.ts` (`computeUnitPrice`). Both must produce identical results -- validated by `tests/integration/pricing-coherence.test.ts`.

## Historical Context

Before this refactor (Steps A-F, May 2026), the system used client-server price comparison:

- Client computed prices locally and sent them to `create-order`
- Server recomputed and compared, rejecting on mismatch
- Discounts (promo codes, offers, loyalty) were validated separately with divergent logic
- This caused Bugs 1-4 (combo promo+loyalty, bundle pricing edge cases)

The refactor eliminated all client-side price authority, making the server the single source of truth.

## Legacy Compatibility

The dashboard's QuickOrder still sends the legacy payload format (`selected_options` objects instead of `selected_option_ids`). The `isLegacyPayload()` / `toEngineItems()` functions in `create-order/index.ts` handle this conversion. This will be removed once the dashboard is migrated.
