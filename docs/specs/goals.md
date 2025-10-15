# Savings Goals & Deposits Spec

## Overview
Step 2 evolves the authenticated dashboard into a savings workspace where members can:
- Review a snapshot of their overall progress (total saved, goal count, average completion, next deadline).
- Browse goal cards that visualize progress with emoji/color accents and quick stats.
- Create new goals with emoji, target, color, and optional deadline metadata.
- Record deposits (or withdrawals via negative amounts in the future) with optimistic feedback and notes.

All interactions operate on the Supabase `goals` and `goal_events` tables provisioned by `sql/migrations/002_goals.sql`. Client-side helpers live under `src/features/goals/` and must enforce row ownership by scoping every query to the authenticated `user.id`.

## Dashboard Layout
- **Header:** greets the signed-in user (display name if present, otherwise email prefix) and surfaces a primary "New goal" button.
- **Summary strip:** four panels show total saved (USD, aggregated), active goal count, average completion percentage (saved ÷ target across all goals, capped at 100%), and the soonest deadline (or "None yet").
- **Goal grid:** responsive cards show current goals. If there are no goals, render the empty-state card encouraging users to create one. While fetching, display a muted loading message.
- **Alerts:** action errors or successes render inline above the summary strip, sharing the existing `.alert` styling from Step 1.

## Goal Cards
- Display a conic-gradient progress ring seeded with `goal.color` (default `#7C3AED`) and label the completion percentage inside.
- Show the goal emoji, name, and saved amount (formatted currency) beside the ring.
- Detail the target amount, remaining amount (`max(target - saved, 0)`), and deadline label (`Flexible` when `deadline_date` is null).
- Provide a footer action button "Record deposit" that opens the deposit modal. Disable and show `Saving…` while the optimistic deposit is pending for that goal.

## Modals
### Create Goal Modal
- Form fields: name (text), target amount (number, dollars with two decimals), emoji (text), color picker, optional deadline (date input).
- Validate required fields client-side (non-empty name, target > 0). Show validation errors using `.alert.error`.
- Submit uses `createGoal` helper, closes on success, and emits a success banner (`New goal "<name>" added!`).

### Record Deposit Modal
- Contextual intro summarizing the goal emoji/name and current saved/target amounts.
- Form fields: deposit amount (number) and optional note (text). Validates positive amount and trims the note.
- Calls `recordDeposit` helper with optimistic UI: immediately updates the goal’s saved cents, then reconciles with server response, reverting if Supabase rejects the write.
- Emits a success banner (`Deposited $X toward "<name>".`) or a failure banner + inline error if rejected.

## API Helpers (`src/features/goals/`)
- `fetchGoals(userId)` returns normalized `Goal[]`, converting Supabase numeric strings to numbers, ordered by `created_at ASC`.
- `createGoal({ userId, name, targetCents, emoji, color, deadlineDate })` inserts a new row and returns the normalized goal.
- `recordDeposit({ userId, goal, amountCents, note })` inserts into `goal_events`, updates the goal’s `saved_cents`, and returns the updated row. Caller must provide the optimistic experience.

## Edge Cases & UX Notes
- Handle Supabase errors gracefully: show user-friendly messages and allow retry without losing form input.
- Format currency with the current locale via `Intl.NumberFormat`, defaulting to USD.
- Percentages cap at 100 even if saved exceeds target.
- When a user has no goals, skip summary math (defaults to `0` saved, `0` target, `0%` completion, `None yet`).
- Color/emoji inputs accept user customization but fall back to defaults when blank.
