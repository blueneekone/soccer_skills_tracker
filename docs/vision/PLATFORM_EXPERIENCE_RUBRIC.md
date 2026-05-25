# Platform Experience Rubric

**Platform-wide experience constitution** · Source thesis: [What Makes A Mobile App Feel Premium And Exclusive](https://weareaffective.com/learning-centre/what-makes-a-mobile-app-feel-premium-and-exclusive) (Affective)

---

## §0 Purpose & hierarchy

This document is the **why / pass-fail criteria** for every persona in SSTracker. Premium means the user feels **valuable**, not that the UI looks expensive. The **3-second** first impression matters. Restraint beats over-decoration.

**Document stack** — do not duplicate content; link outward:

| Layer | Doc | Role |
|-------|-----|------|
| **Platform criteria** | **This file** | Universal experience bar — psychology, interaction, copy, performance, trust |
| **Who / routes** | [`docs/PERSONA_ECOSYSTEM.md`](../PERSONA_ECOSYSTEM.md) | Roles, handoffs, route ownership |
| **Player material vocabulary** | [`docs/vision/PLAYER_OS_FOUNDATION.md`](./PLAYER_OS_FOUNDATION.md) | Z-depth, void %, diegetic kit, Tier A primitives — **Player only** |
| **Player sign-off** | [`docs/PLAYER_OS_VISUAL_ACCEPTANCE.md`](../PLAYER_OS_VISUAL_ACCEPTANCE.md) | Screenshot + must-feel matrix at 1280px / 390px |
| **When to build** | [`ROADMAP.md`](../../ROADMAP.md) | Sprint status, file lists, proof tests |

Every UX, pixel, copy, or motion change must pass **§5** before merge. Player OS changes also require FOUNDATION + VISUAL_ACCEPTANCE.

---

## §1 Universal principles (all personas)

Each principle translates the Affective article into actionable dev criteria.

### 1. Three-second quality judgment

**What it means:** Users decide whether the product feels cheap or premium within ~3 seconds of first paint. Typography hierarchy, spacing rhythm, and the first interactive element set that judgment — before they read feature copy.

**How we verify it:**
- Design review: clear type scale (display → label → body), no competing headlines, generous first-screen whitespace.
- Acceptance: first tap target is obvious, labeled, and responds instantly; loading state does not flash broken layout.

**Anti-patterns:**
- Wall of equal-weight text on landing.
- Cramped first screen with no breathing room.
- First interactive element buried below fold on mobile without scroll affordance.

---

### 2. Psychology of value

**What it means:** Premium apps make users feel understood, respected, and confident — not merely impressed by decoration. Anticipation and delight, consistency that builds confidence, and trust through visible care in details.

**How we verify it:**
- Design review: interactions feel predictable; state changes are legible; micro-moments (success, empty, return visit) feel intentional.
- Acceptance: returning users see continuity (preferences, last context) where product scope allows.

**Anti-patterns:**
- Random animation with no state meaning.
- Inconsistent button placement or label vocabulary across similar flows.
- Sloppy edge cases (truncation, orphan labels) that signal “rushed.”

---

### 3. Visual discipline

**What it means:** Restraint signals quality. Generous whitespace, a restrained palette (~3 core colors per surface with one dominant ~60%), custom consistent iconography, and materials (shadow, gradient, texture) used **with purpose** — never stacked for show.

**How we verify it:**
- Design review: palette audit per surface; icon stroke/corner consistency; no decorative layer without function.
- Acceptance: screenshot pass at target viewport; contrast meets accessibility for primary text and controls.

**Anti-patterns:**
- More than three competing accent colors on one screen.
- Stock/default icon sets mixed with custom icons.
- Decorative borders, glows, or gradients that do not encode state or hierarchy.
- **Restraint > overdone:** fewer elements executed perfectly beats feature-rich clutter.

---

### 4. Interaction quality

**What it means:** Every tap and action gets instant feedback. Transitions are smooth and purposeful — guiding the eye, not popping screens. Users never wonder whether a tap registered.

**How we verify it:**
- Design review: press/hover/focus states on all primary controls; transition duration and easing feel cohesive.
- Acceptance: no double-tap required for primary actions; disabled/loading states visible; focus order logical on keyboard.

**Anti-patterns:**
- Silent buttons (no visual or haptic feedback path).
- Jarring cuts between routes where continuity is expected.
- Debounced actions with no in-flight indicator.

---

### 5. Copy & tone

**What it means:** Voice is exclusive and respectful — confident, not arrogant; knowledgeable, not condescending. Less is more: every word earns its place. Tone is **persona-appropriate** (not one voice everywhere).

**How we verify it:**
- Copy review: headlines state benefit or next step; error messages explain fix; compliance copy is plain-language where required.
- Acceptance: no shouty marketing on operational surfaces; no Player operative jargon on Parent/Coach routes.

**Anti-patterns:**
- Generic “Sign up” / “Buy now” where persona-specific invitation fits.
- Paragraphs where a single line suffices.
- Gamification vocabulary on non-Player personas.

---

### 6. Performance as premium

**What it means:** Speed is part of the experience. Instant response to interaction, graceful loading (no layout thrash), errors and offline states that still respect the user’s time.

**How we verify it:**
- Acceptance: primary actions feel immediate; skeletons or purposeful placeholders — not blank stalls; offline/error paths offer next step or cached value where feasible.
- Technical review: no perceptible jank on target devices; battery-heavy loops avoided on mobile.

**Anti-patterns:**
- Spinner-only waits with no context.
- Crash or opaque “Something went wrong” with no recovery path.
- Heavy animation blocking interaction.

---

### 7. Personalization

**What it means:** The app feels uniquely theirs — adaptive UI, earned tiers where gamification applies, notifications and dashboards that reflect individual journey rather than generic defaults.

**How we verify it:**
- Design review: empty states invite personalization; gamified personas show earned progress, not paywall chrome alone.
- Acceptance: preferences persist; role-appropriate defaults (Player vs Parent vs Coach).

**Anti-patterns:**
- One-size dashboard for all users when role data exists.
- Superficial “Hi {name}” with no downstream tailoring.
- Purchased status without earned progression on Player routes where XP/streak canon applies.

---

### 8. Trust

**What it means:** Security and privacy feel seamless, not burdensome. Permissions explain benefit; errors are transparent; compliance steps are clear — especially for minors and guardians.

**How we verify it:**
- Copy review: permission prompts state *why*; privacy-sensitive flows match [`docs/COPPA_SIGNUP_MATRIX.md`](../COPPA_SIGNUP_MATRIX.md) and persona specs.
- Acceptance: auth errors actionable; billing/compliance banners honest about read-only or blocked states.

**Anti-patterns:**
- Opaque permission requests.
- Hidden destructive actions.
- Security friction with no visible payoff (e.g., repeated re-auth without reason).

---

## §2 Persona expression matrix

**Same rubric, different skin.** Universal §1 principles apply to every row; expression differs by persona.

| Persona | Premium means | Visual expression | Copy voice | Gamification | Primary vision doc |
|---------|---------------|-------------------|------------|--------------|-------------------|
| **Player** | Operative command deck — user feels like the mission matters | Cinematic void + emissive HUD; Z-depth orchestration; one gold focal; diegetic terminals | Confident operative briefings; terse status tags; display + mono hierarchy | Full — XP, streaks, armory, bounties, earned tiers | [`PLAYER_OS.md`](./PLAYER_OS.md) · material: [`PLAYER_OS_FOUNDATION.md`](./PLAYER_OS_FOUNDATION.md) |
| **Parent** | Trusted co-op partner — calm, personal, respectful of guardian role | Flat, adult-oriented bento; trustworthy spacing; **no** Player chrome | Supportive partner; clear COPPA/VPC compliance; celebrate without arcade hype | None — co-op logging only, not a game UI | [`PARENT_OS.md`](./PARENT_OS.md) |
| **Coach** | Sideline clarity at speed — decisions feel informed | Flat high-density analytics; mono tables; liquid glass OK; **no** chamfer/military corners | Professional development tone; roster-first labels | None — assignments feed Player bounties but Coach UI stays flat | [`COACH_OS.md`](./COACH_OS.md) |
| **Director** | Enterprise command console — authority without noise | Dense tabbed IA; map/table modules; read-only banners; consistency at org scale | Operational, compliance-forward; plain-language holds and gates | None | [`DIRECTOR_OS.md`](./DIRECTOR_OS.md) |
| **Admin** | Platform control room — predictable, auditable | Admin console patterns; dense tables; system settings clarity | Neutral operator voice; audit-friendly labels | None | [`ADMIN_OS.md`](./ADMIN_OS.md) |
| **Team Manager** *(planned)* | Ops dashboard — logistics without tactical/game chrome | Coach-like density; flat ops modules; audit trail visible | Logistics coordinator; roster/schedule first | None | [`TEAM_MANAGER_OS.md`](./TEAM_MANAGER_OS.md) |
| **Recruiter / Tutor** *(future)* | Clearance-gated professional workspace | Terminal/workspace TBD — flat, scout- or instruction-appropriate | External professional; minimal hype | None (Recruiter); instructional (Tutor) | [`RECRUITER_OS.md`](./RECRUITER_OS.md) · [`TUTOR_OS.md`](./TUTOR_OS.md) |

**Hard rules (do not weaken):**
- **Player:** cinematic operative command deck — full rubric + [`PLAYER_OS_FOUNDATION.md`](./PLAYER_OS_FOUNDATION.md) material foundation.
- **Parent:** flat co-op partner — trust, calm, personal; **not** Player chrome.
- **Coach:** flat sideline analytics — density, clarity, speed; **no** gamification chrome.
- **Director / Admin:** enterprise command console — authority, clarity, consistency.

---

## §3 Shared platform patterns (implementation-agnostic)

Criteria for patterns that should **converge over time** across personas. Not a refactor spec — no new CSS token names unless noting existing Player-only `--pd-*` references.

| Pattern | Target bar |
|---------|------------|
| **Type scale & spacing grid** | 8/16pt (or equivalent rem) rhythm; consistent heading steps per persona; no arbitrary one-off margins on primary layouts |
| **Press / hover / focus feedback** | Every interactive control shows pressed, hover (where applicable), and visible focus ring for keyboard users |
| **Motion grammar** | Purposeful transitions; respect `prefers-reduced-motion: reduce`; Player routes also honor `data-dopamine='off'` parity for decorative motion |
| **Empty / loading / error states** | Branded to persona tone; explain next step; never raw browser defaults on premium surfaces |
| **Icon stroke & corner consistency** | Single icon family per persona surface; matched stroke weight and corner radius — no mixed stock + custom without migration plan |

Player-specific material tokens (`--pd-accent-action`, `--pd-font-display`, etc.) remain defined in [`PLAYER_OS_FOUNDATION.md`](./PLAYER_OS_FOUNDATION.md) only.

---

## §4 Player OS — rubric × material crosswalk

Universal §1 principles map to Player material canon as follows. **Material details stay in FOUNDATION; this rubric is the experience bar above it.**

| Rubric principle | FOUNDATION expression |
|------------------|----------------------|
| 3-second judgment | Display + mono hierarchy; void ≥40%; one gold focal (`--pd-accent-action`); first CTA obvious on HQ |
| Psychology of value | Z3 hero identity (`HologramCardShell`); state color cascade; pointer-aware lift on Tier A surfaces |
| Visual discipline | Two-layer decorative lock; ≤35% matte panel fill; restraint — no box-in-box around bloom |
| Interaction quality | Diegetic kit (§7 FOUNDATION); touch targets ≥44px; one-shot mount motion with reduced-motion off paths |
| Copy & tone | ProvingGrounds error grammar; empty states (“AWAITING TELEMETRY”) not generic placeholders |
| Performance | Native document scroll (no inner shell scroll); SVG bloom via shared `VanguardVFX` defs |
| Personalization | Operative loadout, rank, streak, armory — earned progression surfaces |
| Trust | Settings calibration terminal; dopamine-off path; no browser-default controls on Player routes |

**Pointer:** Before shipping Player pixels, run **§5** universal checks + Player row + [`PLAYER_OS_FOUNDATION.md`](./PLAYER_OS_FOUNDATION.md) + [`PLAYER_OS_VISUAL_ACCEPTANCE.md`](../PLAYER_OS_VISUAL_ACCEPTANCE.md).

---

## §5 Review checklist (copy-paste for agents & humans)

Run before shipping **any** UX change (layout, CSS, copy, motion, empty/loading states).

### Universal checks (all personas)

1. ☐ First screen passes **3-second** test: type hierarchy, spacing, obvious first action.
2. ☐ Palette restrained (~3 core colors per surface); whitespace generous; no decorative stacks without function.
3. ☐ Every tap/control has visible feedback; no double-tap uncertainty on primary actions.
4. ☐ Transitions purposeful; `prefers-reduced-motion` honored where motion exists.
5. ☐ Copy persona-appropriate, concise, respectful — no wrong-persona jargon.
6. ☐ Loading/error/offline states graceful with a clear next step.
7. ☐ Permissions, compliance, and errors transparent (trust bar).
8. ☐ No feature bloat: fewer things, executed perfectly (Affective FAQ).

### Persona-specific checks

Pick the row from **§2** for the route’s persona:

9. ☐ **Player:** cinematic command deck — not flat dossier admin; no gamification leakage *out* of Player routes.
10. ☐ **Parent:** flat co-op partner — no Player chamfer/gamification chrome.
11. ☐ **Coach:** flat sideline analytics — no XP/loot/streak UI on Coach routes.
12. ☐ **Director / Admin:** enterprise console — authority, clarity, consistent tab/table IA; read-only banners when gated.
13. ☐ **Team Manager** *(when built):* ops density like Coach — no tactical Forge or Player HUD.
14. ☐ **Recruiter / Tutor** *(future):* clearance-appropriate professional tone — no Player operative skin.

### Player-only (additional)

15. ☐ [`PLAYER_OS_FOUNDATION.md`](./PLAYER_OS_FOUNDATION.md) — Tier A primitives, void contract, diegetic kit, anti-patterns §9.
16. ☐ [`PLAYER_OS_VISUAL_ACCEPTANCE.md`](../PLAYER_OS_VISUAL_ACCEPTANCE.md) — reference matrix + core acceptance states at 1280px and 390px.

---

## §6 Anti-patterns (platform)

**From the article:** Premium is thoughtful and refined, not overcomplicated. The biggest mistake is flashy features instead of perfected core interactions. **Fewer things, executed perfectly.**

**Project-specific bans:**

| Anti-pattern | Why it fails |
|--------------|--------------|
| Lines-on-black with no spatial depth (Player) | Reads cheap admin console, not operative command deck — violates void + Z-depth canon |
| Stock/default controls where diegetic/custom exists (Player Train/Settings) | Breaks trust and material parity with `ProvingGrounds` / diegetic kit |
| Gamification chrome on Coach/Parent routes | Violates persona boundaries — undermines professional/co-op trust |
| Feature bloat / decorative stacks without function | Violates restraint principle; kills 3-second quality signal |
| Tier A Player primitive wrapped in Tier B matte frames | See FOUNDATION §9 — box-in-box kills bloom and void ratio |
| Inner `overflow: auto` scroll regions on Player OS routes | Breaks scroll contract; feels trapped vs premium native flow |
| One voice / one skin everywhere | Parent ≠ Player ≠ Coach — same rubric, different expression (§2) |

---

## Related links

| Doc | Role |
|-----|------|
| [`docs/PERSONA_ECOSYSTEM.md`](../PERSONA_ECOSYSTEM.md) | Who uses what — §2 matrix rows |
| [`docs/vision/PLAYER_OS_FOUNDATION.md`](./PLAYER_OS_FOUNDATION.md) | Player material vocabulary only |
| [`docs/PLAYER_OS_VISUAL_ACCEPTANCE.md`](../PLAYER_OS_VISUAL_ACCEPTANCE.md) | Player sign-off |
| [`.cursor/rules/sst-agent-workflow.mdc`](../../.cursor/rules/sst-agent-workflow.mdc) | Agent read order before UX work |
