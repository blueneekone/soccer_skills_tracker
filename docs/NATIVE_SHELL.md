# Native shell — Capacitor 6 (iOS / Android)

**Status:** MVP shell checked in · **App Store / Play Store submission deferred to acquirer**

SSTracker ships a **Capacitor 6** wrapper around production [`https://sstracker.app`](https://sstracker.app). The native binary is a full-screen WebView with parent-first routing — guardians cold-start on `/parent/household`, not the marketing landing or player dashboard.

## What is in repo

| Path | Purpose |
|------|---------|
| `capacitor.config.ts` | App id `app.sstracker.parent`, remote server URL, splash/status bar |
| `ios/` | Xcode project (generated via `cap add ios`) |
| `android/` | Android Studio project (generated via `cap add android`) |
| `src/lib/native/nativeShell.ts` | Parent-first route constants + Capacitor detection |
| `src/lib/components/native/NativeShellRedirect.svelte` | In-app pivot from `/` or `/login` when running natively |

## Parent-first default route

1. **Cold start (Capacitor):** `server.url` is `https://sstracker.app/parent/household`.
2. **In-app:** `NativeShellRedirect` sends unauthenticated users to `/login?redirect=%2Fparent%2Fhousehold` and authenticated users to `/parent/household`.

This matches the household-gated comms model documented in [`docs/PERSONA_ECOSYSTEM.md`](PERSONA_ECOSYSTEM.md) — parents are the primary mobile persona for club logistics, RSVP, payments, and VPC.

## Prerequisites (acquirer)

- **Node.js** 20+ and npm (same as web app)
- **Xcode** 15+ (macOS) for iOS builds
- **Android Studio** Hedgehog+ with SDK 34 for Android builds
- Apple Developer + Google Play Console accounts (**not configured in this repo**)

## Build workflow

```bash
npm ci
npm run build          # produces static assets in build/ (required for cap sync)
npm run cap:sync       # copies web assets + refreshes native projects
npm run cap:ios        # opens Xcode
npm run cap:android    # opens Android Studio
```

Shortcut:

```bash
npm run native:prepare   # build + cap sync
```

### Remote wrap (default — production QA)

`capacitor.config.ts` points the WebView at live production:

```ts
server: {
  url: 'https://sstracker.app/parent/household',
  cleartext: false,
  androidScheme: 'https',
}
```

No redeploy of the web bundle is required for most native smoke tests. Firebase Auth, FCM, and passkeys behave like the installed PWA against production.

### Bundled local QA (optional)

Comment out the `server` block in `capacitor.config.ts`, then:

```bash
npm run native:prepare
npm run cap:ios    # or cap:android
```

The WebView serves files from `build/` — use this when validating a specific web commit before it ships to `sstracker.app`.

## Store submission (acquirer scope)

This overnight slice **does not** include:

- App Store Connect / Google Play listing copy
- Screenshots, privacy nutrition labels, or age ratings
- Production signing certificates or provisioning profiles
- TestFlight / internal testing track uploads

**Handoff checklist for acquirer:**

1. Register bundle id `app.sstracker.parent` (or rename in `capacitor.config.ts` + native projects).
2. Configure push notification entitlements (FCM already wired for parent push — see `parentPushLaunch.test.ts`).
3. Run `npm run native:prepare` on release branch after web deploy.
4. Archive in Xcode / assemble release APK or AAB in Android Studio.
5. Submit through standard store review; link privacy policy at `/privacy` and terms at `/terms`.

## Verify (CI / agent slice)

```bash
npm test -- src/lib/native/__tests__/nativeShellLaunch.test.ts
npm run check
npm run build
```

## Architecture notes

- **No custom native UI** — Capacitor WebView only; all product UX remains SvelteKit.
- **No avatar / PNG layer work** — launch portrait bar uses existing SVG + initials (see `.cursor/rules/avatar-builder-deferred.mdc`).
- **Coach / player routes** remain reachable via in-app navigation after login; the shell default favors parents, not a hard role lock.

## Related docs

- [`docs/acquisition/NOTABLE_GAPS.md`](acquisition/NOTABLE_GAPS.md) — native binaries in scope; store submission = acquirer
- [`docs/PHONE_VERIFICATION.md`](PHONE_VERIFICATION.md) — phone OTP works in mobile Chrome; native shell uses same web flows
- [`docs/FUNCTIONS_DEPLOY.md`](FUNCTIONS_DEPLOY.md) — backend deploy before native QA against fresh APIs
