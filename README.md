# PTowl — Patience Trainer

Recurring patient scheduling on Cloudflare for medical, dental, and therapy
providers. **PT in PTowl stands for "Patience Trainer."** Clinic staff create
schedules in 5 keypresses, patients get reminders and an `.ics` calendar feed,
and the sports-alias system keeps real names off our servers as a privacy
failsafe (we are explicitly NOT a HIPAA-secure system).

[![CI](https://github.com/yami566/ptowl/actions/workflows/ci.yml/badge.svg)](https://github.com/yami566/ptowl/actions/workflows/ci.yml)
[![Deploy](https://github.com/yami566/ptowl/actions/workflows/deploy.yml/badge.svg)](https://github.com/yami566/ptowl/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

## Stack

| Layer            | Tech                                                              |
| ---------------- | ----------------------------------------------------------------- |
| Frontend         | React 19 + Vite, Cloudflare Pages, Capacitor (iOS/Android shells) |
| API              | Hono on Cloudflare Workers                                        |
| Database         | Cloudflare D1 (SQLite) with 30-day point-in-time recovery         |
| Auth             | FirebaseUI multi-provider (Google, Apple, email magic link, SMS)  |
| Email — outbound | Resend                                                            |
| Email — inbound  | Cloudflare Email Routing                                          |
| Calendar         | `rrule` + `ical-generator`                                        |
| Storage (logos)  | Cloudflare R2                                                     |

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

[MIT](./LICENSE)
