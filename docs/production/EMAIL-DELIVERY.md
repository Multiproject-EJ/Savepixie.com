# SavePixie Email Delivery

Checked: 2026-07-17

## Proven current state

- `savepixie.com` already publishes Mailgun MX records (`mxa.mailgun.org` and `mxb.mailgun.org`) and an
  SPF record that includes Mailgun.
- DMARC exists with a quarantine policy and aggregate reporting.
- This DNS foundation does **not** prove that `support@savepixie.com` has an active Mailgun inbound
  route or forwards into a monitored inbox.
- WalletHabit Suite Auth is not using Mailgun today. The live Supabase Auth log shows confirmation
  mail leaving from Supabase's shared `noreply@mail.app.supabase.io` sender.
- The same live log records a signup rejected with `over_email_send_rate_limit`. The default sender is
  therefore a proven launch blocker, not a theoretical future concern.

## Production configuration

### 1. Make customer support real

1. Open the Mailgun account that owns the `savepixie.com` domain.
2. Confirm the domain is active and its current DKIM record validates.
3. Create or verify an inbound route for `support@savepixie.com` to a mailbox that is checked by a
   named operator.
4. Send a message from an unrelated mailbox to `support@savepixie.com`, confirm receipt, reply, and
   confirm the reply reaches the original sender.
5. Record who owns the support queue and the target first-response time for the beta.

Do not advertise the address as an operational support channel until this round trip passes.

### 2. Give Supabase a dedicated transactional sender

1. Create a restricted Mailgun SMTP credential for SavePixie Auth; do not use a broad Mailgun API key.
2. In WalletHabit Suite → Authentication → Emails → SMTP Settings, enable custom SMTP with Mailgun's
   current host, TLS port, SMTP username, and generated password.
3. Use a transactional From address on the verified domain, such as `accounts@savepixie.com`, with the
   sender name `SavePixie`. Keep `support@savepixie.com` as the reply/support address.
4. Disable Mailgun click tracking for authentication messages so confirmation and recovery URLs are
   not rewritten.
5. Keep email confirmation required. Review the project email-send and per-user cooldown limits after
   custom SMTP activates; the initial closed beta does not require high-volume settings.

Never place the SMTP password in the repository, frontend environment, browser bundle, operating
documentation, or screenshots.

### 3. Brand the essential templates

Prepare concise, low-image templates for:

- confirm signup;
- reset password;
- email change;
- password-changed security notification.

Every template must name SavePixie, explain why the message was sent, use the configured HTTPS domain,
state when the customer can ignore it, and link to the monitored support address. Avoid user-provided
names or other unsanitized metadata in email content.

## Acceptance suite

Run these tests with fresh external addresses after SMTP is saved:

1. New signup receives the confirmation email and the link opens `https://savepixie.com/auth`.
2. Confirming the email creates a usable session and reaches onboarding exactly once.
3. Password reset reaches the same address, enters recovery mode, accepts a new eight-character
   password, and signs in with only the new password.
4. A repeated signup or reset inside the cooldown receives friendly app copy rather than a raw error.
5. Auth logs show the chosen `@savepixie.com` From address and no shared Supabase sender.
6. Mailgun delivery logs show delivered—not merely accepted—for Gmail and one non-Gmail provider.
7. SPF, DKIM, and DMARC pass in the received message headers.
8. `support@savepixie.com` completes the external send-and-reply round trip.

Save the test date and outcomes in `LAUNCH-READINESS.md`. Do not store customer addresses or full mail
headers in Git.

## Domain-cutover safety

The GoDaddy-to-GitHub Pages change must preserve all MX, SPF, DKIM, DMARC, verification, and Mailgun
records. Only the apex/`www` web records listed in `DOMAIN-CUTOVER.md` should change.
