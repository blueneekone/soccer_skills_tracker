# Sprint 2.22 slice 4f — Armory command deck visual reference

Above-the-fold **Armory command deck** (loadout · album · next action) replaces the empty quartermaster void after slice 4b removed the pathway block.

## Screenshots

| File | Viewport | State | Pass criteria |
|------|----------|-------|---------------|
| `armory-1280-command-deck-quartermaster.png` | 1280×900 | Armory default | Command deck above store cards; no pathway |
| `armory-1280-command-deck-studio-tab.png` | 1280×900 | Studio tab | Deck still visible; studio loads below |
| `armory-1280-quartermaster-grid-density.png` | 1280×900 | Quartermaster | 2-up card grid; less vertical void |
| `armory-390-command-deck.png` | 390×844 | Armory mobile | 3 deck cells stack readably |
| `hq-1280-pathway-regression.png` | 1280×900 | HQ | Pathway still owned by HQ (sanity) |

## Re-capture (Playwright)

Requires auth (`E2E_STORAGE_STATE` or `E2E_PLAYER_CALLSIGN` + `E2E_PLAYER_OTP`):

```bash
npx playwright test e2e/player-armory-slice-4f.visual.spec.ts
```

Screenshots overwrite files in this directory.

## Manual QA sign-off (slice 4f)

- [ ] Armory landing has command deck above store cards
- [ ] Open studio link → `?tab=studio`
- [ ] View album link → `?tab=album`
- [ ] No pathway section on Armory
- [ ] Quartermaster cards denser / less empty void
- [ ] Studio, Album, Ceremonies tabs still work
- [ ] Screenshots present in this directory
