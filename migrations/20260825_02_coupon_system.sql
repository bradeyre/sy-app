-- 20260825_02_coupon_system.sql   (applied 2026-08-25 as add_coupon_system)
--
-- Coupon / voucher codes that add money to a customer's buyback offer.
create table if not exists calc.coupons (
  id              bigint generated always as identity primary key,
  code            text        not null unique,
  description     text,
  -- 'fixed'   = value is a rand amount added to the offer
  -- 'percent' = value is a percentage of the item subtotal, capped by max_bonus
  kind            text        not null check (kind in ('fixed','percent')),
  value           numeric     not null check (value > 0),
  max_bonus       numeric,
  min_quote_total numeric     not null default 0,
  sites           text[],           -- null/empty = every site
  max_uses        integer,          -- null = unlimited
  used_count      integer     not null default 0,
  valid_from      timestamptz not null default now(),
  valid_until     timestamptz,
  active          boolean     not null default true,
  created_at      timestamptz not null default now()
);

-- Codes are matched case-insensitively; store and compare upper case.
create unique index if not exists coupons_code_upper_idx on calc.coupons (upper(code));

create table if not exists calc.coupon_redemptions (
  id           bigint generated always as identity primary key,
  coupon_id    bigint      not null references calc.coupons(id),
  lead_id      bigint      references calc.leads(id),
  quote_ref    text,
  code         text        not null,
  bonus_amount numeric     not null,
  created_at   timestamptz not null default now()
);
create index if not exists coupon_redemptions_coupon_idx on calc.coupon_redemptions (coupon_id);
create index if not exists coupon_redemptions_lead_idx   on calc.coupon_redemptions (lead_id);

alter table calc.leads add column if not exists coupon_code  text;
alter table calc.leads add column if not exists coupon_bonus numeric;

-- ROLLBACK
-- alter table calc.leads drop column if exists coupon_bonus;
-- alter table calc.leads drop column if exists coupon_code;
-- drop table if exists calc.coupon_redemptions;
-- drop table if exists calc.coupons;
