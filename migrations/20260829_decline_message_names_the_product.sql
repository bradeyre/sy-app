-- Say what we cannot buy, in the words the storefront already uses.
--
-- "We are not able to buy a device that has had liquid damage" is vague at
-- the exact moment a seller needs it to be concrete, and it does not scale:
-- "device" is a poor fit for a coffee machine and no fit at all for a
-- category we have not added yet.
--
-- The messages now carry an {item} placeholder that app/page.js fills from
-- the SITE's own category label, pluralised. That makes the same row read
-- "water damaged iPads" on sellyouriphone and "water damaged Galaxy Tabs" on
-- sellyourgalaxy, off one string, and a new category is worded correctly the
-- day it is switched on.
--
-- Plural is deliberate: it is the only form that avoids the article, since
-- "an iPhone" and "a MacBook" differ and "a AirPods" has no correct singular.
-- The rest of the sentence agrees with it -- "they dry out", not "it dries".
with msg(m) as (values (
  'Sorry, we are not able to buy water damaged {item}. Even after they dry '
  'out and seem fine, corrosion keeps spreading inside and they usually fail '
  'weeks or months later, so we cannot resell them or stand behind them. '
  'If you ticked this by mistake, please untick it to carry on.'
)),
watchmsg(m) as (values (
  'We are not able to buy {item} with a cracked screen. The repair costs more '
  'than they are worth to us afterwards, so there is no price we can offer '
  'that would be fair to either of us.'
))
update pricing.cockpit_settings s
set settings = jsonb_set(
  s.settings,
  '{buy_reco,condition_faults}',
  (select jsonb_object_agg(cat, arr2)
     from (
       select t.cat,
              (select coalesce(jsonb_agg(
                        case
                          when e.f->>'key' = 'liquid_damage'
                            then e.f || jsonb_build_object('declineMessage', msg.m)
                                     -- "Hair Care" is the one label the
                                     -- pluraliser cannot inflect: it would
                                     -- produce "Hair Cares". An explicit noun
                                     -- on the fault wins over the rule.
                                     || case when t.cat = 'Hair Care'
                                             then jsonb_build_object('declineNoun','hair styling tools')
                                             else '{}'::jsonb end
                          when t.cat = 'Watch' and e.f->>'key' = 'cracked_screen'
                               and (e.f->>'decline')::boolean
                            then e.f || jsonb_build_object('declineMessage', watchmsg.m)
                          else e.f
                        end
                        order by e.ord), '[]'::jsonb)
                 from jsonb_array_elements(t.arr) with ordinality e(f, ord)) as arr2
         from jsonb_each(s.settings->'buy_reco'->'condition_faults') as t(cat, arr)
         cross join msg cross join watchmsg
     ) x)
)
where s.id = 1;
