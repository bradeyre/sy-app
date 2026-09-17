-- 20260915_lead_airtable_sync_outcome.sql
--
-- Incident EDT-6FED-JGAA (calc.leads id 411): the customer got {ok:true} after
-- the Postgres insert, then syncLeadToAirtable failed inside after() and the
-- only record of it was console.error. Ops had no way to see the miss or
-- replay it.
--
-- These columns are written after the Airtable attempt, never on the customer
-- request path. airtable_record_id is a comma-separated list because a
-- multi-item lead becomes one Airtable row per device.

alter table calc.leads
  add column if not exists airtable_record_id  text,
  add column if not exists airtable_sync_error text,
  add column if not exists airtable_synced_at  timestamptz;

comment on column calc.leads.airtable_record_id is
  'Airtable record id(s) written by syncLeadToAirtable, comma-separated for multi-item leads.';
comment on column calc.leads.airtable_sync_error is
  'Last Airtable sync error (or skip reason). Null once a write has succeeded.';
comment on column calc.leads.airtable_synced_at is
  'When Airtable last accepted this lead. Left untouched on failure so a partial success is not overwritten.';

-- The app role can insert leads but has no table-level UPDATE. Same pattern as
-- calc.coupons.used_count: grant only the columns the sync outcome needs.
grant update (airtable_record_id, airtable_sync_error, airtable_synced_at)
  on calc.leads to calc_app_role;

-- ROLLBACK
-- revoke update (airtable_record_id, airtable_sync_error, airtable_synced_at) on calc.leads from calc_app_role;
-- alter table calc.leads drop column if exists airtable_synced_at;
-- alter table calc.leads drop column if exists airtable_sync_error;
-- alter table calc.leads drop column if exists airtable_record_id;
