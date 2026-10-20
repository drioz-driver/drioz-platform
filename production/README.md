# DRIOZ production migration

Status: production architecture source under development, NOT a production-ready service. The published Sites page is still a separate browser-local design preview. No live infrastructure or payment accounts have been created.

## Implemented source

- Separate NestJS API and PostgreSQL migration, with six city records disabled by default until launch configuration is approved.
- OIDC bearer-token verification against issuer, audience and JWKS; database-owned roles and disabled-user enforcement. Provision identity subjects into `users` through a trusted operator process; no public admin registration.
- Customer-scoped booking reads, validated input, server-calculated initial quotes and customer-scoped idempotency.
- Approved/online driver checks, city matching, transactional assignment and a database constraint preventing two active assignments per driver.
- Trip transition rules, customer-owned start-code issuance, hashed short-lived codes, five-attempt lockout, atomic code consumption, audit log and transactional outbox.
- Next.js customer interface, OIDC sign-in configuration and same-origin API proxy. Access tokens remain on the server; customer, partner and admin data are read from the API. Basic role-specific views exist; full operations and partner workspaces remain unfinished.

## Run locally

Use Node 22+. From this directory run `npm install`, configure the API environment using `apps/api/.env.example`, start PostgreSQL/Redis, run `npm run migrate -w @drioz/api`, then `npm run dev:api`.

Use a trusted OIDC provider with API access tokens, not ID tokens. The database role assigned to the issuer/subject is authoritative. HTTPS and an ingress rate limiter are required. Do not open a city for public bookings until service zones, pricing, driver onboarding and support are operational.

## Still required before launch

Complete customer/admin and partner workflows; driver/mobile apps; provider login configuration and onboarding; Redis-backed dispatch/outbox workers; geographic service-zone enforcement; maps and consent-based live location; notification delivery; payments/refunds/reconciliation; incident escalation; pagination; structured logs; monitoring; backups; deployment secrets; dependency lockfile and security review; integration, concurrency and load tests.

## Verification on 19 October 2026

Dependencies installed successfully and package-lock.json is committed. API and web TypeScript checks pass. Next.js production compilation and API compilation are now exercised; see the latest handoff for final build results. PostgreSQL, OIDC, live SMS, maps and payments are not provisioned in this environment, so authenticated end-to-end and load testing remain pending.

## Added operations workflows

Driver profiles can request onboarding in one of six cities; admins can approve independently verified profiles, revoke approval when no active trip exists, and assign an approved online driver in the same city. Drivers can toggle availability, confirm arrival, enter the customer's short-lived trip-start code, and complete a trip. Customers can generate their start code after assignment. These controls use the authenticated API and do not substitute local demo data.

## Deployment

Build from this directory with `docker build -f apps/api/Dockerfile -t drioz-api .` and `docker build -f apps/web/Dockerfile -t drioz-web .`. Run API migrations as a one-off deployment task using `npm run migrate -w @drioz/api` from the API image. Configure the two environment examples through the hosting secret manager. Expose services behind HTTPS ingress with request limits. Keep PostgreSQL and Redis private. The existing Sites URL remains the separate design demo; these containers have not been deployed there.
