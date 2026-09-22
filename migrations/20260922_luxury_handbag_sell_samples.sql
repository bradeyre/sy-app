-- Expose Luxity sell-sample medians for Luxury Handbag estimates to the
-- calculator app. calc_app_role cannot read pricing.*; views in calc run
-- with owner rights (same pattern as calc.market_used_prices).
--
-- Estimate math lives in app code: displayedEstimate = round(median * 0.9).
-- This view only surfaces a median when the candidate sources include Luxity
-- and sample_sell_prices.median is present — never invents a number.
--
-- Applied to techrevival-ops (fsgllgbetkbipzftdhzh) 2026-09-22.

create or replace view calc.luxury_handbag_sell_samples_public as
select
  n.brand,
  n.norm_model as model,
  coalesce(nullif(n.capacity, ''), 'N/A') as capacity,
  case
    when exists (
      select 1
        from unnest(coalesce(n.sources, '{}'::text[])) s
       where lower(s) = 'luxity'
    )
    then nullif(n.sample_sell_prices->>'median', '')::numeric
    else null
  end as luxity_sample_median,
  n.sources,
  n.status
from pricing.new_model_candidates n
where lower(n.category) = 'luxury handbag';

grant select on calc.luxury_handbag_sell_samples_public to calc_app_role;

comment on view calc.luxury_handbag_sell_samples_public is
  'Read path for Luxury Handbag Luxity sell-sample medians. App computes estimate as round(median * 0.9); null median means estimate unavailable.';
