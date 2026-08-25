-- The assumed second-hand price of an accessory, as a fraction of its new
-- price, used only when nothing better is available.
--
-- The resolution cascade in /api/extra-price is, best evidence first:
--   1. stored catalogue price on the option in pricing.site_catalog
--   2. scraped used price from pricing.market_sell (trigram match)
--   3. the model's own second-hand estimate, at high confidence only
--   4. the model's new-retail figure, converted with THIS ratio
--   5. no number; flagged for a human
--
-- Brad proposed 0.70. The evidence does not support that for accessories:
--
--   Apple Pencil 2   R2999 new (iStore)  vs R999 pre-owned (iStore)  = 0.33
--   Magic Keyboard   R1969 new (Amazon)  vs R950 used (Bob Shop)     = 0.48
--
-- At 0.70 a Pencil would pay R1050 against a correct figure near R500, which
-- is the overpayment that was just removed. At 0.50 the Magic Keyboard lands
-- almost exactly right and the Pencil stays conservative. Since this is the
-- last tier before human review, erring low is the right direction.
--
-- Kept as a setting rather than a constant so it can be tuned against real
-- outcomes without a deploy. Raise it if review consistently finds we are
-- underpaying on this tier.

update pricing.cockpit_settings
set settings = jsonb_set(
  settings, '{buy_reco,accessory_new_to_used_pct}', '0.50'::jsonb, true)
where id = 1;
