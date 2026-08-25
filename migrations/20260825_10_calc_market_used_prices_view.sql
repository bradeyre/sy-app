-- Expose scraped used prices and the accessory ratio to the app.
--
-- calc_app_role has no privileges on the pricing schema. The app reads
-- everything through views in calc, which run with their owner's rights.
-- Queries written against pricing.* from the app fail silently into whatever
-- catch wraps them, which is how a Studio Display kept coming back unpriced
-- despite a real scraped used price of R24,738 in pricing.market_sell.

create or replace view calc.market_used_prices as
  select model, capacity, med as used_median, lo as used_low, hi as used_high,
         n as observations, source
    from pricing.market_sell
   where med > 0;

grant select on calc.market_used_prices to calc_app_role;

create or replace view calc.public_settings as
  select ((settings -> 'buy_reco') ->> 'consignment_pct')::numeric as consignment_pct,
         ((settings -> 'buy_reco') ->> 'voucher_pct')::numeric as voucher_pct,
         settings -> 'accessory_bonus' as accessory_bonus,
         updated_at,
         (settings -> 'buy_reco') -> 'condition_faults' as condition_faults,
         (settings -> 'buyback_strategy') -> 'poor_model_exclusions' as poor_model_exclusions,
         (settings -> 'buy_reco') -> 'free_text_fault_categories' as free_text_fault_categories,
         (settings -> 'buy_reco') -> 'ai_deduction_categories' as ai_deduction_categories,
         (settings -> 'buy_reco') -> 'max_deduction_pct' as max_deduction_pct,
         coalesce(((settings -> 'buy_reco') ->> 'accessory_new_to_used_pct')::numeric, 0.50)
           as accessory_new_to_used_pct
    from pricing.cockpit_settings
   where id = 1;

grant select on calc.public_settings to calc_app_role;
