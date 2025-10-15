# STEP 02: Savings Goals + Deposits
## Goal
Let authenticated savers manage Supabase-backed goals, record deposits, and visualize their progress on the dashboard.

## Changes
- Turned the dashboard into a Supabase-backed goals workspace with summary stats, progress rings, and empty-state guidance.
- Added goal creation and deposit modals wired to Supabase helpers with optimistic updates and friendly validation.
- Documented the Step 2 product spec detailing dashboard structure, modal flows, and API expectations.

## SQL
- `sql/migrations/002_goals.sql`

## Testing
- `npm run build`

## Screens
- _Screenshot pending (auth-required dashboard cannot be captured in this environment)._ 

## NEXT
- Step 3 – Streak Engine.
