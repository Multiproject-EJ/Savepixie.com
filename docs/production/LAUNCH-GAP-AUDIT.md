# SavePixie Launch Gap Audit

Updated: 2026-07-18

## Current proven state

- GitHub `main` contains the production and dormant billing foundation from PR #8.
- The production PWA builds successfully with TypeScript checks and a GitHub Pages SPA fallback.
- Supabase Auth uses `https://savepixie.com` with production, `www`, and local-development redirects.
- The shared WalletHabit Suite project has no database, RLS, or exposed-schema security-advisor
  findings. One Auth warning remains until leaked-password protection is enabled.
- Legacy personal goals and atomic deposits are still present for backwards compatibility.
- The live database now also contains the core Savings Pact model:
  - solo and shared Pacts;
  - private per-user Savings Homes;
  - member roles and amount-visibility preferences;
  - append-only commitment, pending, allocation, withdrawal, and reversal entries;
  - seven-day private invitation codes;
  - separate reported and bank-verified totals;
  - a database-enforced 1:1 verified-allocation limit.
- A rollback-safe two-user acceptance test passes against the live project. It proves cross-user Home
  isolation, shared joining, privacy filtering, pending aggregation, verified aggregation, and rejection
  of over-allocation.
- Weekly plans now sync per account and week, migrate an existing device-only plan once, preserve week
  history, and pass a separate two-user RLS isolation test against the live project.
- The avatar now opens account settings with editable Savings Home details, a private JSON account
  export, a support route, and secure self-service deletion with password reconfirmation.
- The protected deletion function is live, rejects anonymous callers, checks Stripe directly before
  deleting a mapped customer, transfers active shared Pacts, repairs their totals, and removes
  Auth-linked SavePixie records through verified cascades.
- All five rollback-safe Supabase acceptance suites pass, production-origin CORS is verified for the
  signed-in browser functions, and the 2026-07-18 rerun left zero temporary records.
- The database enforces Basic versus Pro at the real write boundary: one two-person shared Pact on
  Basic, additional Pacts and groups of up to ten on Pro, with no destructive downgrade behavior.
- The feature-flagged Settings offer shows the seven-day trial and 29 kr renewal plainly; Checkout
  validates the exact price configuration, and the webhook rejects mismatched price IDs.
- Checkout and Portal now re-retrieve the mapped Stripe customer and require matching SavePixie user
  metadata before opening any hosted billing surface. Webhooks resolve subscription ownership from
  the private customer mapping and reject conflicting metadata. The active deployed versions reject
  anonymous Checkout/Portal requests with `401` and unsigned webhook requests with `400`.
- Terms and Privacy routes now exist as clearly labelled closed-beta drafts; operator identity,
  jurisdiction, subscription/refund language, and legal approval remain explicit release gates.
- Pact detail now includes privacy-filtered Circle progress, each member's commitment and visibility
  controls, safe leaving/reactivation, owner archiving, invitations, and explicit 1:1/non-custody copy.
- A rollback-safe three-person acceptance test proves that direct table access cannot bypass Circle
  privacy, outsiders are rejected, owners cannot abandon Pacts, and ledger history survives leaving.
- The client compiles and builds after moving its goal API onto Savings Pacts and Savings Homes.
- Chrome visual QA passed at 390 × 844 and 1440 × 900 for onboarding, Pact choice, Savings Home setup,
  Pact cards, join controls, pending Quick Save, and the synced weekly plan.
- The production service worker now uses a network-first asset strategy with type-safe offline failures,
  and Chrome proved that both `/` and a direct `/auth` load reopen from the cached shell after the
  preview server is stopped. A global connection notice explains that writes need a connection, and a
  branded render-error recovery screen protects customers from a blank application.
- Session initialization and the first private-data load now have branded, accessible retry states.
  Profile preparation is deferred outside Supabase's auth-state callback to avoid its documented
  callback deadlock, and a live client probe proved that a follow-up Data API request completes. The
  private savings provider is keyed by Auth user ID so an account switch cannot retain the previous
  account's in-memory goals while the new account loads.
- Sign-in, sign-up, reset, and password-update failures now map documented Supabase Auth error codes to
  calm customer copy. Sign-up requires an eight-character password and an explicit matching
  confirmation before any account request is sent.
- The install package now carries the approved Petal Hood identity as real 192 px and 512 px PNGs, an
  opaque maskable Android icon, and an opaque 180 px Apple touch icon. The manifest uses the product's
  actual dark-violet theme, declares a stable app ID, and its built output resolves every icon asset.
- Returning installed-app customers now receive a compact, dismissible “fresh SavePixie is ready”
  notice when a replacement service worker finishes installing. The app checks again when it returns
  to the foreground and lets the customer choose the safe reload moment.
- Quick Save, new Pact, Pact archive/leave, and account deletion now share a keyboard-safe modal
  contract: focus enters and stays inside the dialog, Escape closes only when safe, background scroll
  is locked, focus returns to the launching control, and an in-flight save or destructive action
  cannot be dismissed accidentally.
- Shared invitations now expose a selectable one-use link with honest clipboard feedback, distinguish
  failed actions from success, validate pasted links before submitting, and genuinely retry a failed
  invitation instead of only refreshing unrelated savings data. A 390 px portrait check confirms the
  invitation card spans the available width with 44 px copy controls and no horizontal overflow.
- Weekly-plan sync failures now offer an explicit retry without requiring customers to change a value.
  Account exports and Savings Home updates announce success and failure accessibly, and the Account
  Check prototype remains usable when private browser storage is unavailable instead of getting stuck
  in its scanning state. Sign-out failures now stay on the current screen with a clear retryable
  message instead of silently doing nothing.
- Authenticated client failures now produce only fixed, deduplicated operational codes in a protected
  Edge Function log. No message, stack, route, identifier, savings value, device fingerprint, or
  customer metadata is sent. The beta funnel is derived as aggregate counts from records already
  required to provide the service.

## Launch blockers

### Product

- Test the new client with two real authenticated beta accounts and confirm invitation recovery paths.
- Verify deletion and the data export end to end with a disposable authenticated beta account.
- Configure a branded production SMTP sender and Auth email templates; the default Supabase sender is
  rate-limited for development and is not a customer launch path.
- Finalize legally required billing retention and the future Account Check server-side retention job.
- Continue recoverable action-level data-error review for secondary paths; session, initial-data,
  weekly-plan sync, core saving actions, exports, Savings Home edits, offline, and fatal-render states
  are complete.

### Commercial

- Create the 29 kr/month Stripe product, seven-day trial, tax settings, webhook, and customer portal in
  test mode, then run the full lifecycle test suite.
- Publish reviewed subscription, cancellation, refund, Terms, and Privacy copy.

### Operations

- Point `savepixie.com` and `www.savepixie.com` away from the old AlphaStocks destination and to the
  selected GitHub Pages deployment.
- Verify HTTPS, canonical redirects, direct-route refresh, PWA install/update/offline behavior, password
  reset, and email confirmation on the real domain.
- Review operational error codes daily and run the aggregate beta funnel weekly as documented in
  `MONITORING.md`.

The checked cutover and rollback records are captured in `DOMAIN-CUTOVER.md`. Current authoritative
DNS is still at GoDaddy and the public redirect chain still ends at AlphaStocks; no live DNS change has
been made.

The email gap is captured in `EMAIL-DELIVERY.md`. Public Mailgun MX/SPF and DMARC records exist, but the
live Auth log proves Supabase still sends through its shared sender and has already rejected a signup
at the default email rate limit. Mailgun inbound support routing and custom Auth SMTP remain unproven.

## Safety boundary

SavePixie records promises and evidence; it does not take custody of savings. Manual saves are visibly
pending. Only an authorised future bank-information integration may append verified allocations. Stripe
payments are SavePixie subscription revenue and can never count as customer savings.
