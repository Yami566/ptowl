# PTowl — Operating

How we work. The development posture, deploy gates, and standing lenses
that govern every change. Lives next to `VISION.md` (why), `BUILD.md`
(how it's built), `SHIP.md` (how it gets out the door), and `RUN.md`
(how to keep it healthy). This doc covers **how we collaborate.**

> **TL;DR** — Cloudflare-only stack. Net-new feature scoping is
> capped at 6 questions. Production code deploys go through a PR with
> an explicit owner "approve" comment + green CI. Two standing lenses
> (Cost Control, Compliance) apply to every non-trivial change. An
> 8-persona thinking checklist runs in the background. A 6-gate
> milestone framework applies to net-new features only — ongoing
> iteration on shipped features skips most gates.

---

## Stack whitelist

Cloudflare + GitHub + Clerk are the canonical platforms. Google
services (Fonts, OAuth) only when explicitly approved per use. **No
new backends** unless an additional managed service is approved by
name.

What we do NOT use:

- Microsoft Visual Studio / Azure (the project's IDE is **VS Code**,
  which is a different product from Visual Studio; the cloud is
  Cloudflare end-to-end)
- AWS, GCP, or any other cloud provider for runtime
- Self-hosted databases or backend servers
- Any third-party SDK that hasn't been disclosed in the privacy page

---

## The 6-Q Discovery cap

Net-new feature scoping (Discovery phase) is capped at **6 questions
total** per work item. Within that envelope we run **Clarify → Propose
→ Validate** micro-loops:

1. **Clarify** — small batches of structured questions, multi-select
   where helpful, with concrete options.
2. **Propose** — one named approach with file paths, commit shape,
   and rough effort.
3. **Validate** — explicit ship-or-defer decision before execution.

The cap applies ONLY to net-new feature scoping. Ongoing iteration on
already-shipped features (bug fixes, copy tweaks, small polish) is NOT
capped — those run on a more conversational pace as needed.

Trivial work (typos, one-line copy edits) skips Discovery entirely
and goes straight to execution.

---

## The 3-tier automation rule

Different change kinds get different deploy paths.

### Tier 1 — Idempotent reversible: fire directly

Examples: re-firing `cf-bootstrap.yml`, triggering `workflow_dispatch`,
opening a small config-change PR, GH API reads, curl probes against
live, marker-file commits to fire path-filtered workflows, re-running
a previously failed CI job.

**Rule:** just do it. Report what fired afterward, not before.

### Tier 2 — Production code deploys: PR + owner approval

Anything that ships to ptowl.com or the API Worker requires:

1. A PR opened from a feature branch (no direct push to main)
2. An explicit owner "approve" comment on the PR (e.g., `approve`,
   `lgtm`, `ship it`)
3. CI green before merge

This rule was adopted on 2026-05-07. GitHub-side branch protection on
`main` may or may not be enforced server-side depending on Settings →
Branches — the rule is honored in workflow regardless.

**Skips Tier 2:**

- Doc-only commits (README, `docs/*.md`)
- Memory-file edits (those live outside the repo entirely)
- Trivial typo fixes

### Tier 3 — Destructive / hard-to-reverse: ALWAYS confirm first

Examples: `git push --force`, `git reset --hard`, schema drops, secret
rotation, deleting a branch, R2 bucket lifecycle changes, any
production data wipe.

**Rule:** show the exact command, the blast radius, the rollback path,
and wait for explicit confirmation before executing.

---

## Two standing lenses

Apply on every non-trivial PR before merge.

### Cost Control lens

For changes that add compute, storage, network, or third-party calls,
project cost at three scale tiers in the PR description:

```
Cost @ 100 users:   <free tier OK?>
Cost @ 1K users:    <free tier OK?>
Cost @ 10K users:   <$X/mo if exceeds free>
Closest ceiling:    <which resource hits first, at what scale>
```

Free-tier ceilings to watch:

| Resource           | Free tier                             |
| ------------------ | ------------------------------------- |
| Cloudflare Workers | 100K req/day                          |
| Cloudflare D1      | 5GB + 5M reads/day + 100K writes/day  |
| Cloudflare R2      | 10GB + 1M Class A ops/month           |
| Cloudflare Pages   | unlimited bandwidth, 500 builds/month |
| Clerk              | 10K MAU                               |

If a change pushes a resource over a ceiling at any of the three tiers,
flag it with the upgrade cost and the user-count threshold where it
trips.

The lens does NOT fire for: copy edits, doc changes, CSS-only PRs,
test-only PRs.

### Compliance lens

For PRs touching data flow, answer 4 questions before merge:

1. **Does it create or persist PHI?** (PTowl's hard "no PHI stored"
   promise — initials only, mapped to sports aliases.)
2. **Does it add a new subprocessor?** (If yes, update privacy page +
   subprocessor list.)
3. **Does it change cookies / tracking surface?** (CSP + Privacy
   Policy implications.)
4. **Does it create a HIPAA-adjacent risk?** (PTowl is explicitly
   NOT HIPAA-secure — that posture must hold in marketing copy.)

Trip wires that block merge:

- New column accepting free-text patient names
- Endpoint accepting full first/last name
- Reminder email body containing patient identifying info beyond
  initials
- Marketing copy claiming HIPAA-secure status

PRs passing the lens include this in the description:

```
Compliance: ✅ no PHI / no new subprocessor / no tracking change / no HIPAA risk
```

The lens does NOT fire for: pure UI/CSS changes that don't touch data,
test-only PRs, doc-only PRs.

---

## 8-persona thinking checklist

Mental scaffolding for non-trivial changes. NOT role enforcement —
no need to label which "persona speaks" in chat output. Run through
in order during planning.

| #   | Persona      | Standing question                                       |
| --- | ------------ | ------------------------------------------------------- |
| 1   | Discovery    | What does the founder actually want? (≤6 Qs)            |
| 2   | Design       | Wireframe / a11y / human-centered acceptance            |
| 3   | Infra        | Cloudflare-first; new backends need explicit approval   |
| 4   | CI/CD        | Preview pipeline, gated deploys, smoke tests            |
| 5   | Security     | Auth (Clerk + JWKS), secrets, WAF, zero-trust           |
| 6   | Cost Control | Estimate at 100/1K/10K, alert on ceiling                |
| 7   | Compliance   | 4-question check (PHI / subprocessor / cookies / HIPAA) |
| 8   | Iteration    | Clarify → Propose → Validate within the 6-Q envelope    |

Trivial work (typo fixes) skips the checklist — overhead the change
doesn't warrant.

---

## 6 milestone gates (net-new features only)

Apply all 6 gates to: new endpoints, new pages, new components with
logic, schema changes, new third-party integrations, architecture
changes (new Worker, new binding, new queue).

Skip gates 1-4 for: bug fixes on shipped features, copy edits, small
a11y / styling fixes. Resume at gate 5 if non-trivial.

Skip the entire framework for: typos, one-line bug fixes, doc-only
changes.

| Gate                      | Output                                | Done when                                          |
| ------------------------- | ------------------------------------- | -------------------------------------------------- |
| 1. Requirements           | Scope statement + Discovery answers   | Single-sentence summary + 5-bullet acceptance list |
| 2. Wireframes             | Rough sketch (text or markdown OK)    | A 2-min reader can predict the surface             |
| 3. Repo Scaffold          | Feature-branch PR with stub files     | `git status` shows the new file tree               |
| 4. Preview Deploy         | CF Pages preview URL or local dev     | Happy path verified end-to-end                     |
| 5. Security & Cost Review | Lenses applied, findings logged in PR | PR description has Compliance + Cost blocks        |
| 6. Production Deploy      | PR merged via Tier 2 rule             | Bundle hash rotates, smoke checks pass             |

Each gate produces 4 artifacts:

- Short checklist (≤10 items)
- One-line PR summary (<80 chars)
- Automated smoke checks (3-5 curl probes / CI assertions)
- Rollback steps (commit hash + estimated rollback time)

---

## What's preserved from PTowl-specific tuning

These rules predate the 2026-05-07 operating-posture refactor and stay
in force:

- **Voice / brand awareness.** Heavy owl whimsy at brand moments
  (sign-in, empty states, 404, errors). Restrained in functional UI
  (schedule editor, profile, print settings) where work-getting-done
  flow matters more.
- **Stricter no-new-code default.** Even more conservative than this
  doc's "no new backends" rule — see [`MEMORY.md`](../README.md) on
  the per-machine memory side for the strict default + allowed-edits
  list.
- **Common gotchas** that bit us during launch prep, captured for
  future reference. CSP must allowlist `clerk.ptowl.com` +
  `accounts.ptowl.com` in 6 directives. The CF DNS row for `clerk`
  auto-proxies and must be flipped to DNS-only (gray cloud).
  `commitlint` rejects multi-type prefixes (`docs+chore:`) — use
  single types. The CI deploy token lacks `Zone:DNS:Edit` scope.
- **No local Node toolchain.** All `pnpm install` / typecheck / test
  runs happen on CI. Don't ask the founder to install Node locally.
- **Doc consolidation playbook.** Recipe for collapsing a sprawling
  doc tree into a 4-theme library (Vision / Build / Ship / Run).

---

## Where the canonical rules live

This doc is the project-visible mirror. The canonical, machine-readable
rules live as memory files at
`~/.claude/projects/<project>/memory/` per the AI assistant's memory
system. Mapping:

| Concept                    | Memory file                               |
| -------------------------- | ----------------------------------------- |
| 6-Q Discovery cap          | `feedback_pace.md`                        |
| 3-tier automation rule     | `feedback_run_automations.md`             |
| Cost Control lens          | `feedback_cost_control.md`                |
| Compliance lens            | `feedback_compliance.md`                  |
| 8 personas                 | `reference_specialist_personas.md`        |
| 6 milestone gates          | `reference_milestone_gates.md`            |
| No-new-custom-code default | `feedback_no_new_code.md`                 |
| PTowl product context      | `project_ptowl.md`                        |
| Doc-consolidation playbook | `reference_doc_consolidation_playbook.md` |
| No local Node              | `reference_environment.md`                |

Memory files are per-machine; this doc is the version-controlled
mirror that documents the project's operating posture for any future
contributor or machine.

---

\_Adopted 2026-05-07 from a hybrid of the prior PTowl-specific rules

- a Copilot-suggested 8-specialist agile-DevOps master prompt. Three
  elements from the Copilot prompt were adopted: 6-Q Discovery cap,
  PR-comment prod-deploy gate, Cost + Compliance lenses. Microsoft /
  Azure platform whitelist was explicitly NOT adopted — Cloudflare-only
  stays canonical.\_
