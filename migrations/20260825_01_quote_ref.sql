-- 20260825_01_quote_ref.sql   (applied 2026-08-25 as add_quote_ref_to_leads_and_ai_fault_proposals)
--
-- Binds AI fault proposals to the quoting session that produced them, so a lead
-- can be checked against the proposals actually made to that customer rather
-- than against every proposal for the same device model. Also gives the customer
-- a stable, non-sequential reference to quote back to support.
alter table calc.ai_fault_proposals add column if not exists quote_ref text;
alter table calc.leads             add column if not exists quote_ref text;

create index if not exists ai_fault_proposals_quote_ref_idx
  on calc.ai_fault_proposals (quote_ref) where quote_ref is not null;
create index if not exists leads_quote_ref_idx
  on calc.leads (quote_ref) where quote_ref is not null;

-- ROLLBACK
-- drop index if exists calc.leads_quote_ref_idx;
-- drop index if exists calc.ai_fault_proposals_quote_ref_idx;
-- alter table calc.leads             drop column if exists quote_ref;
-- alter table calc.ai_fault_proposals drop column if exists quote_ref;
