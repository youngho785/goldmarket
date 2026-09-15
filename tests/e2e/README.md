# Minimal Playwright E2E

This suite is intentionally small. It protects only high-value browser flows and does not write production data.

First setup on a PC:

```powershell
npm run test:e2e:setup
```

Normal local check (starts Vite automatically):

```powershell
npm run test:e2e
```

Watch the browser only when debugging:

```powershell
npm run test:e2e:headed
```

Optional read-only check against the deployed site:

```powershell
$env:E2E_BASE_URL = "https://www.koreagoldmarket.com"
npm run test:e2e
Remove-Item Env:E2E_BASE_URL
```

Keep this suite small. Add a test only for an important user flow or a real regression that should never return.
Do not create real reservations, modify member data, or perform admin writes against production from E2E.
