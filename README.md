# PtOwl

Recurring physical-therapy scheduling on Cloudflare. Patients book a recurring
slot, get reminders, and export an `.ics` calendar feed; PT staff manage
approvals from an admin dashboard protected by Cloudflare Access.

[![CI](https://github.com/yami566/ptowl/actions/workflows/ci.yml/badge.svg)](https://github.com/yami566/ptowl/actions/workflows/ci.yml)
[![CodeQL](https://github.com/yami566/ptowl/actions/workflows/codeql.yml/badge.svg)](https://github.com/yami566/ptowl/actions/workflows/codeql.yml)
[![Deploy](https://github.com/yami566/ptowl/actions/workflows/deploy.yml/badge.svg)](https://github.com/yami566/ptowl/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

## Stack

| Layer            | Tech                                                              |
| ---------------- | ----------------------------------------------------------------- |
| Frontend         | React 19 + Vite, Cloudflare Pages, Capacitor (iOS/Android shells) |
| API              | Hono on Cloudflare Workers                                        |
| Database         | Cloudflare D1 (SQLite) with 30-day point-in-time recovery         |
| Auth — patients  | Firebase Phone Auth                                               |
| Auth — admins    | Cloudflare Access (Zero Trust)                                    |
| Email — outbound | Resend                                                            |
| Email — inbound  | Cloudflare Email Routing                                          |
| Calendar         | `rrule` + `ical-generator`                                        |
| Storage (logos)  | Cloudflare R2                                                     |
| Live chat        | Tawk.to                                                           |

## Repo layout

```
.
├── apps/
│   ├── api/        # Cloudflare Worker — Hono routes, D1 queries
│   └── web/        # React + Vite + Capacitor shell
├── packages/
│   └── shared/     # Zod schemas, RRule presets, shared types
├── docs/           # PRD, TDD, sprint history, runbooks
└── .github/        # CI, CodeQL, Dependabot, release-please
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
