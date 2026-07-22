# SavePixie first-use, mobile and goal-art direction

Updated: 2026-07-22

## The first useful minute

The onboarding should feel like a short conversation, not a financial questionnaire. It has one
welcome moment, three decision screens and one celebration:

1. **Choose the dream and saving mode.** Pick a visual starter or name something personal; choose
   solo or shared. This is emotional before it is numerical.
2. **Make it fit real life.** Choose the savings currency, target, dream date and the amount that can
   comfortably go toward this goal each month. SavePixie shows the required monthly pace. A plan over
   the stated boundary cannot continue until the saver gives it more time or lowers the first target.
3. **Give the money a real home.** Name the dedicated bank savings account and optionally record its
   bank and last digits. Pick a tiny first transfer or choose to do it later. SavePixie records the
   promise; it does not hold or move the funds.
4. **Celebrate something true.** Show the created goal and only celebrate a first save if it was
   actually recorded.

The first feasibility check deliberately asks for a comfortable savings amount—not salary, full
income, bank credentials or a detailed budget. The later planning module can compare all active goals
with a fuller monthly budget and explain where the saving capacity is going.

Automatic date extensions stop at ten years. Beyond that horizon, SavePixie offers a smaller first
milestone instead of producing a technically valid but emotionally meaningless date.

## Currency boundary

- A saver selects an ISO currency for planning and display.
- Every new Savings Pact snapshots that currency so all amounts inside one Pact have one meaning.
- Shared savers can live in different countries, but the Pact itself keeps the organiser's currency.
- No exchange rate or conversion is implied by SavePixie.
- Billing currency is separate. Stripe Checkout should use one reviewed multi-currency subscription
  Price and present a supported local option without changing savings data.

## Installable phone experience

The production PWA remains the fastest beta channel. The public landing page now includes an install
action: browsers with an install prompt can open it directly, while iPhone users receive the short
**Share → Add to Home Screen** instruction. The installed manifest starts at `/app`, where a signed-out
tester can create an account and a returning tester resumes the product.

The Capacitor iOS shell is the next packaging step after this onboarding is accepted on a real phone.
It should wrap the same responsive app, preserve deep links and authentication callbacks, use native
safe areas and haptics, and avoid inventing a separate native product. App Store packaging is not a
substitute for completing the PWA journey first.

## Goal-art system

Every goal needs attractive art even when a category icon does not exist. The system has two layers:

1. **Instant included fallback:** a deterministic composition made from the goal colour, a broad
   category shape, the Pixie sparkle and the chosen emoji. It is available offline and never delays
   goal creation.
2. **Optional generated artwork:** a Pro allowance—initially three accepted images per billing month,
   with one regeneration per goal—creates a more specific square illustration. Generation happens
   after the goal is safely created and never blocks saving.

### Locked visual recipe

- square, centred collectible-object composition;
- deep plum or night-violet background with a soft radial glow;
- one rounded tactile object in clean soft-3D/vector styling;
- restrained mint, warm gold and violet accents;
- tiny SavePixie sparkle motif;
- no lettering, numbers, logos, brands, photorealistic people or financial symbols;
- readable at 64 px and attractive at full-card size.

For “new luxury bed sheets,” the object might be a neatly folded cloud-soft linen bundle with one
golden stitched edge and a small floating Pixie sparkle—specific enough to feel personal, but clearly
part of the same family as travel, safety-buffer and home artwork.

### Safe delivery architecture

- A server-side function checks the signed-in user, Pro entitlement and monthly quota.
- Only the short goal name and controlled style template are sent to the image provider.
- The accepted result is stored in a private, user-owned Supabase Storage path with RLS.
- The goal keeps a storage path plus generation status; it never stores provider credentials.
- Deleting the goal deletes its generated image. Failed or abandoned generations expire.
- Generation cost, latency and moderation are logged without recording bank or budget data.

This makes custom art a delightful paid benefit while the underlying savings value remains useful
without it.
