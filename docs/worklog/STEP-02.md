# STEP 02: Savings Goals + Deposits
## Goal
Let authenticated savers manage Supabase-backed goals, record deposits, and visualize their progress on the dashboard.

## Changes
- Replaced the placeholder dashboard with a goals workspace featuring progress rings, totals, and empty state guidance.
- Added goal creation and deposit modals with optimistic updates powered by new Supabase helpers in `src/features/goals/`.
- Expanded global styling to support the dashboard UI and modal system for managing goals and deposits.

## SQL
- `sql/migrations/002_goals.sql`

## Testing
- `npm run build`

## Screens
- _Screenshot pending._

## NEXT
- Step 3 – Streak Engine.
