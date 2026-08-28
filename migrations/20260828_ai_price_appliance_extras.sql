-- Appliance extras go to the AI estimator instead of carrying invented values.
--
-- The eight appliance categories added for Epic Deals shipped with a `value`
-- on every extra (spare vacuum battery R600, Airwrap barrels R250, VR elite
-- strap R400). Those numbers were placeholders in the right ballpark and
-- nothing more -- unlike the Apple and console values beside them, which are
-- real Epic Deals payouts checked against pre-owned iStore pricing.
--
-- A `value` on an option is a deliberate bypass: /api/extra-price returns it
-- without asking the model. That is correct when the number is ground truth
-- and wrong when it is a guess, because a guess then becomes unchallengeable
-- and, worse, is fed to the model as a REFERENCE PRICE for everything else in
-- the category. One invented number would have anchored the rest.
--
-- Dropping `value` puts these through the resolution cascade instead:
-- catalogue new price if we have one, else the model's new price, then
-- new x retention(class) x 0.50 in code. The model never states a payout.
--
-- The Apple, console, laptop and desktop values are deliberately NOT touched.
-- They were set on 2026-08-25 after the model priced a Magic Keyboard at
-- R3,850 against a real R2,500, and they now serve as the reference rows that
-- keep the model honest.
update pricing.site_catalog sc
set extra_accessory_options = (
  select jsonb_object_agg(
           cat,
           case when cat in ('Vacuum','Coffee Machine','Hair Care','Air Purifier',
                             'Action Camera','Headphones','Speaker','VR Headset')
                then val || jsonb_build_object(
                       'options',
                       (select jsonb_agg(opt - 'value' order by ord)
                          from jsonb_array_elements(val->'options')
                               with ordinality as t(opt, ord)))
                else val
           end)
    from jsonb_each(sc.extra_accessory_options) as g(cat, val))
where sc.extra_accessory_options is not null
  and sc.extra_accessory_options ?| array['Vacuum','Coffee Machine','Hair Care',
        'Air Purifier','Action Camera','Headphones','Speaker','VR Headset'];

-- The same filter was offered twice, in two steps, at two prices.
--
-- Air Purifier listed `spare_filter` as an accessory (flat R100) and
-- `extra_filter` as an extra (R250). They are the same object. A seller who
-- ticked both was paid for one filter twice, and neither figure was right for
-- a Dyson HEPA+carbon unit anyway.
--
-- The accessory step is a completeness checklist -- did the thing that ships
-- in the box come with it -- so a spare does not belong there at all. Removed
-- from accessories; the AI-priced extra is the one that survives.
update pricing.site_catalog
set accessory_options = jsonb_set(
      accessory_options,
      '{Air Purifier,options}',
      (select jsonb_agg(opt order by ord)
         from jsonb_array_elements(accessory_options->'Air Purifier'->'options')
              with ordinality as t(opt, ord)
        where opt->>'key' <> 'spare_filter'))
where accessory_options ? 'Air Purifier';

update pricing.cockpit_settings
set settings = settings #- '{accessory_bonus,airpurifier,spare_filter}';
