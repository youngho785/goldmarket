# KoreaGoldMarket AI development context

Read this file before modifying the project.

## Working model
- The user normally shares the current `C:\goldmarket` ZIP and asks ChatGPT to make all code changes.
- Always inspect the current ZIP instead of assuming an older project state.
- Prefer small, reversible patches over broad rewrites.

## Required safety checks
- Preserve intended product behavior unless the user explicitly requests a change.
- Preserve the intentional FCM policy: logout does not remove the device push token; a later login can move ownership to the new account.
- Do not enable global App Check enforcement until the Android native provider is ready and rollout readiness is confirmed.
- Keep PowerShell patch scripts ASCII-only for Windows PowerShell 5.1 compatibility.
- Patch packages should use `payload + apply.ps1 + verify.ps1 + restore.ps1`, preflight hashes, automatic backup, and rollback on apply failure.

## Test and deployment workflow
1. Modify the current project locally.
2. Run the existing regression/lint/build/security verification.
3. Run the minimal Playwright E2E suite with `npm run test:e2e` for browser-facing changes.
4. If both pass, continue with other safe changes instead of deploying every small change.
5. Group several verified changes and deploy once.
6. Before deployment, run the full verification again and E2E where relevant.
7. After deployment, do only a short production smoke check.

## E2E policy
- Playwright lives under `tests/e2e` and is intentionally isolated from the production dependency tree.
- Keep E2E small and focused on high-value user journeys and real regressions.
- Prefer accessible roles, labels, visible text, and URLs. Do not change production code only to satisfy tests unless a stable selector is genuinely necessary.
- Local E2E is the default. Production E2E must remain read-only unless a dedicated safe test environment/account exists.
- Never create real reservations, change member data, or perform admin writes against production E2E.

## Refactoring policy
- Do not split files merely to reduce line count.
- Split only when responsibilities become clearer and maintenance becomes safer.
- Keep orchestration code together when splitting it would make one user flow harder to follow.
