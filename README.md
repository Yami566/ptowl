# PTowl — Patience Trainer

Recurring patient scheduling on Cloudflare for therapy clinics — physical
therapy, occupational therapy, speech-language pathology, chiropractic,
mental-health/therapy, and dental hygiene. **PT in PTowl stands for
"Patience Trainer."** Clinic staff create schedules in 5 keypresses,
patients get reminders and an `.ics` calendar feed, and the sports-alias
system keeps real names off our servers as a privacy failsafe (PTowl is
explicitly NOT a HIPAA-secure system).

[![CI](https://github.com/yami566/ptowl/actions/workflows/ci.yml/badge.svg)](https://github.com/yami566/ptowl/actions/workflows/ci.yml)
[![Deploy](https://github.com/yami566/ptowl/actions/workflows/deploy.yml/badge.svg)](https://github.com/yami566/ptowl/actions/workflows/deploy.yml)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](./LICENSE)

## The doc library

Five canonical docs cover the project end-to-end. Each is self-contained
and cross-linked.

| Doc                                          | Purpose                                                                                                                                                                          |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **[docs/VISION.md](./docs/VISION.md)**       | Strategy, audience, locked decisions, market positioning, pricing, roadmap. The "why" and "for whom."                                                                            |
| **[docs/BUILD.md](./docs/BUILD.md)**         | Engineering reference: stack, architecture, repo layout, deploy paths, CI gates, self-host, Clerk setup, subprocessors. The "how it's built."                                    |
| **[docs/SHIP.md](./docs/SHIP.md)**           | Launch playbook: T-24h → T+24h checklist, Show HN draft + 11 comment defenses, cross-post templates, screencast script, 5-channel beta outreach. The "how it gets out the door." |
| **[docs/RUN.md](./docs/RUN.md)**             | Operations handbook: edge hardening, monitoring, disaster recovery, open security findings, common gotchas. The "how to keep it healthy."                                        |
| **[docs/OPERATING.md](./docs/OPERATING.md)** | Development posture: 6-Q Discovery cap, PR-gate for prod deploys, Cost + Compliance lenses, 8-persona checklist, 6 milestone gates. The "how we collaborate."                    |

Standard project files at the repo root: [CONTRIBUTING.md](./CONTRIBUTING.md),
[SECURITY.md](./SECURITY.md), [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md),
[LICENSE](./LICENSE).

## Run your own PTowl

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/Yami566/ptowl)

One-click fork-and-deploy via Cloudflare. Free tier covers ~10,000
monthly active users on the Cloudflare and Clerk side. Full self-host
walkthrough lives in [docs/BUILD.md](./docs/BUILD.md) under "Self-host."

## Stack at a glance

| Layer            | Tech                                                                                     |
| ---------------- | ---------------------------------------------------------------------------------------- |
| Frontend         | React 19 + Vite + React Router 7, on Cloudflare Workers Static Assets                    |
| API              | Hono on Cloudflare Workers                                                               |
| Database         | Cloudflare D1 (SQLite at the edge), 30-day point-in-time recovery                        |
| Auth             | Clerk drop-in widget on `clerk.ptowl.com` (Email + Google), JWT via JWKS                 |
| Email — outbound | TBD (Phase 9; MailChannels / Resend candidate). See [BUILD.md](./docs/BUILD.md)          |
| Email — inbound  | Cloudflare Email Routing                                                                 |
| Calendar         | `rrule` + `ical-generator`                                                               |
| Storage (logos)  | Cloudflare R2                                                                            |
| Edge security    | TLS 1.3 + HSTS + strict CSP, WAF + Bot Fight Mode + Rate Limiting via `cf-bootstrap.yml` |

Full architecture, data model, migration history, and binding details:
[docs/BUILD.md](./docs/BUILD.md).

## Repo layout

```
.
├── apps/
│   ├── api/        # Cloudflare Worker — Hono routes, D1 queries
│   └── web/        # React + Vite, deployed as Cloudflare Workers Static Assets
├── packages/
│   └── shared/     # Zod schemas, RRule presets, shared types, default templates
├── docs/           # VISION, BUILD, SHIP, RUN
└── .github/        # CI, Deploy, Cloudflare bootstrap workflows
```

## Quickstart (local dev)

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
```

```bash
# API worker (uses local D1)
pnpm dev:api

# Web app
pnpm dev:web
```

Full contributor onboarding: [CONTRIBUTING.md](./CONTRIBUTING.md).

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Conventional Commits are
required and enforced via `commitlint` in CI.

## Security

See [SECURITY.md](./SECURITY.md) for vulnerability reporting via GitHub
Security Advisories. Open security findings tracked in
[docs/RUN.md](./docs/RUN.md) under "Security findings — open."

## License

[GNU Affero General Public License v3.0](./LICENSE). Free to use, study,
modify, and redistribute. The Affero clause requires anyone running a
modified version as a network service to make their changes available to
their users. If AGPL doesn't fit your situation, open a GitHub issue and
we can discuss a separate commercial license.
