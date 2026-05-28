# Portrait reference sources — download provenance

**Sprint 3.5m-ref** · Mood-board images in [`images/`](./images/) · Authority: [`PORTRAIT_REFERENCE_BOARD.md`](./PORTRAIT_REFERENCE_BOARD.md)

> Style/tone references only. Shipping `static/portrait/*.svg` must be **original** drawings — no traced Bethesda, Hasbro, UPA character, or Monopoly mascot linework.

| File | Source URL | License / note | What to borrow | Do not copy |
|------|------------|----------------|----------------|-------------|
| `vault-boy-tone.jpg` | https://fallout.fandom.com/wiki/File:Art-vault_boy_gambler.jpg · CDN: https://static.wikia.nocookie.net/fallout/images/7/71/Art-vault_boy_gambler.jpg/revision/latest | Fan wiki / Bethesda franchise — **internal mood board only**; not redistributed as product art | Bust cohesion, bold outline, 1950s mascot attitude, jumpsuit bust crop | Trace face, hair, pose, or vault suit into catalog SVGs |
| `vault-girl-tone.jpg` | https://fallout.fandom.com/wiki/File:ActionBoyGirl.png · CDN: https://static.wikia.nocookie.net/fallout/images/c/c6/ActionBoyGirl.png/revision/latest | Same as Vault Boy — wiki reference frame | Feminine teen athlete cartoon tone for girls roster | Same |
| `bert-turtle-duck-and-cover.jpg` | https://archive.org/details/DuckandC1951 · extracted ~00:00:08 from https://archive.org/download/DuckandC1951/DuckandC1951.mpeg | **Public domain** (US civil defense film, 1951) | 1950s instructional cartoon simplicity (Vault Boy lineage); flat shapes, friendly outline | Trace Bert silhouette or shell into operative portraits |
| `upa-cartoon-tone.jpg` | https://commons.wikimedia.org/wiki/File:United_Productions_of_America_logo_(1950s).jpg · https://upload.wikimedia.org/wikipedia/commons/0/08/United_Productions_of_America_logo_%281950s%29.jpg | Commons — check file page for attribution; logo reference | Flat graphic UPA-era shapes, clean lines, mid-century modern cartoon industry tone | Trace UPA character or logo into catalog SVGs |
| `monopoly-pennybags-tone.jpg` | https://commons.wikimedia.org/wiki/File:US_Deluxe_Monopoly_Tokens_(detail_Rich_Uncle_Pennybags).jpg · https://upload.wikimedia.org/wikipedia/commons/c/ca/US_Deluxe_Monopoly_Tokens_%28detail_Rich_Uncle_Pennybags%29.jpg | Commons — Hasbro/Monopoly trademark; **tone board only** | Round friendly cartoon face, bold ink, approachable mascot read | Trace Monopoly man face, hat, or cane into operative SVGs |
| `teen-comic-tone.jpg` | https://commons.wikimedia.org/wiki/File:Sis001.jpg · https://upload.wikimedia.org/wikipedia/commons/e/e5/Sis001.jpg | Commons — verify PD tag on file page before external reuse | Teen human cartoon proportions, period comic ink | Copy linework verbatim |
| `phoenix-palette.png` | Copied from [`static/Images/Phoenixes_Logo_2026.png`](../../../static/Images/Phoenixes_Logo_2026.png) (resized 480px wide via ffmpeg) | SSTracker club asset — palette reference only | Navy, warm gold, skin-adjacent warm neutrals for kit/trim | Mascot head, flame hair, or Sparky proportions as operative **face** |

## Manual fallback (if CDN blocks bots)

| File | Fallback |
|------|----------|
| `vault-boy-tone.jpg` / `vault-girl-tone.jpg` | Export a bust still from Fallout Wiki image pages above; save into `images/` with same filename |
| `bert-turtle-duck-and-cover.jpg` | Download `DuckandC1951.mpeg` from Internet Archive; screenshot one clear Bert frame at ~8s |
| `upa-cartoon-tone.jpg` | Download Commons UPA logo URL above, or a PD Gerald McBoing-Boing still from Archive if logo is insufficient |
| `monopoly-pennybags-tone.jpg` | Download Commons token detail URL above |
| `teen-comic-tone.jpg` | Download `Sis001.jpg` from Commons URL above |
| `phoenix-palette.png` | Copy `static/Images/Phoenixes_Logo_2026.png`; resize to ≤500KB |

## Pip-Boy vs Vault Boy (terminology)

- **Pip-Boy** = wrist-mounted UI device in Fallout fiction — **not** the portrait mascot target.
- **Vault Boy / Vault Girl** = cartoon propaganda mascot **tone** target for operative bust cohesion (structure only).
