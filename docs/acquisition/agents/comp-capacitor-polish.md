# Agent — comp-capacitor-polish (WAVE 4C optional)

**Slice ID:** comp-capacitor-polish  
**Branch:** `competitive/comp-capacitor-polish`

**Owns:**
- `docs/NATIVE_SHELL.md`
- `capacitor.config.ts`
- `src/lib/shell/**` (parent-first routing only)

## Task

Deep link handling + push token registration path documented and tested on Capacitor WebView. Store submission remains Rejected (R-02).

## AutomatedVerify

```bash
npm test -- src/lib/__tests__/nativeShellLaunch.test.ts
```

## ManualQaId

QA-209

---

Universal rules: Unattended overnight — do not ask questions. Append SLICE_LOG only. Each commit: npm test (slice), npm run check, npm run build. Permanent rejects R-01–R-03. Manual testing = OWNER_QA_CHECKLIST only.
