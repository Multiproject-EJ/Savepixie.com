# SavePixie Pact — Product and Marketing Direction

## The one-sentence product

**SavePixie turns one meaningful saving goal into a realistic Pact, adjusts the plan when life changes, and lets the right people help—while everyone keeps their money in their own account.**

SavePixie is not a bank, budget, wallet, investment app, or spreadsheet. It is a visual commitment and recovery companion.

## Marketing hierarchy

### Primary promise

**Make a saving promise you can actually keep.**

### Supporting promise

SavePixie finds a comfortable pace, makes progress visible, and helps the user recover instead of abandon the goal.

### Trust line

**No bank connection · No spreadsheet · Money stays in your account**

### Primary action

**Start my first Pact**

### Three product modes

1. **Save by myself**
2. **Save together**
3. **Help someone save**

## Intended audience

- Young adults who want one goal to feel achievable.
- Partners and friends saving separately toward something shared.
- Travel groups that need a visible common promise without pooling money.
- Families using adult-owned profiles, including a parent or relative matching a younger saver.

“Simple enough for a child” is a usability standard. The initial product should not require independent child accounts.

## Product rules

- A manually recorded deposit is always described as user-confirmed, never bank-verified.
- SavePixie never holds, pools, transfers, or promises the safety of money.
- The planning engine explains its assumptions and returns a comfortable range, not false precision.
- Missed progress triggers recovery choices, never shame, punishment, or a broken streak.
- Every important screen has one obvious primary action.
- Advanced settings remain hidden until the user asks for them.
- Shared Pacts expose only information intentionally shared for that Pact.
- A matching contribution is recorded only after the Backer confirms it.

## Proposed app structure

Use three bottom tabs:

1. **Today** — the active Pact, next useful action, and “I saved something”.
2. **Pacts** — active, planned, and completed Pacts.
3. **Together** — shared Pacts, Backers, matches, and invitations. Hide its complexity until the user joins or creates one.

Pixie Reflection, profile, theme, privacy, and subscription controls live behind the profile/Pixie button rather than a fourth permanent tab.

## Core journey

1. Choose something real.
2. Enter the goal amount, current amount, deadline, and a small amount of capacity context.
3. Select a comfortable suggested pace.
4. Choose: just me, save together, or help someone save.
5. Record the first real deposit manually.
6. Watch the Pact’s magical place grow.
7. Rebalance gently when progress changes.
8. Receive a short monthly Pixie Reflection based on Pact history.

## Paid value

### Free

- One active solo Pact.
- Manual deposits.
- Basic comfortable-pace calculation.
- Core Pixie journey and progress visualization.

### Guided plan

- Adaptive replanning and recovery.
- Multiple active Pacts.
- Deeper forecasts and what-if choices.
- Long-term Pixie Reflections and Pact history.
- Additional Pixie personalities and world progression.

### Family or Circle

- Adult-managed family profiles.
- Shared Pacts and separate contribution records.
- Matching rules and confirmation requests.
- Backers, supporters, and simple permissions.
- One organiser pays; invited participants do not each need a subscription.

### Pact Pass experiment

A one-time, non-renewing 90-day Guided Pact for users who dislike subscriptions.

## WalletHabit Suite relationship

SavePixie is the easiest emotional entry point into the WalletHabit Suite:

- **SavePixie answers:** “How do I make this one meaningful thing happen?”
- **WalletHabit answers:** “How do I make my wider money system support the life I want?”

SavePixie must remain useful and complete as a standalone product. WalletHabit is introduced only when the user would benefit from wider context.

### Value WalletHabit can add

- Use the WalletHabit budget to produce a more informed comfortable-saving range.
- Find realistic room for a Pact across income, essentials, spending, and other goals.
- Connect saving progress to behaviour and habit optimisation.
- Run monthly or periodic whole-finance check-ins.
- Explain repeated Pact difficulty in the context of the wider budget.
- Coordinate several goals and competing financial priorities.

### Natural upgrade moments

Offer WalletHabit gently when:

- the user wants to know where additional saving room could come from;
- several Pacts compete for the same capacity;
- recovery is required repeatedly;
- the user asks for spending or budget analysis;
- a Pixie Reflection identifies a useful wider pattern;
- a family wants broader household planning.

Never interrupt a successful simple Pact with a generic suite advertisement.

### Entitlement structure

- **SavePixie Free** — one simple solo Pact.
- **SavePixie Guided** — adaptive planning, recovery, multiple Pacts, and reflections.
- **SavePixie Family or Circle** — shared Pacts, adult-managed profiles, matching, and permissions.
- **WalletHabit Pro** — includes SavePixie Guided and Family features as part of the wider WalletHabit experience.

Market SavePixie access as **included with WalletHabit Pro**, not as a nominal “free” add-on.

The entitlement logic should treat WalletHabit Pro as a superset:

`hasSavePixiePro = savePixieSubscription || walletHabitProSubscription`

### Cross-product experience rules

- Use one account and a shared entitlement system where practical.
- Require explicit consent before WalletHabit information is used inside SavePixie.
- Share only the minimum data needed for the feature being used.
- Keep WalletHabit budget complexity out of the normal SavePixie interface.
- Link to a focused WalletHabit action, then return the user to the Pact.
- Preserve SavePixie’s visual identity and Pixie relationship inside the wider suite.

### Funnel

1. A user discovers SavePixie through a specific dream or shared goal.
2. SavePixie helps create and maintain the first Pact.
3. The user experiences enough progress to trust the method.
4. A real need for broader budget or habit understanding appears.
5. SavePixie offers one relevant WalletHabit capability.
6. WalletHabit Pro unlocks the full financial system and includes SavePixie Pro.

## Explicit non-goals

- No bank synchronisation in the initial product.
- No open banking, custody, pooled wallet, or automatic transfers.
- No full budgeting system or transaction categorisation.
- No independent child authentication initially.
- No public profiles, strangers, leaderboards, or open chat.
- No generic AI financial adviser conversation as the primary interface.

## Screenshot map

- `00-product-direction-board.png` — complete six-screen product language.
- `01-welcome.png` — new category and primary promise.
- `02-comfortable-plan.png` — realistic plan selection.
- `03-active-pact.png` — living Pact and manual deposit action.
- `04-recovery-plan.png` — compassionate adaptive recovery.
- `05-pact-type.png` — solo, together, or Backer entry point.
- `06-matching.png` — simple matching-rule setup.
- `07-pixie-reflection.png` — long-term insights without bank data.
- `08-family-match-dashboard.png` — adult-managed profile and match confirmation.
- `09-marketing-landing-page.png` — future active-product landing page.

## Recommended implementation sequence

1. Reframe the landing page and onboarding around Savings Pacts.
2. Build the comfortable-pace calculator as deterministic product logic.
3. Replace generic goal progress with the living Pact visualization.
4. Add the recovery loop and manual deposit history.
5. Generate Pixie Reflections from the user’s own Pact history.
6. Add adult-to-adult shared Pacts.
7. Add Backers, matching rules, and adult-managed family profiles.
8. Introduce paid Guided and Family plans only after the core return loop is measurable.
