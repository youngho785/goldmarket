# KoreaGoldMarket operational monitoring

This document defines the long-term monitoring contract for KoreaGoldMarket.
The application should call the provider-neutral monitoring layer instead of
writing vendor-specific monitoring calls throughout product pages.

## Phase 1 foundation

The production client captures these high-value failure classes:

- React ErrorBoundary failures
- React Router error-element failures
- unhandled browser errors and promise rejections
- Vite lazy-chunk/preload failures, including the existing one-time reload recovery

Events pass through `src/monitoring/operationalMonitoring.js` and the strict
privacy allowlist in `src/monitoring/privacy.js`. The first transport writes a
small structured event to Cloud Logging through the `reportClientError` callable.
The callable never writes monitoring events to Firestore.

## Privacy contract

Monitoring is diagnostic, not analytics. Do not add arbitrary page state or
user objects to monitoring events.

Never intentionally send:

- name, email, phone, address, nickname, or user UID
- Firebase ID tokens, App Check tokens, FCM tokens, passwords, or action codes
- gold holdings, reservation notes, inquiry text, or form contents
- URL query strings or hashes

The client and server both redact common credential and contact patterns. The
server records only `authenticated: true/false`, not the account identifier.

## Event envelope v1

The stable top-level fields are:

- `schemaVersion`
- `eventId`
- `occurredAt`
- `release`
- `environment`
- `route` (pathname only)
- `platform`
- `deviceClass`
- `online`
- `error` (`name`, redacted `message`, redacted `stack`)
- `context` (`source`, allowlisted `area`, `action`, `level`, `recovered`)

Cloud Logging stores these under `jsonPayload.kgmMonitoring`.

## Noise and cost controls

The browser deduplicates identical errors for 30 seconds, caps normal delivery
at 6 events per minute and 30 events per page session, and stores at most three
pending events in session storage for recovery after a reload/offline period.
The callable also rate-limits per ephemeral client address bucket and uses a
small max-instance cap. Raw IP addresses are not logged.

## Release identity

Vite injects the resolved release into `import.meta.env.VITE_KGM_RELEASE`. A deployment can explicitly set `KGM_RELEASE`.
If it is not set and Git is available, the short Git commit becomes the release.
A source ZIP without `.git` falls back to `kgm-web@local` for local verification.

For an intentional release name in PowerShell:

```powershell
$env:KGM_RELEASE = "kgm-web@2026.09.16.1"
npm run build
```

Use the same release identifier later for source-map uploads.

## Sentry provider roadmap

The monitoring core deliberately does not depend on Sentry. A Sentry transport
will be added behind the same interface after the Sentry organization/project
and deployment secrets are created. Product pages must not import Sentry
packages directly. This keeps the application portable if the monitoring vendor
changes during the platform's lifetime.

The Sentry phase should add:

- `@sentry/react` runtime transport
- `@sentry/vite-plugin` build-time source-map upload
- source maps generated only when upload credentials are available and deleted
  from deployable output after upload
- release/environment alignment with `VITE_KGM_RELEASE`
- `sendDefaultPii: false` and a second `beforeSend` privacy boundary
- no Session Replay until a separate privacy review explicitly approves it

## Operations

Useful Firebase CLI command:

```powershell
firebase functions:log --only reportClientError
```

In Google Cloud Logs Explorer, filter the function and
`jsonPayload.kgmMonitoring.eventType="client_error"`. Logs-based metrics and
alerts should be created only after a short production observation period so
thresholds are based on real traffic instead of guesses.
