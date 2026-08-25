-- 20260825_03_coupon_grants.sql   (applied 2026-08-25 as grant_coupon_tables_to_calc_app_role)
--
-- The app connects as calc_app_role, which gets nothing on newly created tables
-- by default -- without this the coupon endpoint 500s. The app only ever reads
-- coupon definitions and bumps the use counter, so UPDATE is granted on that one
-- column: it cannot change a coupon's value, validity or active flag even if the
-- app were compromised.
grant select on calc.coupons to calc_app_role;
grant update (used_count) on calc.coupons to calc_app_role;
grant select, insert on calc.coupon_redemptions to calc_app_role;

-- ROLLBACK
-- revoke select, insert on calc.coupon_redemptions from calc_app_role;
-- revoke update (used_count) on calc.coupons from calc_app_role;
-- revoke select on calc.coupons from calc_app_role;
