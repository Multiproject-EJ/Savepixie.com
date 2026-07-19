# SavePixie Domain Cutover

Checked: 2026-07-17 at 22:05 BST

## Proven current state

- The authoritative nameservers are `ns77.domaincontrol.com` and `ns78.domaincontrol.com`, so DNS is
  currently managed through GoDaddy even if the registration is later moved elsewhere.
- Both `savepixie.com` and `www.savepixie.com` resolve to the old forwarding service at
  `3.33.251.168` and `15.197.225.128`.
- A real customer request currently follows this chain:
  `savepixie.com` → `markettycoon.app` → `Alphastocks.ai` → `www.alphastocks.ai`.
- Stripe sandbox Checkout is working, but its success URL is already the intended production route
  `https://savepixie.com/app/today`; that route will continue to show the old site's Not Found page
  until this cutover is complete.
- `https://multiproject-ej.github.io/Savepixie.com/` already redirects to `savepixie.com`, proving the
  GitHub Pages site has the custom apex domain configured. DNS must not be cut over until the launch
  branch is merged and the new Pages deployment is green.

## Pre-cutover gates

1. Merge the reviewed SavePixie launch branch into `main`.
2. Confirm the GitHub Pages workflow succeeds and its artifact contains the production PWA.
3. Keep `VITE_STRIPE_ENABLED=false` until Stripe test and live lifecycle acceptance is complete.
4. Confirm Supabase Auth still allows `https://savepixie.com/auth` and the `www` equivalent.
5. Record or screenshot the existing GoDaddy DNS zone before changing it. Do not alter MX, TXT,
   DKIM, SPF, DMARC, or unrelated subdomains.

## GoDaddy DNS change

Delete only the existing apex and `www` forwarding records that resolve to `3.33.251.168` and
`15.197.225.128`. Then create the following records:

| Type  | Name  | Value                        |
| ----- | ----- | ---------------------------- |
| A     | `@`   | `185.199.108.153`            |
| A     | `@`   | `185.199.109.153`            |
| A     | `@`   | `185.199.110.153`            |
| A     | `@`   | `185.199.111.153`            |
| AAAA  | `@`   | `2606:50c0:8000::153`        |
| AAAA  | `@`   | `2606:50c0:8001::153`        |
| AAAA  | `@`   | `2606:50c0:8002::153`        |
| AAAA  | `@`   | `2606:50c0:8003::153`        |
| CNAME | `www` | `multiproject-ej.github.io.` |

These are GitHub's current published Pages records. Recheck the official GitHub Pages custom-domain
documentation immediately before the live change in case GitHub changes them.

## Acceptance after propagation

1. `dig +short savepixie.com A` returns only the four `185.199.*.153` addresses.
2. `dig +short savepixie.com AAAA` returns only the four `2606:50c0:800*::153` addresses.
3. `dig +short www.savepixie.com CNAME` returns `multiproject-ej.github.io.`.
4. GitHub Pages reports the custom domain as valid and permits **Enforce HTTPS**.
5. `http://savepixie.com`, `https://www.savepixie.com`, and mixed-case paths resolve to one canonical
   HTTPS host without visiting MarketTycoon or AlphaStocks.
6. Refresh `/auth`, `/app`, `/legal/terms`, and `/legal/privacy` directly; all must load the SPA rather
   than a GitHub 404.
7. Test sign-up confirmation, password recovery, PWA install, and one authenticated save on the real
   domain before inviting beta customers.

## Rollback

If the new Pages build or certificate fails, restore the two old `A` values for both `@` and `www`:

- `3.33.251.168`
- `15.197.225.128`

Do not change Supabase data or Stripe configuration during a DNS rollback. Once the old records
propagate, the previous forwarding chain will resume while the Pages issue is repaired.
