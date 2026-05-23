-- Drop legacy Stripe Connect columns from foodtrucks table.
-- These columns are no longer used: OnMange.app does not process client payments.
-- See CLAUDE.md §1 and BACKLOG.md for context.

ALTER TABLE foodtrucks DROP COLUMN IF EXISTS stripe_account_id;
ALTER TABLE foodtrucks DROP COLUMN IF EXISTS stripe_onboarding_complete;
