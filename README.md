# PTowl — Patience Trainer

Recurring patient scheduling on Cloudflare for medical, dental, and therapy
providers. **PT in PTowl stands for "Patience Trainer."** Clinic staff create
schedules in 5 keypresses, patients get reminders and an `.ics` calendar feed,
and the sports-alias system keeps real names off our servers as a privacy
failsafe (we are explicitly NOT a HIPAA-secure system).

[![CI](https://github.com/yami566/ptowl/actions/workflows/ci.yml/badge.svg)](https://github.com/yami566/ptowl/actions/workflows/ci.yml)
[![Deploy](https://github.com/yami566/ptowl/actions/workflows/deploy.yml/badge.svg)](https://github.com/yami566/ptowl/actions/workflows/deploy.yml)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](./LICENSE)

## Run your own PTowl

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/Yami566/ptowl)

One-click fork-and-deploy via Cloudflare. Free tier covers ~10,000
monthly active users on the Cloudflare and Clerk side. Full
self-host walkthrough in [docs/HOW-TO-DEPLOY.md](./docs/HOW-TO-DEPLOY.md).

## Stack

| Layer            | Tech                                                               |
| ---------------- | ------------------------------------------------------------------ |
| Frontend         | React 19 + Vite + React Router 7, Cloudflare Workers Static Assets |
| API              | Hono on Cloudflare Workers                                         |
| Database         | Cloudflare D1 (SQLite) with 30-day point-in-time recovery          |
| Auth             | Clerk drop-in widget (Email + Google), JWT verified via JWKS       |
| Email — outbound | TBD (Resend candidate; see docs/AUTOMATION-PLAN.md)                |
| Email — inbound  | Cloudflare Email Routing                                           |
| Calendar         | `rrule` + `ical-generator`                                         |
| Storage (logos)  | Cloudflare R2                                                      |
| Edge security    | WAF Free Managed Ruleset, Bot Fight Mode, Rate Limiting            |

## Repo layout

```
.
├── apps/
│   ├── api/        # Cloudflare Worker — Hono routes, D1 queries
│   └── web/        # React + Vite + Capacitor shell
├── packages/
│   └── shared/     # Zod schemas, RRule presets, shared types
├── docs/           # PRD, TDD, sprint history, runbooks
└── .github/        # CI, Deploy, Dependabot
```

## Quickstart

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

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) — Conventional Commits are required and
enforced via `commitlint` in CI.

## Security

See [SECURITY.md](./SECURITY.md) for vulnerability reporting via GitHub
Security Advisories.

## License

[GNU Affero General Public License v3.0](./LICENSE).

PTowl is free software: anyone can use, study, modify, and redistribute it.
The "Affero" clause means that if you run a modified version as a network
service (e.g., your own SaaS), you must offer the source of your changes
to your users. This protects PTowl from drive-by SaaS rip-offs while
keeping the code open for community contribution and self-hosting.

If AGPL is incompatible with your needs, open a GitHub issue and we can
talk about a separate commercial license.

## Vision & roadmap

- [docs/PTOWL-NORTH-STAR.md](docs/PTOWL-NORTH-STAR.md) — the long-arc
  vision: open-source default tool for PT/dental schedule generation.
- [docs/AUTOMATION-PLAN.md](docs/AUTOMATION-PLAN.md) — what we automate
  next, in plain English.
- [docs/PRODUCTION-LAUNCH-RUNBOOK.md](docs/PRODUCTION-LAUNCH-RUNBOOK.md) —
  Cloudflare/Clerk/GitHub dashboard hardening checklist.
