import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  documentId,
  type Firestore,
} from "firebase/firestore";
import type { GlobalUserRow } from "$lib/types/adminUsers.js";
import { fetchGuardiansFromPlayerLookup } from "$lib/household/fetchPlayerLookupGuardians.js";

function normEmail(v: unknown): string {
  return typeof v === "string" ? v.trim().toLowerCase() : "";
}

function isParentRole(role: string): boolean {
  return role === "parent";
}

function isPlayerRole(role: string): boolean {
  return role === "player" || role === "athlete";
}

/**
 * Build a one-line household graph label for admin Global Users.
 */
export function formatHouseholdGraphLabel(
  row: GlobalUserRow,
  household?: Record<string, unknown> | null,
  lookupParentEmails?: string[],
): string {
  if (isParentRole(row.role)) {
    const players = Array.isArray(household?.playerEmails)
      ? household!.playerEmails!.map(normEmail).filter(Boolean)
      : [];
    if (players.length === 0)
      return row.householdId ? "Household (no athletes)" : "—";
    const preview = players.slice(0, 2).join(", ");
    const extra = players.length > 2 ? ` +${players.length - 2}` : "";
    return `${players.length} athlete${players.length === 1 ? "" : "s"}: ${preview}${extra}`;
  }

  if (isPlayerRole(row.role)) {
    const parents =
      lookupParentEmails && lookupParentEmails.length > 0
        ? lookupParentEmails
        : Array.isArray(household?.parentEmails)
          ? household!.parentEmails!.map(normEmail).filter(Boolean)
          : [];
    if (parents.length === 0) {
      return row.householdId ? "No guardian on file" : "Unlinked";
    }
    return `Guardian: ${parents.join(", ")}`;
  }

  if (row.householdId) return row.householdId;
  return "—";
}

/** Enrich a users page with household graph labels (parents ↔ athletes). */
export async function enrichUsersWithHouseholdGraph(
  db: Firestore,
  rows: GlobalUserRow[],
): Promise<GlobalUserRow[]> {
  if (rows.length === 0) return rows;

  const householdIds = [
    ...new Set(rows.map((r) => r.householdId).filter(Boolean)),
  ] as string[];
  const householdById = new Map<string, Record<string, unknown>>();

  const CHUNK_SIZE = 30;
  const chunks = [];
  for (let i = 0; i < householdIds.length; i += CHUNK_SIZE) {
    chunks.push(householdIds.slice(i, i + CHUNK_SIZE));
  }

  await Promise.all(
    chunks.map(async (chunk) => {
      if (chunk.length === 0) return;
      try {
        const q = query(
          collection(db, "households"),
          where(documentId(), "in", chunk),
        );
        const snap = await getDocs(q);
        snap.docs.forEach((docSnap) => {
          if (docSnap.exists()) {
            householdById.set(
              docSnap.id,
              docSnap.data() as Record<string, unknown>,
            );
          }
        });
      } catch {
        /* non-fatal */
      }
    }),
  );

  const playerEmails = rows
    .filter((r) => isPlayerRole(r.role))
    .map((r) => r.email);
  const lookupGuardians = await fetchGuardiansFromPlayerLookup(
    db,
    playerEmails,
  );

  return rows.map((row) => {
    const household = row.householdId
      ? (householdById.get(row.householdId) ?? null)
      : null;
    const lookup = lookupGuardians.get(row.email.toLowerCase());
    const vpcFromLookup = lookup?.vpcStatus ?? null;
    return {
      ...row,
      vpcStatus: row.vpcStatus || vpcFromLookup,
      householdGraphLabel: formatHouseholdGraphLabel(
        row,
        household,
        lookup?.parentEmails,
      ),
    };
  });
}
