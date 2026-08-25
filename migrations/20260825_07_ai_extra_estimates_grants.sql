-- Let the app actually write the accessory pricing audit log.
--
-- calc.ai_extra_estimates had no grant to calc_app_role at all, so every
-- insert from /api/extra-price failed on permissions and was swallowed by a
-- .catch(console.error). The table has been empty since it was created.
--
-- That is why the accessory overpricing went unnoticed for as long as it
-- did: the model was quoting new retail as second-hand and halving it, and
-- there was no record anywhere of what it had quoted.
--
-- Correction to the commit message on d4beb5e, which blamed after() not
-- completing in a serverless function. Awaiting the insert instead of
-- deferring it is still the right call for ordering, but it was not the
-- cause. Permissions were. Verified by running the exact insert directly as
-- postgres (it succeeded) and then checking role_table_grants, which showed
-- calc.leads and calc.ai_fault_proposals granted to calc_app_role and this
-- table granted to nobody.

grant insert, select on calc.ai_extra_estimates to calc_app_role;

-- The table uses a bigint identity column, so the role needs the sequence
-- too. Granted across the schema to match how the other calc tables behave
-- and to stop the next table added here hitting the same wall.
grant usage, select on all sequences in schema calc to calc_app_role;
