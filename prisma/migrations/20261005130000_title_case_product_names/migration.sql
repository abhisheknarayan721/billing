-- Product names are now saved in Title Case (see toTitleCase in src/lib/text.ts,
-- which follows the same rule as initcap). Brings the existing rows in line.
UPDATE "product" SET "p_name" = initcap("p_name") WHERE "p_name" <> initcap("p_name");
