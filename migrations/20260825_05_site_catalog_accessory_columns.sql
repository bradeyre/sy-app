-- Move the last three per-tenant settings out of lib/siteConfig.js and into
-- the row that already describes the tenant.
--
-- Until now, pricing.site_catalog held the brand and category filters while
-- accessoryOptions, extraAccessoryOptions and airtableSource sat in a
-- hardcoded SITES object in lib/siteConfig.js, keyed by site_key.
--
-- That split was not merely untidy. On 2026-08-25 sellyouriphone was
-- activated in the database, correctly served six Apple categories, and
-- silently offered no accessory options on five of them, because half the
-- tenant lived somewhere the database could not see. A seller with a
-- MacBook was quietly offered up to R160 less than the same person on
-- sellyourmac. Nothing errored, so nothing surfaced it.
--
-- Adding a storefront is now a database row and nothing else.

alter table pricing.site_catalog
  add column if not exists accessory_options       jsonb,
  add column if not exists extra_accessory_options jsonb,
  add column if not exists airtable_source         text;

comment on column pricing.site_catalog.accessory_options is
  'Per-category accessory groups, keyed by category type. Each value is {settingsKey, groupLabel, options[{key,label}]}. settingsKey selects the uplift table in calc.public_settings.accessory_bonus.';
comment on column pricing.site_catalog.extra_accessory_options is
  'Per-category optional extras, keyed by category type. Priced at request time by /api/extra-price rather than from a fixed table, so adding an option needs no pricing decision.';
comment on column pricing.site_catalog.airtable_source is
  'Lead source tag written to Airtable, e.g. SYI. Was previously a hardcoded map in lib/siteConfig.js.';

create or replace view calc.site_config as
  select site_key,
         domain,
         display_name,
         brand_filter,
         category_filter,
         category_labels,
         condition_labels,
         poor_pricing_method,
         accessory_options,
         extra_accessory_options,
         airtable_source
    from pricing.site_catalog
   where active = true;

-- ---------------------------------------------------------------------------
-- Backfill, reproducing what lib/siteConfig.js used to hardcode, plus three
-- corrections called out below.
-- ---------------------------------------------------------------------------

with mobile as (
  select '{"settingsKey":"mobile","groupLabel":"Mobile Accessories","options":[
    {"key":"original_box","label":"Original Box"},
    {"key":"original_charger","label":"Original Charger"},
    {"key":"original_cable","label":"Original Cable"}]}'::jsonb as v
), laptop as (
  select '{"settingsKey":"laptop","groupLabel":"MacBook Accessories","options":[
    {"key":"original_box","label":"Original Box"},
    {"key":"original_power_supply","label":"Original Power Supply"}]}'::jsonb as v
), desktop as (
  -- Correction 1: iMac / Mac mini / Mac Studio sellers had no accessory step
  -- on either Apple site. Reuses the laptop uplift table, which is the right
  -- shape for a desktop Mac and needs no settings change.
  select '{"settingsKey":"laptop","groupLabel":"Mac Accessories","options":[
    {"key":"original_box","label":"Original Box"},
    {"key":"original_power_supply","label":"Original Power Cable or Adapter"}]}'::jsonb as v
), consolea as (
  select '{"settingsKey":"console","groupLabel":"Console Accessories","options":[
    {"key":"original_box","label":"Original Box"},
    {"key":"original_controller","label":"Original Controller"},
    {"key":"original_power_cable","label":"Original Power Cable"},
    {"key":"original_hdmi_cable","label":"Original HDMI Cable"}]}'::jsonb as v
)
update pricing.site_catalog t
set accessory_options = case t.site_key
      when 'sellyourconsole' then jsonb_build_object('Console', (select v from consolea))
      when 'sellyourgalaxy' then jsonb_build_object(
        'Phone',(select v from mobile),'Tablet',(select v from mobile),
        'Watch',(select v from mobile),'Earphone',(select v from mobile))
      -- Correction 2: sellyouriphone had only Phone. It now matches
      -- sellyourmac exactly, since both sites buy the full Apple catalogue.
      else jsonb_build_object(
        'Phone',(select v from mobile),'Tablet',(select v from mobile),
        'Watch',(select v from mobile),'Earphone',(select v from mobile),
        'Laptop',(select v from laptop),'Desktop',(select v from desktop))
    end,
    airtable_source = case t.site_key
      when 'sellyourmac' then 'SYM' when 'sellyouriphone' then 'SYI'
      when 'sellyourconsole' then 'SYC' when 'sellyourgalaxy' then 'SYG' end
where t.site_key in ('sellyourmac','sellyouriphone','sellyourconsole','sellyourgalaxy');

update pricing.site_catalog
set extra_accessory_options = '{
  "Console": {"groupLabel":"Extra Accessories","options":[
    {"key":"extra_controller","label":"Extra Controller"},
    {"key":"charging_dock","label":"Charging Dock"},
    {"key":"headset","label":"Gaming Headset"},
    {"key":"carry_case","label":"Carry Case"},
    {"key":"game_discs","label":"Game Discs (bundle)"}]}
}'::jsonb
where site_key = 'sellyourconsole';

-- Correction 3: no Apple category had any extras at all, while console had
-- five. These are priced at request time by /api/extra-price, so adding an
-- option costs nothing and needs no pricing decision. Deliberately limited
-- to items with real standalone resale value; anything unusual is already
-- covered by the free-text extras box.
update pricing.site_catalog
set extra_accessory_options = '{
  "Phone": {"groupLabel":"Anything else in the box?","options":[
    {"key":"magsafe_charger","label":"MagSafe Charger"},
    {"key":"magsafe_battery","label":"MagSafe Battery Pack"}]},
  "Tablet": {"groupLabel":"Anything else in the box?","options":[
    {"key":"apple_pencil","label":"Apple Pencil"},
    {"key":"magic_keyboard","label":"Magic Keyboard or Smart Keyboard"},
    {"key":"folio_case","label":"Smart Folio or Case"}]},
  "Laptop": {"groupLabel":"Anything else in the box?","options":[
    {"key":"spare_power_adapter","label":"Spare Power Adapter"},
    {"key":"usb_c_dock","label":"USB-C Dock or Hub"}]},
  "Desktop": {"groupLabel":"Anything else in the box?","options":[
    {"key":"magic_keyboard","label":"Magic Keyboard"},
    {"key":"magic_mouse","label":"Magic Mouse"},
    {"key":"magic_trackpad","label":"Magic Trackpad"}]},
  "Watch": {"groupLabel":"Anything else in the box?","options":[
    {"key":"extra_band","label":"Extra Band (Milanese, Link or Ultra)"}]}
}'::jsonb
where site_key in ('sellyourmac','sellyouriphone');
