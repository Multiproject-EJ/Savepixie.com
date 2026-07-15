# SavePixie Visual Reference Set

This directory is the design source of truth for the SavePixie recovery build.

## Structure

- `drafts/` — generated explorations and rejected variants.
- `final/` — approved reference images used during implementation.
- `prompts/` — the exact generation prompts for reproducibility.

## Rules

1. Approve the mascot anchor before generating final screens.
2. Reuse the approved mascot image as a reference for every subsequent screen.
3. Keep sample user data consistent with `../PRODUCT_VISION.md`.
4. Generate each screen separately; do not crop individual screens from a contact sheet for final use.
5. Preserve one device size, bottom navigation, palette, type hierarchy, icon system, card radius, and spacing rhythm.
6. Treat generated UI text as visual guidance. The implementation brief remains the authority for exact copy and accessibility.
7. A final mockup is accepted only after checking hierarchy, usability, mascot consistency, legibility, and cross-screen component consistency.

## Planned files

- `00-brand-mascot-board.png`
- `01-onboarding-goal.png`
- `02-today.png`
- `03-goals.png`
- `04-goal-detail.png`
- `05-plan.png`
- `06-journey.png`
- `07-quest-session.png`
- `08-celebration.png`
