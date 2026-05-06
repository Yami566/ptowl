# PTowl docs — index

**Single entry point for finding things in `/docs/`.** Started getting
unwieldy at ~25 files — this index groups them by purpose and flags
which ones are canonical vs. historical.

**Last updated:** 2026-05-05

---

## 🎯 Strategy & vision

The "where are we going" docs. Read these first if you're stepping
into the project cold.

| Doc                                                      | What it answers                                                                                                                                            |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **[PTOWL-NORTH-STAR.md](PTOWL-NORTH-STAR.md)** ⭐        | The master prompt + 6-month vision + audience definition. The doc to re-read when you're confused about strategy.                                          |
| [BUSINESS-PLAN-CANVAS.md](BUSINESS-PLAN-CANVAS.md)       | Lean canvas: problem, segments, UVP, channels, revenue, costs, metrics. Canonical pricing source.                                                          |
| [MARKET-ANALYSIS.md](MARKET-ANALYSIS.md)                 | Vertical expansion opportunities (PT/OT/SLP/chiro/mental-health/dental hygiene), competitive landscape, monetization strategy.                             |
| [PRODUCTION-GAP-ANALYSIS.md](PRODUCTION-GAP-ANALYSIS.md) | "Are we ready?" framework comparing PTowl to Facebook / homes.com / YouTube / Craigslist as 4 different definitions of complete. Updated as state changes. |

---

## 🚀 Launch playbooks

Practical, sequential, "do this on this day" docs.

| Doc                                          | When to use                                                                                                                                           |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **[LAUNCH-DAY.md](LAUNCH-DAY.md)** ⭐        | T-24h pre-flight → T+24h debrief. Read this the day before, follow it on launch day.                                                                  |
| [SHOW-HN.md](SHOW-HN.md)                     | Show HN submission body + 10 prepped comment defenses + 5 cross-post templates (r/physicaltherapy, r/dentistry, r/selfhosted, r/cloudflare, Twitter). |
| [SCREENCAST-SCRIPT.md](SCREENCAST-SCRIPT.md) | Exact 30-second recording script (key sequence + voiceover + post-production). Read before you hit Record.                                            |
| [BETA-OUTREACH.md](BETA-OUTREACH.md)         | Five-channel outreach playbook for getting first 10 active beta clinics. Personal network → walk-ins → Reddit → Facebook groups → APTA.               |

---

## 🔧 Operations & deployment

How the system runs, deploys, and recovers.

| Doc                                                                 | When to use                                                                                       |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| **[PRODUCTION-LAUNCH-RUNBOOK.md](PRODUCTION-LAUNCH-RUNBOOK.md)** ⭐ | Cloudflare/Clerk/GitHub dashboard hardening checklist. Run sections 1–3 before launch.            |
| [HOW-TO-DEPLOY.md](HOW-TO-DEPLOY.md)                                | End-to-end self-host walkthrough for AGPL community deployments. Used by anyone forking the repo. |
| [CLERK-PRODUCTION-SETUP.md](CLERK-PRODUCTION-SETUP.md)              | Click-by-click Clerk dev → production promotion. Phases A → F.                                    |
| [CF-PAGES-GIT-SETUP.md](CF-PAGES-GIT-SETUP.md)                      | Cloudflare Pages git integration setup, troubleshooting.                                          |
| [RELIABILITY-RUNBOOK.md](RELIABILITY-RUNBOOK.md)                    | Monitoring + status page setup (Upptime, etc.).                                                   |
| [DR.md](DR.md)                                                      | Disaster recovery: D1 point-in-time recovery, restore procedures.                                 |
| [AUTOMATION-PLAN.md](AUTOMATION-PLAN.md)                            | What we automate next, in plain English. Evolves session-by-session.                              |

---

## 🔐 Security & compliance

| Doc                                                 | When to use                                                                                                                    |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **[RED-TEAM-FINDINGS.md](RED-TEAM-FINDINGS.md)** ⭐ | Most recent adversarial pass (April 25, 2026). 4 of 12 findings fixed in commit `6515ed5`; 8 known-deferred. Reconciled May 5. |
| [THIRD-PARTY.md](THIRD-PARTY.md)                    | Subprocessor list + how third-party scripts (e.g., Tawk.to, Zaraz) are integrated.                                             |
| [SECURITY-UX-AUDIT.md](SECURITY-UX-AUDIT.md) ⚠️     | Historical (March 22, 2026 — pre-Clerk). Still useful for engineering-process notes. Treat specific findings as a snapshot.    |
| [STORAGE.md](STORAGE.md)                            | Cloudflare R2 storage architecture for clinic logos.                                                                           |
| [EMAIL.md](EMAIL.md)                                | MailChannels outbound transactional email setup.                                                                               |

---

## 📊 Reference / specs

Detailed feature/design specs. Mostly for engineers extending the
codebase.

| Doc                                                   | What it covers                                                                                                                 |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **[PRD.md](PRD.md)** ⭐ (v2.0)                        | Product requirements: feature inventory, user flows, routes, API endpoints. Canonical "what does PTowl do" reference.          |
| [BRD.md](BRD.md) ⚠️                                   | Business requirements (March 2026). Sections 6 and 5 superseded by BUSINESS-PLAN-CANVAS; sections 1–4 + 7 still load-bearing.  |
| [TDD.md](TDD.md) ⚠️                                   | Technical design (March 2026). Pre-Clerk; admin-console-era. Architecture sections still accurate; auth/admin sections stale.  |
| [SCALABILITY.md](SCALABILITY.md) ⚠️                   | Performance modeling at 100/1K/10K users. Pre-Clerk; admin endpoints described. Trade-off framework still useful.              |
| [VALIDATION-CHECKLIST.md](VALIDATION-CHECKLIST.md) ⚠️ | Pre-launch validation (March 2026). Superseded by PRODUCTION-LAUNCH-RUNBOOK + LAUNCH-DAY. References deleted /admin endpoints. |

---

## 📜 History / archive

| Doc                                                            | What it is                                                                                                 |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| [SPRINT-HISTORY.md](SPRINT-HISTORY.md)                         | Sprint diary entries. Useful for tracing why specific decisions were made.                                 |
| [RELEASE-polish-post-hotfix.md](RELEASE-polish-post-hotfix.md) | Post-hotfix release notes (admin console + patient portal removal).                                        |
| [PERPLEXITY-AUDIT-PROMPT.md](PERPLEXITY-AUDIT-PROMPT.md)       | LLM-prompt template for re-running an audit on the codebase. Internal tool.                                |
| `generate-*-docx.js` (5 files)                                 | Node scripts that generate Word-doc versions of BRD/PRD/TDD/etc for stakeholder sharing. Internal tooling. |

---

## ⭐ "If you only read three" recommendation

If a new contributor (or future-you returning after a long gap) wanted
to understand PTowl in 30 minutes:

1. **[PTOWL-NORTH-STAR.md](PTOWL-NORTH-STAR.md)** — the master prompt
2. **[PRD.md](PRD.md)** — what's actually built
3. **[PRODUCTION-GAP-ANALYSIS.md](PRODUCTION-GAP-ANALYSIS.md)** — current state vs target

Everything else is reachable from those three.

---

## Doc-status legend

| Mark      | Meaning                                                            |
| --------- | ------------------------------------------------------------------ |
| ⭐        | Canonical — current, load-bearing, read this first                 |
| ⚠️        | Has a staleness banner — read but verify against canonical sources |
| (no mark) | Current and accurate                                               |

---

## When adding new docs

1. Add to the appropriate section above
2. Mark with ⭐ if it becomes canonical for its topic (and demote the
   previous canonical doc to ⚠️ historical)
3. Keep this index alphabetized within each section
4. Update the "Last updated" date at the top
5. If consolidating: leave the old file with a banner pointing here,
   don't just delete (`git log` + git history matters for context)
