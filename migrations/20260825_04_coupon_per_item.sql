-- 20260825_04_coupon_per_item.sql   (applied 2026-08-25 as add_per_item_to_coupons)
--
-- When true, a fixed-amount coupon pays out once per device in the submission
-- rather than once per submission. Percentage coupons already scale with the
-- basket, so this only affects 'fixed'. max_bonus still caps the result, which
-- gives "R200 a device, up to R1000" for free.
alter table calc.coupons add column if not exists per_item boolean not null default false;

-- ROLLBACK
-- alter table calc.coupons drop column if exists per_item;
