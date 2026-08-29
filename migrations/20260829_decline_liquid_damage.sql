-- Liquid damage is declined, not deducted.
--
-- It was previously an AI-priced fault in six categories (Phone, Tablet,
-- Laptop, Desktop, Earphone, Action Camera) and absent from the other nine.
-- Now it is a hard decline everywhere, on the same mechanism the folding
-- Galaxies use: the seller sees why at the moment they tick it, and the
-- Continue button will not let them past.
--
-- Three things happen here.
--
-- 1. `water_damage` and `liquid_damage` were the same fault under two names,
--    split four categories to two. Standardised on `liquid_damage`. The key
--    only lives inside a quoting session -- leads store labels, and
--    calc.ai_fault_proposals rows are session-scoped -- so nothing historical
--    depends on the old spelling.
--
-- 2. Every existing entry gets decline/blocks/declineMessage. `decline: true`
--    also changes WHERE the question appears: app/page.js shows normal faults
--    on Good and Poor only, but a decline fault on every condition except
--    Sealed. That is deliberate. A phone can look mint and still have been
--    dunked, and the Excellent step already renders decline faults under
--    "Anything that would stop us buying it?".
--
-- 3. The nine categories with no liquid question get one, worded for the
--    thing itself. "Liquid damage" is a strange question to ask about a
--    coffee machine, which is full of water by design; the failure there is
--    water reaching the electrics.
with labels(cat, label) as (values
  ('Vacuum',        'Liquid has been sucked up, or water has got into the motor'),
  ('Coffee Machine','Water has leaked into the electrics'),
  ('Hair Care',     'Has been dropped in water, or water got inside'),
  ('Air Purifier',  'Water or liquid has got inside the unit'),
  -- Was "Water damage, or the seal no longer holds". A perished seal on a
  -- camera that never actually got wet is a casing issue, not a decline.
  ('Action Camera', 'Water has got inside the camera')
),
msg(m) as (values (
  'Sorry, we are not able to buy a device that has had liquid damage. '
  'Even after it dries out and seems fine, corrosion keeps spreading inside '
  'and it usually fails weeks or months later, so we cannot resell it or '
  'stand behind it. If you ticked this by mistake, please untick it to carry on.'
))
update pricing.cockpit_settings s
set settings = jsonb_set(
  s.settings,
  '{buy_reco,condition_faults}',
  (select jsonb_object_agg(cat, kept || added)
     from (
       select t.cat,
              (select coalesce(jsonb_agg(
                        case when e.f->>'key' in ('water_damage','liquid_damage')
                             then e.f || jsonb_build_object(
                                    'key','liquid_damage',
                                    'label', coalesce(l.label,'Water or liquid damage'),
                                    'decline', true,
                                    'blocks', true,
                                    'deduction', null,
                                    'declineMessage', msg.m)
                             else e.f end
                        order by e.ord), '[]'::jsonb)
                 from jsonb_array_elements(t.arr) with ordinality e(f, ord)) as kept,
              case when t.arr @> '[{"key":"liquid_damage"}]'
                     or t.arr @> '[{"key":"water_damage"}]'
                   then '[]'::jsonb
                   else jsonb_build_array(jsonb_build_object(
                          'key','liquid_damage',
                          'type','checkbox',
                          'label', coalesce(l.label,'Water or liquid damage'),
                          'source','manual',
                          'status','pending_review',
                          'decline', true,
                          'blocks', true,
                          'deduction', null,
                          'declineMessage', msg.m))
              end as added
         from jsonb_each(s.settings->'buy_reco'->'condition_faults') as t(cat, arr)
         cross join msg
         left join labels l on l.cat = t.cat
     ) x)
)
where s.id = 1;
