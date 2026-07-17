# Savings Pacts, Circles, and the Verified Savings Home

Status: product direction approved for staged implementation  
Updated: 2026-07-16

## Product statement

SavePixie turns a vague saving intention into a living agreement that keeps one person or a group on track. A goal can be a solo Pact, a family Pact, or a Circle shared by friends, couples, housemates, or another trusted group.

The user-facing promise is:

> Choose a dream, give the money a real Savings Home, make a Pact, and let SavePixie prove that every confirmed krone exists.

## Entry choice

The first structural onboarding decision is shown as two large, differently coloured tiles:

- **Save solo** — a promise to future you;
- **Save together** — with family, friends, or a Circle.

Joining an existing Circle remains a quieter third action. Solo and Together share the same goal, ledger, commitment, and verification primitives so a solo goal can invite people later.

## Savings Pact

Every Pact records:

- goal and target amount;
- target date;
- owners and participants;
- contribution rule;
- privacy preference;
- linked Savings Home;
- rules for changing or leaving the Pact.

Supported contribution rules should eventually include equal, custom, proportional, sponsored, and matched contributions.

## Savings Home

A Savings Home is the real external account where the money lives. SavePixie does not take custody of customer savings in the initial product.

During onboarding, a member may:

1. link a dedicated savings account they already own;
2. open a suitable new savings account and link it;
3. browse eligible savings accounts through Pixie Account Check.

The goal may be created before linking, but money cannot become **verified** until a compatible external account is connected through an authorised account-information provider.

## Ledger states

SavePixie distinguishes:

- **Commitment** — a future promise that is not part of the balance;
- **Pending** — the member says the money was moved but the transaction is not verified;
- **Confirmed** — a matching transaction exists in the linked Savings Home;
- **Allocated** — confirmed money has been assigned to a goal;
- **Unallocated** — verified money exists but has not been assigned;
- **Withdrawn** — money left the Savings Home and must reduce or rebalance allocations;
- **Reversal** — an immutable correcting entry.

The ledger, not a mutable goal total, is the source of truth.

## 1:1 backing invariant

At all times:

```text
sum(confirmed goal allocations) <= verified linked-account balance
```

The backing percentage is capped at 100%. A disconnected or expired bank consent changes the status to **last verified** and displays the verification time. The app must never imply that stale data is live.

Quick Save becomes a short state machine:

1. choose amount and goal;
2. initiate or confirm the external transfer;
3. record a pending ledger entry;
4. match the bank transaction;
5. mark the deposit confirmed;
6. update the allocation atomically;
7. celebrate verified progress.

## Circle aggregation and privacy

Each member keeps their money in their own Savings Home unless a regulated partner later supplies a true group account.

The Circle total is:

```text
sum(each member's verified allocation to the Circle goal)
```

Privacy modes should include:

- exact contribution visible;
- contribution hidden but on-track status visible;
- contribution visible only to an organiser;
- fully private personal goals outside the Circle.

Group members must never infer a person's full linked-account balance from their Circle contribution.

## Initial dashboards

Each person receives a personal dashboard containing:

- verified Savings Home status;
- featured Pact;
- active solo and shared Pact tiles;
- today's next useful action;
- recent ledger activity.

Each Circle receives a separate dashboard containing:

- shared target and completion forecast;
- total verified allocation;
- member commitment statuses;
- matching promises;
- group milestones and recent activity;
- the smallest action needed to remain on track.

## Delivery stages

1. Provider-independent Pact and immutable ledger schema.
2. Manual commitments with explicit unverified state.
3. Authorised read-only bank verification.
4. Transaction matching and atomic allocation.
5. Circles, privacy controls, and matching promises.
6. Payment initiation or embedded accounts only through a regulated partner.

## Safety boundaries

- Stripe subscription payments are SavePixie revenue, never customer savings.
- SavePixie does not pool or transfer Circle money in the initial product.
- Account credentials never enter SavePixie directly.
- Bank access uses an authorised provider and explicit user consent.
- Exact balances and Circle visibility are minimized by default.
