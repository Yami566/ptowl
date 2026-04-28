# Email — MailChannels via Cloudflare Workers

PTOWL's transactional email runs through **MailChannels'** REST API directly
from a Cloudflare Worker. No SDK, no Node-only deps.

## What's wired up

- `apps/api/src/services/email.ts` posts to `https://api.mailchannels.net/tx/v1/send`.
- Auth via `EMAIL_API_KEY` secret (set with `wrangler secret put EMAIL_API_KEY`).
- All 5 transactional templates live inline (admin notifications, user
  approval/denial, admin 2FA code, patient share code).
- Failures are logged and swallowed — registration never fails because
  email delivery failed.

## DNS setup (one-time, ptowl.com)

For deliverability you need three records on `ptowl.com`. Configure them
in **Cloudflare → DNS → Records**:

### 1. SPF (already covers MailChannels via the `relay.mailchannels.net` include)

```
Type:  TXT
Name:  @  (or ptowl.com)
Value: v=spf1 include:relay.mailchannels.net ~all
```

If you already have an SPF record, merge the `include:relay.mailchannels.net`
clause into the existing one — there can only be ONE SPF record per domain.

### 2. Domain Lockdown (MailChannels-specific, prevents others from sending as you)

```
Type:  TXT
Name:  _mailchannels
Value: v=mc1 cfid=<your-account-id>.workers.dev
```

Replace `<your-account-id>` with your Cloudflare account ID. Find it in
the Workers & Pages dashboard URL.

### 3. DKIM (cryptographic signing — MailChannels generates a keypair for you)

```
Type:  TXT
Name:  mailchannels._domainkey
Value: v=DKIM1; k=rsa; p=<public-key-from-MailChannels-dashboard>
```

Generate the keypair from the MailChannels dashboard and paste the public
key here. The private key stays in your MailChannels account.

## Pricing note (April 2026)

MailChannels deprecated their free tier for new senders in mid-2024. New
accounts now require a paid plan starting around $5/mo. If you'd rather
not add a MailChannels bill, the alternative is to revert
`apps/api/src/services/email.ts` to the Resend SDK — git history at the
`refactor: replace Resend with MailChannels` commit shows the diff to
revert.

## Testing locally

```bash
# Set a fake API key for local testing
echo 'EMAIL_API_KEY=test-key' > apps/api/.dev.vars

# Run the API worker
pnpm dev:api
```

The unit tests (`apps/api/src/services/email.test.ts`) mock `fetch`,
so they don't require any DNS or credentials to pass.

## What's NOT covered

- **Inbound email** — see `docs/DR.md` and the deferred Stage 3b plan.
  Configure Cloudflare Email Routing in the dashboard for `support@`,
  `abuse@`, `admin@` aliases. No code involvement.
- **Bounce handling** — MailChannels POSTs bounce events to a configured
  webhook. Not yet wired. Add a `/api/v1/webhooks/email/bounce` route
  if delivery debugging becomes important.
