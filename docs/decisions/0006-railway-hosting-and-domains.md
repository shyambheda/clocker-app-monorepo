# 0006: Railway hosting (Singapore) and getclocker.app domain layout

- Status: Accepted (Phase 0)

## Context

We need simple container hosting with GitHub deploys, close to the Neon database.

## Decision

Railway, region Southeast Asia (Singapore). Services: `api`, `worker`, `web`, `admin`, `redis`, all from this
repo with config-as-code and watch paths. Domains: `app.`, `admin.`, `api.getclocker.app`. Org subdomains
(`<slug>.getclocker.app`) later. Email sends from `mail.getclocker.app`.

## Consequences

- Same-site subdomains allow first-party, SameSite cookies. `.app` is HSTS-preloaded (HTTPS-only).
- Each service redeploys only when its code changes. CI gating comes in Phase 6.
- The sending subdomain protects the root domain's email reputation.
