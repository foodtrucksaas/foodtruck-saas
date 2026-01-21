-- ============================================
-- Deprecate legacy deals and promo_codes tables
-- All functionality has been migrated to the unified 'offers' system
-- These tables are kept for data migration purposes only
-- ============================================

-- Add deprecation comments to legacy tables
COMMENT ON TABLE deals IS 'DEPRECATED: Use offers table with offer_type = buy_x_get_y instead. This table will be removed in a future version.';
COMMENT ON TABLE deal_uses IS 'DEPRECATED: Use offer_uses table instead. This table will be removed in a future version.';
COMMENT ON TABLE promo_codes IS 'DEPRECATED: Use offers table with offer_type = promo_code instead. This table will be removed in a future version.';
COMMENT ON TABLE promo_code_uses IS 'DEPRECATED: Use offer_uses table instead. This table will be removed in a future version.';
