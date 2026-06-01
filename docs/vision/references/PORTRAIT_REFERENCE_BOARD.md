# Portrait Reference Board — Primary Agent Authority

**Epic 3.5 · Sprint 3.5m-docs + 3.5m-ref + 3.5m-docs-gemini + 3.6a-ref-organize** · Vault-tone cartoon bust (text) · Avatar Studio sheets · Player OS holo recess

> **Mandatory agent read:** Every portrait frame or ingest sprint (**3.5m-frame** onward) must open this board **before** work. Cite: **Authority: [`PORTRAIT_REFERENCE_BOARD.md`](./PORTRAIT_REFERENCE_BOARD.md)** + [`PORTRAIT_ART_DIRECTION.md`](../PORTRAIT_ART_DIRECTION.md) §1–§2.

**Launch bar (LAUNCH-defer-avatar):** Ship **`defaultPortraitV2` SVG** + **`profileIncomplete` initials** on holo. Character sheets → [`character/`](./character/) (**paused post-launch**). Player holo **chrome** UI refs → [`ui/player/`](./ui/player/). **Do not** wire PNG avatar layers or Avatar Studio until owner unpause.

**Art creation (post-launch):** Owner generates bust PNGs in Google Gemini Pro Art mode — see **[`GEMINI_ART_BRIEF.md`](../GEMINI_ART_BRIEF.md)**. Composer agents ingest from `static/portrait/approved/` only; **never illustrate**. Sprint **3.5m-art** (agent modular SVG redraw) is **superseded** — human VA failed on agent-drawn layers.

**Authority chain:** **This board (visual north star)** → [`PORTRAIT_ART_DIRECTION.md`](../PORTRAIT_ART_DIRECTION.md) (style locks & COPPA) → [`OPERATIVE_ID_CARD.md`](../OPERATIVE_ID_CARD.md) (Z3 art well) → [`OPERATIVE_LOADOUT.md`](../OPERATIVE_LOADOUT.md) (catalog wiring)

**IP boundary:** We borrow **tone and anatomy discipline** from mid-century propaganda cartoon humans (Fallout Vault Boy/Girl *read*), **Bert the Turtle** (*Duck and Cover*, PD), and **UPA-era** flat graphic cartoons — **never** Bethesda, Hasbro, or UPA traced characters in shipping SVGs.

**Terminology:** **Pip-Boy** = wrist UI device in Fallout fiction (out of scope). **Vault Boy / Vault Girl** = cartoon mascot **tone** target for operative busts.

---

## 1. Primary reference — propaganda cartoon bust (Vault tone)

**What to steal (structure only):**

| Trait | Target read | Apply to operative portrait |
|-------|-------------|------------------------------|
| **Anatomy cohesion** | One illustrator drew head, neck, shoulders, and kit as a single bust | Face, hair, and kit layers share outline weight and registration — not detachable stickers |
| **Bust crop** | Shoulders-up, forward or slight 3/4; chin and collar readable at 88px | Crop inside 256×256 master viewBox; no floating head above collar line |
| **Hair as graphic** | Solid cel shapes — bangs, sideburns, ponytail as **flat ink**, not flame or fur simulation | `portrait_hair_*` reads as **human hairstyle graphic**, not mascot element |
| **Line era** | Bold closed paths, one shadow tone, pre-3D | All nine starter catalog parts look like **one matched set** |
| **Attitude** | Confident, encouraging athlete — mastery energy | No dystopian glare; no baby-chibi for teen roster defaults |

**Reject on sight:** Vault Boy thumbs-up pose copy, vault suit costume, pip-boy device, franchise colors as mandatory kit, any Bethesda trademark silhouette.

**Lineage anchors (also see gallery §6):**

- **Bert the Turtle** (*Duck and Cover*, 1951, PD) — instructional cartoon simplicity; flat friendly shapes that inform Vault Boy readability.
- **UPA / Gerald McBoing-Boing era** — flat graphic shapes, clean lines, pre-3D cel (logo/still mood board — not character trace).
- **Phoenix palette** — navy kit, warm skin range, gold trim from club logo ([`static/Images/Phoenixes_Logo_2026.png`](../../../static/Images/Phoenixes_Logo_2026.png)). Sparky mascot = **anti-ref only** ([`mood/ref-mood-sparky-mascot.png`](./mood/ref-mood-sparky-mascot.png) when restored — not operative face).

---

## 2. Secondary reference — Player OS luxury holo (frame, not sticker)

Portrait lives **inside** the TCG art well — recessed in the void, not pasted on the avatar ring.

| Do | Don't |
|----|-------|
| Portrait **recessed IN** Z3 art well (`OperativeIdCardFrame` / `HologramCardShell`) | Portrait as **sticker on ring** — halo cutout, circular mask floating above card |
| Shoulders bleed slightly into well gradient; void-safe transparent SVG edges | Baked gold ring, deck frame, or mission chrome inside portrait SVG |
| Scale for **88px** HQ ring and **128px** Studio holo — same person read at both | Different outline weights per surface; emblem-only crop that drops shoulders |
| One cohesive person at card scale (55–65% card height per [`OPERATIVE_ID_CARD.md`](../OPERATIVE_ID_CARD.md) §4) | Modular parts that only align at 256px master |

**Cross-link:** Material recess grammar — [`PLAYER_OS_FOUNDATION.md`](../PLAYER_OS_FOUNDATION.md) Z1 well + Z3 hero; card zones — [`OPERATIVE_ID_CARD.md`](../OPERATIVE_ID_CARD.md) Z3.

---

## 3. Anti-references (hard reject)

| Anti-pattern | Why it fails human VA |
|--------------|----------------------|
| **Modular sticker stack** | Face, hair, kit look swapped from different games; no shared neck/collar join |
| **Mascot flame hair** | `portrait_hair_default` reads as Phoenix mascot, not human teen hair |
| **Floating head** | Jaw with no neck; ears as side ellipses at eye height; head hovers above collar |
| **Semi-real skin** | Plastic gradients, realistic iris, photo-reference pores — breaks cel family + COPPA tone |
| **Phoenix-as-face** | Sparky proportions, spherical flame head, mascot limbs on operative bust |
| **Detached Bitmoji stickers** | 3D shading, Meta proportions, parts that do not share one outline family |
| **Bauhaus v1 geometry** | Abstract generator aesthetic — retired (**3.5h**) |

Phase 2 (**3.5l-gate**) shipped automated regression green; **product owner rejected visual** — those failures match the anti-column above. Automated tests ≠ human VA.

---

## 4. Human acceptance checklist (3.5m-gate)

Use at **3.5m-gate** after **3.5m-frame**, **3.5m-art**, and **3.5m-hair** — full `playerLoadoutSprint35*` regression **plus** product owner sign-off.

### Squint tests (required)

- [ ] **Would a parent show this to a 13yo?** — Teen default roster is encouraging, athletic, COPPA-safe; no dystopian/aggressive face; no infantilizing chibi for teens.
- [ ] **Would a player want the next unlock?** — Default bust beats Bauhaus stub / grey placeholder; unlock hair and kit feel like progression, not punishment.

### Cohesion tests (required)

- [ ] **One person** at 88px HQ ring and 128px Studio holo (same illustrator family).
- [ ] **Neck meets collar** — continuous jaw → neck → kit collar; no floating head.
- [ ] **Hair is human graphic** — default hair is not flame/mascot; rare unlocks may be stylized, not default.
- [ ] **Portrait recessed in art well** — not sticker-on-ring; no HUD baked into SVG.
- [ ] **Matched outline weight** across face + hair + kit stack.
- [ ] **Registration grid** aligns hairline, eyes, chin, collar, shoulders (per `PORTRAIT_ART_DIRECTION.md` §2).
- [ ] **Phoenix palette only** — navy kit, warm skin, gold trim sparingly; not mascot proportions.

### Process tests (required)

- [ ] Human VA on HQ, Armory Studio, and recruit surfaces — **product owner** sign-off ☑
- [ ] VA manifest captured — [`s35m-gate-manifest.json`](../va-screenshots/s35m-gate-manifest.json) (create at gate sprint)

---

## 5. Sprint map (Phase 3)

| Sprint | Focus |
|--------|--------|
| **3.5m-docs** ✓ | This board + ROADMAP Phase 3 reopen |
| **3.5m-ref** ✓ | Reference image kit — [`REFERENCE_SOURCES.md`](./REFERENCE_SOURCES.md) + character sheets (legacy mood boards trimmed in **3.6a**) |
| **3.6a-ref-organize** ✓ | Avatar reference rename + dedupe + [`AVATAR_REFERENCE_INDEX.md`](./character/AVATAR_REFERENCE_INDEX.md) |
| **LAUNCH-defer-avatar** ✓ | Reference hierarchy + avatar builder pause until post-launch | [`README.md`](./README.md) |
| **3.5m-frame** | Art-well recess + frame/portrait alignment (no sticker-on-ring) |
| **3.5m-art** | ~~Matched-set cartoon bust SVG redraw~~ — **superseded** (human VA failed) |
| **3.5m-docs-gemini** ✓ | Owner Gemini art brief + Composer ingest playbook (docs/rules only) |
| **3.5m-gemini-ingest** | **Deferred (post-launch)** — wire owner-approved bust PNGs — [`ASSET_INGESTION.md`](../ASSET_INGESTION.md) |
| **3.5m-hair** | ~~Human graphic hair pass~~ — folded into Gemini bust + ingest |
| **3.5m-gate** | **Deferred (post-launch)** — regression + §4 checklist + **product owner** human VA |

**Epic 4.1+** **unblocked for implementation** at launch — placeholder portrait OK (`defaultPortraitV2` SVG + initials). **3.5m-gate** human VA resumes post-launch when owner reopens character art.

---

## 6. Reference images

Provenance: [`REFERENCE_SOURCES.md`](./REFERENCE_SOURCES.md). Master index: [`README.md`](./README.md). **Slice map (paused):** [`character/AVATAR_REFERENCE_INDEX.md`](./character/AVATAR_REFERENCE_INDEX.md).

**Legacy wiki mood JPEGs removed (3.6a)** — tone remains in §1 text; do not reintroduce traced third-party art.

### UI holo chrome (launch)

| Subfolder | Role |
|-----------|------|
| [`ui/player/`](./ui/player/) | HQ holo well, identity deck, route shell layout refs — **not** operative bust art |

See [`ui/README.md`](./ui/README.md).

### Avatar Studio character sheets (3.6a) — **deferred post-launch**

| Subfolder | Role |
|-----------|------|
| [`character/female-meg/`](./character/female-meg/) | Mighty Meg — concept, base turnarounds, kits, hair/face/ear catalog grids |
| [`character/male-tom/`](./character/male-tom/) | Atomic Tom — concept, base turnarounds, hair/face/ear catalog grids |
| [`mood/`](./mood/) | Sparky anti-ref + Gemini experiment PNGs (restore per index if missing) |

PNG layer output (paused): [`static/avatar/layers/README.md`](../../../static/avatar/layers/README.md). Gate: [`.cursor/rules/avatar-builder-deferred.mdc`](../../../.cursor/rules/avatar-builder-deferred.mdc).

### Agent mandatory read (post-launch ingest + slice)

> **At launch:** follow **§2** holo recess + [`ui/player/`](./ui/player/) for chrome. **Do not** slice or ingest until owner unpause.
>
> **After unpause:** read **PORTRAIT_REFERENCE_BOARD.md**, **[`GEMINI_ART_BRIEF.md`](../GEMINI_ART_BRIEF.md)**, and **[`character/AVATAR_REFERENCE_INDEX.md`](./character/AVATAR_REFERENCE_INDEX.md)**. Match Vault-tone bust cohesion (§1). Hair must read as **hair** at 64px — not flame, fur, or mascot element.
>
> **Precomposed bust track:** ingest owner PNGs from `static/portrait/approved/` only — do not redraw. **PNG layer stack:** Photopea slice from `character/female-meg/` / `character/male-tom/` → `static/avatar/layers/`.
>
> **Pip-Boy** = wrist device (Fallout UI fiction). **Vault Boy/Girl** = cartoon mascot **tone** target for bust art — not an invitation to copy Bethesda poses or costumes.

---

## Cross-links

- Art creation (owner): [`GEMINI_ART_BRIEF.md`](../GEMINI_ART_BRIEF.md)
- Composer pipeline: [`COMPOSER_PLAYBOOK.md`](../COMPOSER_PLAYBOOK.md) · [`ASSET_INGESTION.md`](../ASSET_INGESTION.md)
- License log: [`ASSET_LICENSES.md`](./ASSET_LICENSES.md)
- Image provenance: [`REFERENCE_SOURCES.md`](./REFERENCE_SOURCES.md)
- Reference hierarchy: [`README.md`](./README.md) · UI mockups: [`ui/README.md`](./ui/README.md) · Character (paused): [`character/README.md`](./character/README.md)
- Style locks & COPPA: [`PORTRAIT_ART_DIRECTION.md`](../PORTRAIT_ART_DIRECTION.md)
- Card Z3 art well: [`OPERATIVE_ID_CARD.md`](../OPERATIVE_ID_CARD.md)
- Catalog & pipeline: [`OPERATIVE_LOADOUT.md`](../OPERATIVE_LOADOUT.md)
- Delivery tracker: [`ROADMAP.md`](../../../ROADMAP.md) — Epic 3.5 Phase 3
