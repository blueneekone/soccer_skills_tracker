# Slice log (append-only)

Agents append entries below. Do not edit prior rows.

---

## 2026-06-13 — Agent 17 native-shell (`overnight/native-shell`)

**Slice:** Capacitor 6 wrap of `sstracker.app` with parent-first default route.

**Shipped:**
- `capacitor.config.ts` — remote WebView `https://sstracker.app/parent/household`, app id `app.sstracker.parent`
- `ios/`, `android/` — Capacitor 6 native projects (`cap add` + sync)
- `src/lib/native/nativeShell.ts` — parent-first route constants + Capacitor detection
- `src/lib/components/native/NativeShellRedirect.svelte` — in-app pivot from `/` and `/login`
- `docs/NATIVE_SHELL.md` — acquirer build handoff (store submission out of scope)
- `src/lib/native/__tests__/nativeShellLaunch.test.ts` — 6 guards

**Verify:**
```bash
npm test -- src/lib/native/__tests__/nativeShellLaunch.test.ts  # 6 passed
npm run check  # 391 errors (pre-existing)
npm run build   # ok
```

**Deferred:** App Store / Play Store submission (acquirer).

