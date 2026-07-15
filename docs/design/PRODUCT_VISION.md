# SavePixie Product Vision

Status: design-first working brief, before implementation  
Updated: 2026-07-15

## Product in one sentence

SavePixie turns one tiny money action each day into visible progress toward something the user genuinely wants.

## Product promise

Saving and simple budgeting should feel light, visual, achievable, and rewarding. SavePixie is not accounting software and does not attempt to replace a bank. It is a playful financial-habit coach that helps users:

1. choose a real savings goal;
2. understand a simple weekly spending plan;
3. complete one short lesson or money action;
4. see that action move both their real goal and their in-app journey forward.

## Platform strategy

SavePixie is first and foremost a portrait phone app.

- **Primary release:** an installable, mobile-first PWA designed around one-handed portrait use.
- **Companion experience:** the same PWA adapts into a deliberate landscape/desktop workspace for reviewing goals, adjusting the weekly plan, and managing account content. It must not look like a stretched phone screen.
- **Native packaging:** Capacitor iOS packaging begins only after the PWA is stable, polished, responsive, and reliable offline.
- **One product:** phone and desktop share one account, data model, mascot, design system, feature set, and URL structure. They are two adaptive shells, not separate applications.

## Audience

### Launch audience

Young adults, students, first-job earners, and playful adults who find traditional budgeting apps intimidating or joyless.

### Later audience

Parent-led child profiles may be explored only after the adult product works and privacy, consent, age-appropriate design, and monetisation safeguards have been designed properly.

## The core loop

The entire first version should reinforce this loop:

1. **See today's tiny quest.** A lesson, reflection, saving action, or simple budget check-in that takes about one minute.
2. **Do something real.** Save an amount, avoid a purchase, update a plan, or complete a money lesson.
3. **Receive immediate feedback.** The Pixie reacts, the interface animates, XP or Stardust moves, and the streak advances.
4. **Advance a meaningful goal.** The user's real savings goal visibly fills.
5. **Return tomorrow.** The next quest is clear, small, and never guilt-driven.

The product must reward useful financial behaviour rather than time spent in the app.

## Information architecture

The launch product has four persistent bottom-navigation tabs.

### 1. Today

Purpose: answer “What is the one useful thing I should do now?”

Required content:

- greeting and current streak;
- expressive Pixie state;
- one dominant Daily Quest card;
- primary action button;
- primary savings-goal progress;
- small “quick actions” for Save money and Log spending;
- one compact weekly-plan signal, never a dashboard grid.

The screen must be understandable within three seconds.

### 2. Goals

Purpose: make desired outcomes emotionally tangible.

Required content:

- one featured goal with large visual progress;
- saved, target, and next milestone;
- recent contributions;
- secondary goals shown quietly below;
- add-goal action;
- a goal-detail state with deposit, milestone timeline, and encouraging Pixie feedback.

The goal visual should feel alive when progress is recorded.

### 3. Plan

Purpose: provide a simple, non-accounting weekly spending plan.

Required content:

- money available this week;
- committed amount, flexible amount, and goal amount;
- four to six friendly categories at most;
- quick spending log;
- a clear “safe to spend” number;
- gentle adjustment suggestions.

The first version uses manual entry. Bank connections and transaction importing are deferred.

### 4. Journey

Purpose: show learning, consistency, and long-term progress without becoming a cluttered rewards centre.

Required content:

- current level and XP/Stardust progress;
- streak calendar;
- a path of completed and upcoming milestones;
- earned badges as supporting evidence, not the main product;
- lesson history and next recommended topic.

Leaderboards and social competition are not part of the launch navigation.

### Global Quick Save action

Quick Save is available from every primary tab as a prominent action, but it is not a fifth tab. It opens a short amount-and-goal flow, confirms the real saving action, updates the selected goal, and triggers proportionate Pixie feedback.

### Account and settings

Profile, account, accessibility, notifications, data export, and settings are reached through the avatar. They do not occupy persistent bottom navigation.

## Adaptive navigation and layout

### Portrait phone shell

- four labelled bottom tabs: Today, Goals, Plan, Journey;
- one globally available Quick Save action;
- one dominant vertical flow per screen;
- controls sized for one-handed use and device safe areas;
- no horizontal dashboard grids or desktop-style sidebars.

### Landscape and desktop shell

- the same four destinations appear in a compact left rail;
- Today may expand into a calm two-column layout without adding new priorities;
- Goals and Plan may use master-detail layouts for faster editing;
- Journey may expand its path and history horizontally;
- Quick Save remains globally available;
- account and settings remain secondary utilities;
- phone and desktop use the same terminology, state, and actions so moving between them feels continuous.

## Supporting screens and states

### Onboarding

Three short decisions only:

1. What are you saving for?
2. How much would you like to reach?
3. What amount feels comfortable to work with each week?

Account creation should occur only when needed to preserve progress.

### Quest session

One question or action per screen. Large readable text, clear progress, expressive Pixie reactions, and no dense article pages. A quest should usually take 30–90 seconds.

### Celebration

Used for real milestones: first goal, first saved amount, a completed weekly plan, a meaningful streak, or a goal milestone. Celebration must be short, skippable, and proportional.

### Empty, loading, offline, and error states

Every core screen needs a designed state. The Pixie may explain what happened, but it must never blame the user.

## SavePixie mascot

### Role

The Pixie is the emotional interface: coach, guide, witness, and celebrator. It is never a banker, authority figure, or salesperson.

### Character direction

- original, gender-neutral, youthful but not babyish;
- compact silhouette that reads at app-icon and sticker size;
- luminous star- or leaf-like wings;
- small cross-body pouch or glowing “goal seed” as a saving symbol;
- expressive eyes and brows, with restrained facial complexity;
- modern stylised 3D or polished 2.5D finish;
- no direct resemblance to existing entertainment mascots.

### Required mascot states

- calm idle;
- curious prompt;
- focused coaching;
- small success;
- major celebration;
- gentle recovery after a missed day;
- offline or “something went wrong.”

The same character design must be preserved across every state and screen.

## Visual identity

### Personality

Magical, modern, optimistic, precise, and calm. Playful without becoming childish; premium without becoming financial-corporate.

### Palette direction

- deep plum or midnight-indigo foundation;
- electric violet as the main brand colour;
- fresh mint or aqua for positive progress;
- warm gold for meaningful milestones;
- soft lavender-white surfaces and text;
- coral used sparingly for attention, never punishment.

### Interface style

- mobile-first, full-height app canvas;
- generous whitespace and strong hierarchy;
- rounded cards with crisp edges and subtle depth;
- restrained translucent surfaces, not excessive glassmorphism;
- large progress visuals and tactile primary controls;
- one dominant action per screen;
- readable rounded grotesk typography;
- dark and light themes may exist later, but the first reference set uses one coherent theme.

### Motion system

- 120–180 ms response motion for taps and state changes;
- spring-like but controlled card and progress movement;
- goal progress visibly flows into the selected goal;
- Pixie reacts immediately to a completed action;
- particles and confetti reserved for real milestones;
- reduced-motion mode must preserve clarity without animation.

Avoid slot-machine motion, random rewards, fake scarcity, guilt, shaming, or manipulative streak recovery.

## What stays hidden in the core release

- leaderboards;
- public social profiles;
- separate challenge marketplace;
- separate badge gallery as a primary tab;
- complex monthly accounting;
- bank connections and imported transactions;
- investment or personalised financial advice;
- child accounts;
- notification systems before retention value is proven;
- theme stores and cosmetic purchases.

The data model may preserve room for future features, but unfinished features should not appear in navigation.

## Visual mockup set

Final selected images will be stored under `docs/design/mockups/final/`.

1. `00-brand-mascot-board.png` — mascot anchor, palette, typography mood, components.
2. `01-onboarding-goal.png` — choose the first real savings goal.
3. `02-today.png` — Daily Quest, Pixie, streak, primary goal, quick actions.
4. `03-goals.png` — featured goal and supporting goals.
5. `04-goal-detail.png` — living progress visual, milestone and save-money action.
6. `05-plan.png` — simple weekly plan and safe-to-spend number.
7. `06-journey.png` — XP/Stardust, streak and milestone path.
8. `07-quest-session.png` — one-step lesson or money action.
9. `08-celebration.png` — milestone feedback state.
10. `09-desktop-today.png` — landscape companion layout for Today.
11. `10-desktop-plan.png` — landscape planning and content-management workspace.

Every phone mockup must use the same portrait device framing, mascot identity, component system, colour palette, typography, bottom navigation, icon style, spacing rhythm, and sample user data. Desktop mockups must preserve the same system while demonstrating intentional responsive re-composition.

## Reference sample data

- User: Maya
- Primary goal: Japan trip
- Target: £1,200
- Saved: £420
- Weekly plan: £180
- Safe to spend: £62
- Streak: 6 days
- Level: 4
- Today's quest: Find £5 to move toward Japan

Using one dataset makes cross-screen inconsistencies easier to spot.

## Current repository state

### What exists

- Vite, React, and TypeScript PWA shell;
- GitHub Pages deployment configuration;
- Supabase client and email/password authentication;
- profile schema and API helpers;
- goals and goal-event migrations;
- goal creation and deposit UI concepts;
- extensive future roadmap for streaks, points, challenges, budgets, lessons, settings, and polish;
- generic dark gradient styling and a dismissible under-construction gate.

### What is not yet implemented

- the daily loop;
- mascot and identity system;
- streak engine, XP, badges, challenges, budgets, lessons, and Journey UI;
- cohesive mobile bottom navigation;
- production onboarding;
- child or family mode;
- design-state coverage and polished motion.

### Current blocker

The repository does not currently type-check or build. `src/pages/DashboardPage.tsx` contains malformed merged code in `handleCreateGoal`, an `await` inside the wrong callback, and a duplicated `recordDeposit` declaration. This should be repaired only after the target screen architecture is approved, so the recovery work is not immediately discarded.

## Design-first delivery sequence

1. Approve the product loop and four-tab architecture.
2. Generate and select the mascot/brand anchor.
3. Generate screen mockups in dependency order: Today, Goals, Plan, Journey, then supporting states.
4. Review the mockups as one system and correct inconsistencies.
5. Freeze the final reference set in `docs/design/mockups/final/`.
6. Repair the repository build without redesigning features.
7. Restructure navigation and implement shared design tokens/components.
8. Implement one vertical slice: onboarding → Today quest → save action → goal progress → celebration.
9. Test the core loop before exposing additional tabs or legacy-roadmap features.

## First product success criteria

- a new user reaches a meaningful first action without instruction;
- the user understands today’s task within three seconds;
- recording a saving action feels immediate and satisfying;
- real goal progress is more prominent than points or badges;
- the core loop works on a small phone and remains usable with reduced motion;
- visual design is consistent with the approved mockups;
- no unfinished feature is visible in navigation.
