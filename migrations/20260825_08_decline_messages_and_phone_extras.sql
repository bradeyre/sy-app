-- Two changes, both about not asking customers to pretend.
--
-- 1. Per-fault decline messages.
--
-- The shared decline copy read: "Sorry, we're not able to buy back a device
-- in this condition right now. Untick that above to continue with a different
-- fault, or go back and choose a different condition."
--
-- Two things wrong with it. It invited the customer to untick a real fault to
-- get past the gate, which is asking them to hide a problem we would find on
-- arrival anyway. And "right now" implies temporary; a device locked to
-- somebody's Apple Account is not something we can buy later either.
--
-- Each declining fault now carries its own declineMessage, rendered by the
-- calculator in place of the generic line.

update pricing.cockpit_settings
set settings = jsonb_set(
  settings, '{buy_reco,condition_faults}',
  (select jsonb_object_agg(k, (
     select jsonb_agg(
       case
         when f->>'key' = 'activation_lock' then f || jsonb_build_object(
           'declineMessage',
           'A device that is still signed in to an Apple Account cannot be erased, tested or resold by anyone, so we are not able to buy it. This is not something we can price around. Sign out of iCloud and erase the device, then come back and we will price it normally. If the screen is broken, you can do both from iCloud.com on any computer.')
         when f->>'key' = 'cracked_screen' and k = 'Watch' then f || jsonb_build_object(
           'declineMessage',
           'We are not able to buy an Apple Watch with a cracked screen. The repair costs more than the watch is worth to us afterwards, so there is no price we can offer that would be fair to either of us.')
         else f
       end)
     from jsonb_array_elements(v) f))
   from jsonb_each(settings->'buy_reco'->'condition_faults') as t(k, v)))
where id = 1;

-- 2. No extras step for phones.
--
-- Box, charger and cable are already covered by the standard accessory step,
-- so the extras step was adding a click to the highest-volume category for two
-- marginal items.

update pricing.site_catalog
set extra_accessory_options = extra_accessory_options - 'Phone'
where site_key in ('sellyourmac','sellyouriphone');
