# Security Policy

## Reporting a Vulnerability

If you believe you have found a security vulnerability in PtOwl, please report it
**privately** using GitHub's Security Advisories:

> https://github.com/yami566/ptowl/security/advisories/new

Please include:

- A description of the issue and the impact
- Steps to reproduce (PoC or exploit code if applicable)
- Affected versions / commit hashes
- Any suggested mitigation

Do **not** open a public GitHub issue, post on social media, or email a third
party until we have published a fix or coordinated disclosure with you.

## Response Targets

- Acknowledge receipt within **3 business days**
- Initial triage and severity assessment within **7 days**
- Coordinated disclosure timeline communicated with the reporter

## Supported Versions

The latest release on `main` is the only supported version. Older tags receive
no security backports.

## Scope

In scope:

- The PtOwl web app (`apps/web`)
- The PtOwl API worker (`apps/api`)
- Shared libraries (`packages/shared`)
- Build, deploy, and CI configuration in this repository

Out of scope:

- Third-party services we depend on (Cloudflare, Clerk, etc.) — please
  report directly to those vendors.
- Issues that require physical access to a user's device or local network.
