# Contributing to PtOwl

Thanks for taking the time to contribute. This guide covers the local
development workflow and the conventions enforced by CI.

## Prerequisites

- Node.js >= 20
- pnpm 9 (`corepack enable && corepack prepare pnpm@9 --activate`)
- A Cloudflare account (only needed for deploys, not for local dev)

## Setup

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
```

## Running locally

```bash
# API worker (Cloudflare Workers, local with D1 persistence)
pnpm dev:api

# Web app (Vite dev server)
pnpm dev:web
```

## Branching

- Branch from `main` using a descriptive name: `feat/<topic>`, `fix/<topic>`, `chore/<topic>`.
- Open a PR against `main`.

## Commit style

We use [Conventional Commits](https://www.conventionalcommits.org/). The commit
type drives automated semver bumps via release-please.

Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`,
`build`, `ci`, `chore`, `revert`.

```
feat(api): add ICS export endpoint
fix(web): correct timezone offset on schedule preview
docs: clarify deploy steps in README
```

`commitlint` runs on every PR via CI and blocks merges with non-compliant
commit messages.

## Pull request checklist

- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes
- [ ] `pnpm build` passes
- [ ] PR title follows Conventional Commits
- [ ] PR description fills out **Summary**, **Test Plan**, **Risk** sections
- [ ] Linked any relevant issues

## Reporting security issues

Please follow the process in [SECURITY.md](./SECURITY.md). Do **not** open a
public issue for vulnerabilities.

## Code of conduct

Be kind. Be specific. Assume good intent. We follow the
[Contributor Covenant](https://www.contributor-covenant.org/version/2/1/code_of_conduct/).
