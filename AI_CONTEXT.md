# KoreaGoldMarket AI development context

Read this file before modifying the project.

## Source of truth

- Repository: youngho785/goldmarket
- Stable recovery commit: b5c6a68
- Stable recovery tag: kgm-stable-20260920
- Firebase project: goldmarket-0
- Functions region: asia-northeast3
- Android package: com.koreagoldmarket.app
- A newer source explicitly provided by the user becomes the new source of truth.
- Never prefer old chat snippets, remembered code, or assumptions over the current source.

## Product definition

KoreaGoldMarket is currently centered on:

- Gold price
- MY GOLD
- GOLD TO GOLD / gold exchange
- Visit reservation
- Exchange history
- Member/profile
- Inquiries and reviews
- Admin operations
- Notifications
- Android app

Used-goods / marketplace features are not part of the current operating scope.

### MY GOLD

MY GOLD is a personal record feature.

- Users record gold they physically own.
- KoreaGoldMarket does not hold, custody, deposit, or store physical gold through MY GOLD.
- MY GOLD values and pure-gold estimates are reference values based on user-entered information.
- Actual GOLD TO GOLD conditions are confirmed after physical inspection and measurement at the store.

Do not redesign MY GOLD as a custody, deposit, wallet, or stored-asset service.

## Git working policy

- Do not modify main directly.
- Start from clean main and create a task branch.
- Keep main as the known-good recovery branch.
- Stable recovery baseline: b5c6a68 / kgm-stable-20260920.

Typical start:

    Set-Location C:\goldmarket
    git switch main
    git pull --ff-only origin main
    git status --short
    git switch -c fix/example

## Diagnose before patching

Do not modify code immediately after seeing an issue.

First distinguish whether the cause is:

- Product/service bug
- Test bug
- Fixture problem
- Local environment problem
- Android/WebView problem
- Firebase configuration problem
- Deployment problem

Patch only after the cause has been narrowed down.

Prefer small, reversible changes over broad rewrites.

Do not refactor working code merely because a file is large or another structure looks cleaner.

## Required regression protections

### Profile photo upload

- Profile photo upload currently uses uploadBytes.
- Do not revert it to uploadBytesResumable.

### Reservation phone behavior

- Signup does not require a phone number.
- The first gold-exchange reservation asks for a phone number.
- If the profile phone is empty, the reservation phone may be saved to the profile.
- If the profile already contains a phone number, a different reservation phone must not overwrite it.
- Korean mobile numbers stored in the profile are normalized as 010-XXXX-XXXX.

### MY GOLD mobile behavior

- Bottom navigation must not cover MY GOLD modal inputs.
- Android content must not overlap the status bar.
- Preserve verified mobile layout behavior unless intentionally changing it.

### App Check

- Production App Check enforcement is intentionally not enabled yet.
- Do not enable it until Android Play Integrity/native verification and rollout readiness are confirmed.

### FCM

Do not claim the following are fully verified until real-device verification is completed:

- Actual push receipt
- Notification tap routing
- Push behavior while the app is terminated
- Native Play Integrity / App Check verification

Do not add new notification complexity before these core behaviors are verified.

## Testing policy

The old tests/e2e structure was intentionally removed.

Do not recreate tests/e2e.

Default verification order:

1. lint
2. build
3. release gate
4. smoke test for the changed area
5. real Android verification only when needed

Primary commands:

    npm run lint
    npm run build
    npm run test:release

Browser-facing smoke when relevant:

    npm run test:smoke

Mobile-web smoke when relevant:

    npm run test:mobile

Do not run large or repetitive test suites without a reason.

## Production-data safety

Localhost may still use real Firebase configuration.

Do not casually create, mutate, or delete production:

- Members
- Reservations
- MY GOLD records
- Exchange records
- Notifications
- Admin data

Use emulators, isolated test helpers, or specifically approved test workflows where appropriate.

## Deployment policy

- Never deploy before relevant tests pass.
- Never automatically deploy production without explicit user confirmation.
- Deploy only the target that actually changed.

Frontend only:

    firebase deploy --only hosting --project goldmarket-0

Functions only:

    firebase deploy --only functions --project goldmarket-0

Firestore Rules only:

    firebase deploy --only firestore:rules --project goldmarket-0

Storage Rules only:

    firebase deploy --only storage --project goldmarket-0

Do not deploy Functions or Rules when they were not changed.

## Android workflow

When Android reflection is required:

    Set-Location C:\goldmarket
    npm run android:prepare

    Set-Location C:\goldmarket\android
    .\gradlew.bat assembleDebug

Debug APK:

    C:\goldmarket\android\app\build\outputs\apk\debug\app-debug.apk

Install while preserving app data/session:

    $adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
    $apk = "C:\goldmarket\android\app\build\outputs\apk\debug\app-debug.apk"
    & $adb install -r -t $apk

Do not uninstall the app without a specific reason.

## Patch policy

Prefer patch packages containing:

- APPLY.ps1
- README.txt
- payload/

Where practical APPLY.ps1 should:

- Verify the expected original-file hash
- Stop if the baseline does not match
- Back up the original automatically
- Replace only required files
- Print a clear completion result

Do not force-overwrite a mismatched baseline.

Keep Windows PowerShell 5.1 patch scripts ASCII-only.

Do not use exit inside patch scripts.

## Operational monitoring

Use the provider-neutral monitoring layer under src/monitoring.

Do not intentionally log:

- UID
- Name
- Email
- Phone
- Address
- Auth tokens
- App Check tokens
- FCM tokens
- Gold holdings
- Reservation notes
- Inquiry text
- URL query/hash values

Monitoring is diagnostic, not a reason to collect additional personal data.

## Dependency safety

Never use:

    npm audit fix --force

Do not add dependency overrides or broad upgrades without a specific verified reason.

## Local files intentionally excluded from Git

Do not add these back:

- test-results/
- test-system-backup/
- CURRENT_STATE_MANIFEST.txt
- KGM_TEST_REDESIGN_PHASE1_NOTES.md
- scripts/run-full-integration-test.ps1

## Core rule

Preserve the known-good operating service.

Understand the current implementation first, make the smallest justified change, verify the affected area, and deploy only what actually changed.
