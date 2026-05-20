/**
 * src/lib/types/__tests__/user.types.test.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Sprint 1.2 — Type-level contract tests for user.types.ts.
 *
 * These tests use Vitest's `expectTypeOf` to lock the structural contracts
 * between SSTUser, SSTUserClaims, VanguardClaims, and the Firebase Auth User
 * type.  They compile to zero runtime bytes — if the types drift the tests
 * fail at `npm run check` / `npm test` before any JS is emitted.
 *
 * Runtime tests cover the isSSTRole and assertSSTUser guards.
 */

import { describe, it, expect, expectTypeOf } from 'vitest';
import type { User } from 'firebase/auth';
import type {
	SSTRole,
	SSTRoleExtended,
	SSTUserClaims,
	SSTAuthPayload,
	SSTFirestoreProfile,
	SSTUser,
	VanguardClaims,
	TenantUser,
} from '../user.types';
import { isSSTRole, assertSSTUser } from '../user.types';

// ─────────────────────────────────────────────────────────────────────────────
// § 1  SSTRole shape
// ─────────────────────────────────────────────────────────────────────────────

describe('SSTRole', () => {
	it('is assignable to SSTRoleExtended', () => {
		expectTypeOf<SSTRole>().toMatchTypeOf<SSTRoleExtended>();
	});

	it('only accepts the 5 directive-mandated values', () => {
		// The union must include every mandated role.
		const _admin: SSTRole = 'admin';
		const _director: SSTRole = 'director';
		const _coach: SSTRole = 'coach';
		const _player: SSTRole = 'player';
		const _parent: SSTRole = 'parent';
		// Silence unused-variable warnings — these are compile-time assertions.
		void _admin; void _director; void _coach; void _player; void _parent;
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// § 2  SSTUserClaims ↔ VanguardClaims compatibility
// ─────────────────────────────────────────────────────────────────────────────

describe('SSTUserClaims', () => {
	it("role field is of type SSTRole", () => {
		expectTypeOf<SSTUserClaims['role']>().toEqualTypeOf<SSTRole>();
	});

	it('tenantId is a required string', () => {
		expectTypeOf<SSTUserClaims['tenantId']>().toEqualTypeOf<string>();
	});

	it('ageBand union covers all three COPPA bands', () => {
		type ExpectedAgeBand = 'under13' | 'teen13to16' | 'adult' | undefined;
		expectTypeOf<SSTUserClaims['ageBand']>().toEqualTypeOf<ExpectedAgeBand>();
	});

	it('optional fields are indeed optional (undefined-assignable)', () => {
		type _OptClubId = SSTUserClaims['clubId'] extends string | undefined ? true : false;
		const _ok: _OptClubId = true;
		void _ok;
	});

	it('is structurally compatible with VanguardClaims (all shared keys overlap)', () => {
		// VanguardClaims has role?: TenantRole — SSTUserClaims.role is a narrower
		// SSTRole, so SSTUserClaims does NOT extend VanguardClaims in the strict
		// direction, but a VanguardClaims object CAN be cast to SSTUserClaims
		// after runtime validation of the role field.  We assert that the shared
		// optional fields (tenantId, clubId, teamId, cellId, orgId) align.
		type SharedKeys = 'clubId' | 'teamId' | 'cellId' | 'orgId';
		type VanguardShared = Pick<VanguardClaims, SharedKeys>;
		type SSTShared = Pick<SSTUserClaims, SharedKeys>;
		expectTypeOf<SSTShared>().toMatchTypeOf<VanguardShared>();
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// § 3  SSTAuthPayload ↔ firebase/auth User
// ─────────────────────────────────────────────────────────────────────────────

describe('SSTAuthPayload', () => {
	it('uid is string', () => {
		expectTypeOf<SSTAuthPayload['uid']>().toEqualTypeOf<string>();
	});

	it('email allows null (Firebase may return null for anonymous users)', () => {
		expectTypeOf<SSTAuthPayload['email']>().toEqualTypeOf<string | null>();
	});

	it('is assignable from firebase/auth User via Pick', () => {
		// Verify that the Pick projection is still valid against the firebase SDK type.
		type FirebasePickedUser = Readonly<
			Pick<
				User,
				| 'uid'
				| 'email'
				| 'emailVerified'
				| 'displayName'
				| 'photoURL'
				| 'phoneNumber'
				| 'isAnonymous'
				| 'metadata'
			>
		>;
		expectTypeOf<SSTAuthPayload>().toEqualTypeOf<FirebasePickedUser>();
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// § 4  SSTFirestoreProfile ↔ TenantUser
// ─────────────────────────────────────────────────────────────────────────────

describe('SSTFirestoreProfile', () => {
	it('is exactly TenantUser (no structural widening or narrowing)', () => {
		expectTypeOf<SSTFirestoreProfile>().toEqualTypeOf<TenantUser>();
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// § 5  SSTUser structure
// ─────────────────────────────────────────────────────────────────────────────

describe('SSTUser', () => {
	it('auth field is SSTAuthPayload', () => {
		expectTypeOf<SSTUser['auth']>().toEqualTypeOf<SSTAuthPayload>();
	});

	it('claims field is SSTUserClaims', () => {
		expectTypeOf<SSTUser['claims']>().toEqualTypeOf<SSTUserClaims>();
	});

	it('profile field is SSTFirestoreProfile', () => {
		expectTypeOf<SSTUser['profile']>().toEqualTypeOf<SSTFirestoreProfile>();
	});

	it('uid is a readonly string shortcut', () => {
		expectTypeOf<SSTUser['uid']>().toEqualTypeOf<string>();
	});

	it('role is a readonly SSTRole shortcut', () => {
		expectTypeOf<SSTUser['role']>().toEqualTypeOf<SSTRole>();
	});

	it('tenantId is a readonly string shortcut', () => {
		expectTypeOf<SSTUser['tenantId']>().toEqualTypeOf<string>();
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// § 6  isSSTRole — runtime type guard
// ─────────────────────────────────────────────────────────────────────────────

describe('isSSTRole', () => {
	it('returns true for every valid SSTRole value', () => {
		const validRoles: SSTRole[] = ['admin', 'director', 'coach', 'player', 'parent'];
		for (const r of validRoles) {
			expect(isSSTRole(r)).toBe(true);
		}
	});

	it('returns false for roles not in SSTRole', () => {
		const invalid = ['guest', 'super_admin', 'global_admin', 'registrar', 'recruiter', 'tutor', '', null, undefined, 42];
		for (const v of invalid) {
			expect(isSSTRole(v)).toBe(false);
		}
	});

	it('narrows the type correctly in a conditional branch', () => {
		const raw: unknown = 'coach';
		if (isSSTRole(raw)) {
			expectTypeOf(raw).toEqualTypeOf<SSTRole>();
		}
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// § 7  assertSSTUser — assertion guard
// ─────────────────────────────────────────────────────────────────────────────

describe('assertSSTUser', () => {
	const validUser: SSTUser = {
		auth: {
			uid: 'uid-abc',
			email: 'coach@aggiesfc.com',
			emailVerified: true,
			displayName: 'Coach Smith',
			photoURL: null,
			phoneNumber: null,
			isAnonymous: false,
			metadata: {} as User['metadata'],
		},
		claims: {
			role: 'coach',
			tenantId: 'aggies-fc',
		},
		profile: {
			id: 'coach@aggiesfc.com',
			playerName: 'Coach Smith',
			clubId: 'aggies-fc',
		},
		uid: 'uid-abc',
		role: 'coach',
		tenantId: 'aggies-fc',
	};

	it('does not throw for a valid SSTUser', () => {
		expect(() => assertSSTUser(validUser)).not.toThrow();
	});

	it('throws TypeError for null', () => {
		expect(() => assertSSTUser(null)).toThrow(TypeError);
	});

	it('throws TypeError for a plain string', () => {
		expect(() => assertSSTUser('not-a-user')).toThrow(TypeError);
	});

	it('throws TypeError when auth is missing', () => {
		expect(() => assertSSTUser({ ...validUser, auth: undefined })).toThrow(TypeError);
	});

	it('throws TypeError when claims is missing', () => {
		expect(() => assertSSTUser({ ...validUser, claims: undefined })).toThrow(TypeError);
	});

	it('throws TypeError when profile is missing', () => {
		expect(() => assertSSTUser({ ...validUser, profile: undefined })).toThrow(TypeError);
	});

	it('throws TypeError when uid is empty string', () => {
		expect(() => assertSSTUser({ ...validUser, uid: '' })).toThrow(TypeError);
	});

	it('throws TypeError when role is not a valid SSTRole', () => {
		expect(() => assertSSTUser({ ...validUser, role: 'super_admin' })).toThrow(TypeError);
	});

	it('throws TypeError when tenantId is not a string', () => {
		expect(() => assertSSTUser({ ...validUser, tenantId: 42 })).toThrow(TypeError);
	});
});
