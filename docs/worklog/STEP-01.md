# STEP 01: Supabase Auth + Profiles
## Goal
Deliver password-based authentication with Supabase and bootstrap a `profiles` record for each user.

## Changes
- Implemented `AuthProvider` with Supabase session management, password flows, and resilient profile upserts.
- Added protected routing for `/dashboard` plus refreshed navigation that reflects authentication state.
- Built `/auth` with sign-in, sign-up, and password reset tabs alongside polished form styling.
- Created a dashboard profile hub with Supabase-backed editing plus teasers for the upcoming goals release.
- Documented the new flows in the README and created the Step 1 SQL migration for the `profiles` table.

## SQL
- `sql/migrations/001_auth_profiles.sql`

## Testing
- `npm run build`

## Screens
- ![Step 1 Auth flows](./assets/step-01-auth.svg)

## NEXT
- Step 2 – Savings Goals + Deposits.
