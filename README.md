# GTSC Bus Booking — sandbox starter

Public-bus booking concept for Gambia Transport Service Company (GTSC), built with Next.js for Vercel.

**Status:** Development scaffold only. This repository does NOT process payments, issue valid tickets, or advertise verified real-time GTSC services. Source route choices reflect a historical GTSC trip guide and must be approved before public use.

## Setup
1. Deploy the repository as a Next.js Vercel project (Node 22+).
2. Create a managed PostgreSQL database and execute `schema.sql`.
3. In Vercel project settings, set `DATABASE_URL` as a sensitive server-side environment variable. Do not prefix secrets with `NEXT_PUBLIC_`.
4. Set `BOOKINGS_ENABLED=false` until approved schedules/fares, abuse controls and payment reconciliation are in place.
5. Add sandbox Modem Pay merchant credentials securely through Vercel. Never commit credentials, print them in logs, or paste them into chat.
6. Checkout and webhook endpoints intentionally return HTTP 503 until the exact provider contract, signature algorithm, and event replay/idempotency rules are verified.

`/api/health` is a non-sensitive health endpoint. `/demo` is a locally simulated public-bus journey and seat-selection interface. It has **no live inventory or checkout**.

## Production readiness checklist
- GTSC-authorized schedules, fares and capacities
- PostgreSQL database migration and seeded verified trips
- Rate limits, bot protection and abuse monitoring for seat holds
- Transactional inventory checks, hold expiration, unique confirmed seats
- Authenticated staff dashboard and audit logs
- Modem Pay sandbox hosted-checkout API calls on the server
- Verified signed webhooks with idempotency, amount/currency matching and reconciliation
- QR tickets only after independently verified successful payment
- Privacy, retention, refund and cancellation rules; automated tests

This is an independent prototype and must not be presented as official GTSC ticketing without company authorization.