# Recruiter OS — Vision

**Product Epic G** · **Future role**

---

## North star

A clearance-gated **scouting portal** for collegiate and elite recruiters: tokenized player cards, compound search, and export audit — without exposing minor PII beyond policy.

---

## Primary user

External recruiters with verified clearance and org-approved access.

---

## Home screen zones (conceptual)

Route: `/recruiter` (future)

| Module | Purpose |
|--------|---------|
| Search terminal | Filter on verified telemetry |
| Player cards | Tokenized public/recruiter views |
| Export audit | Logged pulls with billing hooks |

---

## Core loops

1. **Discover** — search squad/club scoped vectors.
2. **Evaluate** — open tokenized player card (redacted per COPPA/age). Public recruit front uses the same TCG zones as Player HQ ([`OPERATIVE_ID_CARD.md`](./OPERATIVE_ID_CARD.md)) — club org on type line; **team roster name excluded** from collectible front.
3. **Export** — audited download; `recordRecruiterExport` defense in depth.

---

## Handoffs

| Direction | Flow |
|-----------|------|
| Player/Coach data → Recruiter | Via approved card tokens only |
| Admin → Recruiter | Org-level recruiter seats, clearance |
| Compliance → Recruiter | Clearance expiry revokes access |

---

## Visual tone

- Premium filtering terminal — mono data density, no Player OS game chrome.
- Clear consent/age badges on cards.

---

## Out of scope (until epic ships)

- Full B2B billing portal (partial Stripe exists platform-wide)
- Unsupervised messaging to minors
- JWT/recruiter route implementation without clearance sprint

---

## ROADMAP link

**TBD sprint** — clearance role exists in [`docs/CLEARANCE.md`](../CLEARANCE.md); product surface not scheduled in current Epic 1/2 delivery track.
