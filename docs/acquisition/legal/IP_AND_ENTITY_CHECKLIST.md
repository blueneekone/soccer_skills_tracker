# IP & Entity Checklist

> **DRAFT — NOT LEGAL ADVICE — FOUNDER MUST HAVE QUALIFIED COUNSEL REVIEW BEFORE USE**

**Purpose:** Fill-in-the-blank corporate and IP diligence starter for data room.  
**Last updated:** 2026-06-25 · ACQ-DATAROOM-COMPLETE

---

## Entity

| Field | Value |
|-------|-------|
| **Legal entity name** | `[FILL IN]` |
| **DBA / product name** | Sports Skill Tracker (SSTracker) / Nexus Command |
| **Entity type** | `[e.g., Delaware C-Corp / LLC]` |
| **State / country of formation** | `[FILL IN]` |
| **Date of formation** | `[FILL IN]` |
| **EIN** | `[FILL IN — do not commit to public repo]` |
| **Registered agent** | `[FILL IN]` |
| **Principal business address** | `[FILL IN]` |

---

## Ownership

| Shareholder | Ownership % | Class | Notes |
|-------------|-------------|-------|-------|
| `[Founder name]` | `[FILL IN]`% | Common | `[FILL IN]` |
| `[Other]` | `[FILL IN]`% | `[Common / Preferred]` | `[FILL IN]` |

See also: [`CAP_TABLE_TEMPLATE.md`](../CAP_TABLE_TEMPLATE.md)

---

## Code & IP assignment

| Question | Answer |
|----------|--------|
| All founders/employees assigned IP to entity? | **Y / N** — `[FILL IN]` |
| Contractor assignments executed? | **Y / N** — `[FILL IN]` |
| Prior employer conflicts reviewed? | **Y / N** — `[FILL IN]` |
| Repo ownership | `[GitHub org/user]` → `[FILL IN]` |

---

## Open-source policy

| Item | Status |
|------|--------|
| `package.json` licenses reviewed | `[FILL IN]` |
| Copyleft dependencies flagged | `[FILL IN]` |
| OSS policy document | `[FILL IN or N/A]` |

---

## Third-party assets

| Asset type | Status |
|------------|--------|
| Fonts / icons (Phosphor, etc.) | `[FILL IN license]` |
| Portrait / character art | One JPEG + SVG defaults; Gemini bust ingest deferred |
| Drill content / videos | `[FILL IN — club-owned vs platform]` |
| Stripe, Checkr, Tremendous, Firebase | SaaS terms — subprocessors |

---

## Cloud & infrastructure ownership

| Resource | Owner account | Notes |
|----------|---------------|-------|
| Firebase project `sports-skill-tracker-dev` | `[FILL IN]` | QA / live-fire dev |
| Firebase project `soccer-skills-tracker` | `[FILL IN]` | Prod alias per `.firebaserc` |
| Domain `sstracker.app` | `[FILL IN registrar]` | |
| GCP billing account | `[FILL IN]` | |
| GitHub repository | `[FILL IN]` | |

Transfer checklist: [`TRANSFER.md`](../TRANSFER.md)

---

## Trademarks & branding

| Mark | Registration status |
|------|---------------------|
| SSTracker | `[FILL IN]` |
| Nexus Command | `[FILL IN]` |

---

## Outstanding items for counsel

- [ ] Confirm 100% IP chain from all contributors
- [ ] Review Firebase/Google Cloud Terms for assignment on acquisition
- [ ] Confirm no GPL contamination in distributed bundle
- [ ] Stock option / SAFE instruments (if any) — attach schedules outside repo

---

*Founder: complete this document and store counsel-reviewed copies in secure data room (not necessarily in git).*
