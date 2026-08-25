-- Work the price back from new:
--
--     payout = new_price x retention(class) x 0.50
--
-- market_lookups was being consumed as a used price. It is a new-retail
-- source (serper), and pricing.market_sell is just that same figure x 0.8867,
-- so both were feeding new prices into a used-price slot and overpaying.
-- Exposed here under a name that says what it is.

create or replace view calc.new_prices as
  select lower(model) as model,
         capacity,
         market_price as new_price,
         low_price, high_price,
         (low_price = high_price) as single_datapoint,
         source, fetched_at
    from pricing.market_lookups
   where market_price > 0;

grant select on calc.new_prices to calc_app_role;

-- What a thing fetches second-hand as a fraction of new, by durability class.
-- Four numbers, not a per-product table.
--
-- The lower two are anchored on real pairs: an Apple Pencil 2 is R2,999 new
-- and R999 pre-owned at the same retailer (0.33), and a Magic Keyboard is
-- R1,969 new against R950 used (0.48). The upper two are estimates and live
-- here rather than in code so they can be corrected against real sales
-- without a deploy.
update pricing.cockpit_settings
set settings = jsonb_set(settings, '{buy_reco,retention_by_class}', '{
  "personal_accessory": 0.35,
  "peripheral":         0.50,
  "durable":            0.60,
  "premium_durable":    0.75
}'::jsonb, true)
where id = 1;

-- Expose it on the settings view the app already reads. The app role has no
-- privileges on the pricing schema; everything goes through calc views.
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
           as accessory_new_to_used_pct,
         coalesce((settings -> 'buy_reco') -> 'retention_by_class', '{}'::jsonb)
           as retention_by_class
    from pricing.cockpit_settings
   where id = 1;

grant select on calc.public_settings to calc_app_role;
