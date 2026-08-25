-- Ten models were listed twice in the buyback catalogue, once with capacity
-- "Standard" and once with "STANDARD":
--
--   GoPro Hero 12, GoPro Hero 13, DJI Osmo Action 5 Pro, Dyson Airwrap,
--   Dyson Supersonic, DeLonghi Magnifica Evo, DeLonghi Magnifica Plus,
--   Jura E6, Sage Barista Express, Siemens EQ500
--
-- All of them are the newly-added non-Apple categories, created by a
-- re-ingest on 2026-08-24. 30 redundant rows out of 2,129.
--
-- pricing.buy_prices already has UNIQUE (model, capacity, condition), which is
-- exactly why only the casing could slip through: the constraint is
-- case-sensitive, so "STANDARD" was a different key rather than a conflict.
-- The twins therefore had to be deleted, not merged.
--
-- All 30 pairs were verified to carry identical prices before deleting, so no
-- price changed. The "Standard" rows were kept: they are the original ingest
-- and also carry the Poor grade the later run missed.
--
-- This was not merely cosmetic. The twins were being sent for market lookup
-- separately, which produced two different reference prices for the same
-- product: GoPro Hero 13 came back at R9,500 under one casing and R7,500
-- under the other, 27% apart, and Dyson Supersonic at R5,500 and R6,500.
--
-- Backup of the deleted rows: pricing._capacity_casing_backup_20260825.

delete from pricing.buy_prices u
where u.capacity = 'STANDARD'
  and exists (
    select 1 from pricing.buy_prices s
     where s.model = u.model
       and s.capacity = 'Standard'
       and s.condition = u.condition
       and s.buy_price = u.buy_price
  );

-- Stop it recurring. buy_prices_canonical de-duplicated on
-- (model, capacity, condition) case-sensitively, so both twins survived it.
-- model is normalised to lowercase upstream; capacity never was.
--
-- The displayed capacity still comes from the winning row rather than being
-- lowercased, because storage values are legitimately uppercase ("128GB",
-- "1TB") and must not become "128gb". The tiebreak prefers the non-shouting
-- form, so "Standard" beats "STANDARD" if an ingest recreates one.

create or replace view pricing.buy_prices_canonical as
  select distinct on (model, lower(capacity), condition)
         id, entry_id, brand, type, model, model_raw, capacity, condition,
         condition_raw, ram, buy_price, scraped_at, entry_updated_at
    from pricing.buy_prices
   where buy_price > 0::numeric
   order by model,
            lower(capacity),
            condition,
            (capacity = upper(capacity)),
            entry_id desc;
