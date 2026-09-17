# Jules Sprint: Beta Performance (N+1 Query Elimination)

## Goal
Eliminate all N+1 query patterns flagged by the system across the backend architecture to improve data liquidity and meet the sub-200KB payload requirement.

## Requirements
1. Audit the following domains for N+1 Firestore queries inside mapping loops (`Promise.all(ids.map(id => db.collection(...).doc(id).get()))` or similar inside `getDocs` iterations):
   - Mail Station Ops (`getTeamsByEmail`, `Twelve Towers`)
   - Action Inbox Passports (`Player Lookups`)
   - Director Camera Compliance Panel
   - Marketing Ops (`Forum Stats`)
   - Comms Channel Ops (`Channels`)
   - Roster Households Tab
   - Parent Coach DM Ops
   - Live TV Drone Camera
   - Household Schedule Roster
   - MCR Parent Ops
   - EQ Ops (`Parent Docs`)
   - Teams Store (`Badges`)
   - Parent Voice Session Ops
2. Replace loops with Firestore `in` clauses (`where('id', 'in', ids)`) or server-side batched reads where applicable.
3. Replace slow arrays with `Set` for `Member Tracking` as flagged.
4. Convert `N+1 Transactions in Batch Paginator` to atomic `writeBatch` limits (max 500 per batch).
5. Always preserve B815 Defensive Hydration guards.

## Testing Mandate
- Ensure `npm run test:regression:auth` passes.
- Maintain the strict Svelte 5 proxy unboxing and 80-line function limits.
