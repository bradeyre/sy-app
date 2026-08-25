-- 20260825_06_extras_quote_ref.sql   (applied 2026-08-25 as add_quote_ref_to_ai_extra_estimates)
--
-- Extras (extra controller, Apple Pencil, dock, bands) are priced at request
-- time by /api/extra-price via Claude and logged to calc.ai_extra_estimates.
-- Like AI fault proposals they need to be attributable to the quoting session
-- that produced them, so a lead's extras can be checked against what was
-- actually offered to THAT customer rather than to anyone selling the same
-- model.
alter table calc.ai_extra_estimates add column if not exists quote_ref text;

create index if not exists ai_extra_estimates_quote_ref_idx
  on calc.ai_extra_estimates (quote_ref) where quote_ref is not null;

-- ROLLBACK
-- drop index if exists calc.ai_extra_estimates_quote_ref_idx;
-- alter table calc.ai_extra_estimates drop column if exists quote_ref;
