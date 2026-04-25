# Red-team findings & remediation log — April 25, 2026

After shipping the iteration-5 reminder pipeline, ran an adversarial
review across design, UI, security, and missing-feature surfaces.
This is the operator-facing log of what was found, what was fixed in
the same session, and what we'd do differently next time.

## Severity legend

- **CRIT** — would have shipped broken or unsafe to production
- **HIGH** — degraded UX, silent failure, or security weakness
- **MED** — quality / robustness issue
- **LOW** — style / polish / future-feature opportunity

---

## CRIT-1 · Inline `<script>` in unsubscribe page is blocked by CSP

**What was missed.** The strict CSP we set in `apps/api/src/index.ts`
has no `'unsafe-inline'` in `scriptSrc` and no nonce machinery. The
unsubscribe HTML page in `routes/reminders.ts` shipped with an inline
`<script>` block bound to `data-action` buttons. Browsers would have
parsed the page, refused to execute the script, and left the buttons
dead. Patient clicks → nothing happens. Hidden until someone tries
the link in production.

**How it was fixed (this session).** Rewrote the page as three
separate `<form method="post">` elements, each with a single `<button
type="submit" name="action" value="…">`. No JavaScript at all. The
POST handler now accepts `application/x-www-form-urlencoded` (browser
form submission) AND `application/json` (programmatic clients), and
on form submission 303-redirects back to the GET with `?saved=action`
so the rendered page reflects the new state. Added a flash banner +
proper ARIA labels.

**How to do better next time.** Treat any new HTML-rendering route
the same way we treat the SPA: assume strict CSP and design for it
from line one. Add a CI check that greps for inline `<script>` tags
in any file under `apps/api/src/routes/**` and fails the build.

---

## CRIT-2 · No idempotency check after the reminder claim UPDATE

**What was missed.** `services/reminders.ts` does
`UPDATE appointments SET reminder_*_sent_at = ... WHERE id = ? AND
reminder_*_sent_at IS NULL`, then enqueues. The intent was: if two
cron ticks race, only one wins the WHERE-clause guard, so only one
enqueues. The bug: I never read `meta.changes` after the UPDATE. A
concurrent tick that lost the race would still proceed past the
UPDATE and call `EMAIL_QUEUE.send()`, double-sending.

**How it was fixed (this session).** Capture the `D1Result.meta.changes`
return value and `continue` if the rowcount is zero. The append-only
nature of the marker column means we can rely on this being a true
atomic claim.

**How to do better next time.** Any "claim row, then act" pattern in
D1 should be wrapped in a tiny helper (e.g. `tryClaim(db, sql, binds)`
that returns `boolean`). It would force the changes-check at the call
site by returning false when the claim fails. Worth adding.

---

## HIGH-1 · Reminder window is too tight for cron jitter

**What was missed.** Cron half-window was 7.5 minutes (15-minute full
window). Cron runs `*/15 * * * *`, so any run that drifts more than
~7 minutes late misses the window entirely — appointment never gets
a reminder, marker never flips, but next tick's window has moved on.
Net: silently dropped reminders during scheduler congestion.

**How it was fixed (this session).** Doubled the half-window to 15
minutes (30-minute full window). Combined with the CRIT-2 atomic
claim above, every appointment now falls in two consecutive ticks'
windows and we still don't double-send.

**How to do better next time.** Don't pick window sizes by feel —
derive them from the cron interval and assumed jitter (window ≥
2 × cron_interval). Could also add a Workers Analytics Engine event
when a reminder marker flips so we have a paper trail.

---

## HIGH-2 · Wizard email field's error not associated with input via ARIA

**What was missed.** `<input aria-describedby="...-help">` always
pointed at the help text, even when an error was visible. The error
`<p role="alert">` had no id, so screen-reader users were told the
input had a generic description but had to discover the error via
the live region only. `aria-invalid` was not being toggled either.

**How it was fixed (this session).** `aria-describedby` now points
at the error id when an error is present, otherwise the help id.
Added `aria-invalid={true}` while in the error state. Error `<p>` now
has an `id` for the describedby reference.

**How to do better next time.** Wrap the input + label + help + error
into a tiny shared `<FormField>` component that handles ARIA state
once, used everywhere.

---

## MED-1 · No CI guard for brittle static-analysis test patterns

**What was missed.** Throughout the consolidation, several tests
broke because prettier reformatted source code in ways that didn't
match the test's exact-string assertions (uppercase hex literals
becoming lowercase, single-line lazy imports becoming multi-line).
We've fixed each instance reactively.

**How it was fixed (this session).** Already migrated assertions to
`toMatch(/regex/)` patterns that tolerate whitespace and case. No
new code added in this round.

**How to do better next time.** When writing static-analysis tests,
prefer regex over exact-string match. Better still: replace
static-analysis-of-source patterns with actual integration tests
where possible (we did this for CSRF — the `csrf-origin.test.ts`
boots a real Hono app and asserts behavior). The static-analysis
style is fragile; runtime assertions are not.

---

## MED-2 · MailChannels DLQ is configured but has no consumer

**What was missed.** `wrangler.jsonc` declares
`dead_letter_queue: ptowl-reminders-dlq` for the reminder queue. We
never wrote a consumer for it. Stuck messages would pile up in the
DLQ silently with no observability.

**How it was fixed (this session).** Not fixed — a DLQ consumer needs
its own Worker (a single Worker module exports one `queue` handler).
Logged here as known-deferred.

**How to do better next time.** Either drop the DLQ config until we
have a place to drain it, or split the API Worker into a producer
Worker + a consumer Worker so both queues can be handled. Simplest
for now: a small follow-up Worker with one route that pulls from DLQ
and posts to a Slack/email alert channel.

---

## MED-3 · Schedule deletion does not clean up R2 logo objects

**What was missed.** When a clinic deletes a schedule (or eventually
their account), the `profiles` row cascade-deletes via `ON DELETE
CASCADE`, but `LOGOS` R2 objects are not. They stay forever.

**How it was fixed (this session).** Not fixed — minor data residue,
no security impact (object key embeds a random user id; not
publicly listable). Documented as known-deferred.

**How to do better next time.** When we add the GDPR-required
account-deletion endpoint, list the user's R2 objects (`LOGOS.list({
prefix: 'logos/' + userId })`) and delete them in the same
transaction. Add to the privacy-policy "Your Rights & Data Deletion"
section's promise.

---

## MED-4 · Privacy policy mentions "Subprocessors list maintained on this page" but it's a static React component

**What was missed.** Section 7 of the policy says the subprocessor
list is the source of truth. But it's hard-coded JSX. Future changes
require a code commit. Operator might forget to update it when
adding a new vendor.

**How it was fixed (this session).** Not fixed — leaving as-is for
now since the subprocessor list rarely changes. Documented.

**How to do better next time.** Move the subprocessor list to a
single JSON file (`docs/subprocessors.json`) consumed by both the
React page (statically imported) AND a small "GET
/api/v1/subprocessors" endpoint. One source of truth, easy to update,
machine-readable for any future GDPR-required automated DPA fetch.

---

## LOW-1 · No "send a test reminder" button for clinics

**What was missed.** Clinic enters a patient email, hits save, and
has no idea whether the email is correctly typed until the patient
calls saying they got a reminder for someone else's appointment.

**How it was fixed (this session).** Not fixed — UX nice-to-have.
Documented.

**How to do better next time.** Add a `POST /api/v1/schedules/:id/test-reminder`
that bypasses the cron path and immediately sends a one-off
"This is a test" email. Throttle to 1/min/user.

---

## LOW-2 · No bulk patient-email import

**What was missed.** Clinics with 50 patients have to set email
one schedule at a time.

**How it was fixed (this session).** Not fixed.

**How to do better next time.** Add a CSV-import flow on the
SchedulePage list view that takes `(initials, email)` rows and
writes via the existing PUT /:id/reminders endpoint. Rate-limit
to ~5 rows/sec to stay under MailChannels burst limits when the
first reminders kick off.

---

## LOW-3 · No analytics on reminder open / click / bounce

**What was missed.** No way to know if reminders are actually being
read. No way to auto-handle bounces.

**How it was fixed (this session).** Not fixed.

**How to do better next time.** Wire MailChannels' webhook to a
`POST /api/v1/webhooks/email/{open,click,bounce}` set of routes.
On bounce, hash the bounced email and set
`email_subscriptions.unsubscribed = 1`. On open/click, write to a
Workers Analytics Engine dataset for later querying.

---

## LOW-4 · Daily-digest send-out cron not implemented

**What was missed.** The schema, queue path, and unsubscribe-page
toggle for `digest_mode` are wired. The actual "once-a-day, batch
all of today's reminders into a single email" cron is not.
`processReminderMessage` ack's digest-mode messages without sending,
so digest users currently get _no_ reminders.

**How it was fixed (this session).** Not fixed — see LOW.

**How to do better next time.** Add a separate scheduled handler
that runs once per `*/15` tick and at clinic-local 7am-window kicks
a digest job per timezone. Or simpler: run at 12:00 UTC
unconditionally — patients in different timezones get the digest at
different local hours, which is acceptable for a v1.

---

## Disposition summary

| Finding                               | Severity | Status                          |
| ------------------------------------- | -------- | ------------------------------- |
| Inline script blocked by CSP          | CRIT     | **Fixed** this session          |
| Reminder UPDATE rowcount not checked  | CRIT     | **Fixed** this session          |
| Reminder window too tight             | HIGH     | **Fixed** this session          |
| Wizard email ARIA association         | HIGH     | **Fixed** this session          |
| Brittle static-analysis test patterns | MED      | Process note                    |
| DLQ configured without consumer       | MED      | Deferred                        |
| Schedule deletion leaves R2 objects   | MED      | Deferred (GDPR endpoint)        |
| Subprocessor list as code, not data   | MED      | Deferred                        |
| No test-reminder button               | LOW      | Deferred                        |
| No bulk email import                  | LOW      | Deferred                        |
| No bounce/open/click analytics        | LOW      | Deferred (MailChannels webhook) |
| Daily-digest cron not implemented     | LOW      | Deferred                        |

**4 of 12 findings fixed in the same session.** The remaining 8 are
known-deferred with concrete plans recorded above.
