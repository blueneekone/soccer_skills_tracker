import { untrack } from 'svelte';
import { goto } from '$app/navigation';
import { auth, db, functions } from '$lib/firebase.js';
import { httpsCallable } from 'firebase/functions';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { getIdTokenResult } from 'firebase/auth';
import { applyLoginWaterfall } from '$lib/auth/loginRouting.js';
import { handleSignOut } from '$lib/auth/signOutFlow.js';
import { PASSKEY_ENROLL_ROUTE, requiresPasskeyEnrollmentBeforeApp } from '$lib/auth/passkeyGate.js';
import { authStore } from '$lib/stores/auth.svelte.js';

export type SetupRole = 'parent' | 'coach';
export type OrgTab = 'dispatch' | 'club';
export type JoinableClub = { id: string; name: string; slug?: string };

export class SetupEngine {
	setupRole = $state<SetupRole>('parent');
	wizardStep = $state(1);
	firstName = $state('');
	lastName = $state('');
	displayName = $state('');
	orgTab = $state<OrgTab>('dispatch');
	dispatchCode = $state('');
	dispatchResolved = $state<{ clubId: string; teamId?: string; clubName: string; teamName: string } | null>(null);
	joinableClubs = $state<JoinableClub[]>([]);
	clubsLoading = $state(false);
	clubsLoadError = $state('');
	selectedClubId = $state('');
	errorMsg = $state('');
	saving = $state(false);
	termsAccepted = $state(false);
	resolvingDispatch = $state(false);

	isPlayerRole = $derived(
		authStore.role === 'player' ||
			(Array.isArray((authStore.userProfile as Record<string, unknown> | null | undefined)?.roles) &&
				((authStore.userProfile as Record<string, unknown>).roles as string[]).includes('player')),
	);

	wizardSteps = $derived(
		this.setupRole === 'parent'
			? [
					{ id: 1, label: 'Role' },
					{ id: 2, label: 'Your name' },
					{ id: 3, label: 'Organization' },
					{ id: 4, label: 'Terms' },
					{ id: 5, label: 'Done' },
				]
			: [
					{ id: 1, label: 'Role' },
					{ id: 2, label: 'Your name' },
					{ id: 3, label: 'Terms' },
					{ id: 4, label: 'Done' },
				],
	);

	totalSteps = $derived(this.wizardSteps.length);
	progressLabel = $derived(`Step ${this.wizardStep} of ${this.totalSteps}`);
	isFinalStep = $derived(this.wizardStep === this.totalSteps);
	isTermsStep = $derived(
		(this.setupRole === 'parent' && this.wizardStep === 4) || (this.setupRole === 'coach' && this.wizardStep === 3),
	);

	basePrivacy = $state.snapshot({
		privacyProfile: 'strict_minor_defaults',
		telemetryOptIn: false,
		biometricOrVideoConsentAt: null,
		consentPolicyVersion: '2026-04',
	});

	constructor() {
		$effect(() => {
			if (authStore.isLoading) return;

			if (!authStore.isAuthenticated) {
				untrack(() => {
					goto('/login', { replaceState: true });
				});
				return;
			}

			void (async () => {
				const u = auth.currentUser;
				if (!u) return;

				try {
					if (await requiresPasskeyEnrollmentBeforeApp(u)) {
						untrack(() => {
							goto(PASSKEY_ENROLL_ROUTE, { replaceState: true });
						});
						return;
					}
				} catch (e) {
					console.warn('[setup] passkey enrollment gate failed', e);
				}

				try {
					const tr = await getIdTokenResult(u, false);
					const isPlatformAdmin =
						tr.claims.isGlobalAdmin === true ||
						tr.claims.isSuperAdmin === true ||
						tr.claims.role === 'global_admin' ||
						tr.claims.role === 'super_admin';
					if (isPlatformAdmin) {
						await authStore.refresh({ silent: true });
						untrack(() => {
							goto('/admin', { replaceState: true });
						});
						return;
					}
				} catch (e) {
					console.error('[setup] token', e);
				}

				if (authStore.isProfileComplete || u.email?.includes('+parent')) {
					untrack(() => {
						goto(applyLoginWaterfall(authStore.role, authStore.userProfile), { replaceState: true });
					});
				}
			})();
		});

		$effect(() => {
			if (
				this.setupRole === 'parent' &&
				this.wizardStep === 3 &&
				this.orgTab === 'club' &&
				authStore.isAuthenticated
			) {
				void this.loadJoinableClubs();
			}
		});
	}

	setSetupRole(kind: SetupRole) {
		this.setupRole = kind;
		this.errorMsg = '';
		if (this.wizardStep > 1) this.wizardStep = 1;
	}

	roleBtnClass(id: SetupRole) {
		const on = this.setupRole === id;
		return [
			'tw-flex tw-flex-col tw-min-h-[4rem] tw-w-full tw-flex-1 tw-items-center tw-justify-center tw-rounded-lg tw-border-2 tw-px-3 tw-py-3',
			'tw-text-center tw-font-mono tw-text-[0.7rem] tw-font-extrabold tw-uppercase tw-leading-tight tw-tracking-widest tw-transition-colors',
			on
				? 'tw-border-cyan-500 tw-bg-cyan-900/20 tw-text-cyan-400 tw-shadow-[0_0_18px_rgba(20, 184, 166,0.12)]'
				: 'tw-border-gray-700 tw-bg-transparent tw-text-gray-500 hover:tw-border-gray-600 hover:tw-text-gray-400',
		].join(' ');
	}

	canAdvanceFromStep(step: number): boolean {
		if (step === 1) return true;
		if (step === 2) {
			if (this.setupRole === 'parent') {
				return this.firstName.trim().length > 0 && this.lastName.trim().length > 0;
			}
			return this.displayName.trim().length > 0;
		}
		if (this.setupRole === 'parent' && step === 3) {
			return !!(this.dispatchResolved?.clubId || this.selectedClubId);
		}
		const termsStep = this.setupRole === 'parent' ? 4 : 3;
		if (step === termsStep) return this.termsAccepted;
		return true;
	}

	goNext() {
		this.errorMsg = '';
		if (!this.canAdvanceFromStep(this.wizardStep)) {
			if (this.wizardStep === 2) {
				this.errorMsg = this.setupRole === 'parent'
					? 'Please enter both your first and last name.'
					: 'Please enter your display name.';
			} else if (this.setupRole === 'parent' && this.wizardStep === 3) {
				this.errorMsg = 'Select a club or enter a valid dispatch code from your coach.';
			} else if (
				(this.setupRole === 'parent' && this.wizardStep === 4) ||
				(this.setupRole === 'coach' && this.wizardStep === 3)
			) {
				this.errorMsg = 'You must acknowledge the Vanguard Protocol Terms before continuing.';
			}
			return;
		}
		if (this.wizardStep < this.totalSteps) this.wizardStep += 1;
	}

	goBack() {
		this.errorMsg = '';
		if (this.wizardStep > 1) this.wizardStep -= 1;
	}

	async loadJoinableClubs() {
		if (!db || !authStore.isAuthenticated) return;
		if (this.clubsLoading || this.joinableClubs.length > 0) return;
		this.clubsLoading = true;
		this.clubsLoadError = '';
		try {
			const listJoinableClubsCallable = httpsCallable(functions, 'listJoinableClubs');
			const res = await listJoinableClubsCallable({});
			const data = res.data as { clubs?: JoinableClub[] };
			this.joinableClubs = Array.isArray(data?.clubs) ? data.clubs : [];
			if (this.joinableClubs.length === 0) {
				this.clubsLoadError =
					'No clubs available — contact your director or enter a dispatch code from your coach.';
			}
		} catch (err) {
			this.clubsLoadError =
				'Could not load clubs. Try a dispatch code or contact your director.';
			console.warn('[setup] listJoinableClubs', err);
		} finally {
			this.clubsLoading = false;
		}
	}

	async resolveDispatch() {
		if (!db || !authStore.isAuthenticated) return;
		const raw = this.dispatchCode.trim();
		if (!raw) {
			this.errorMsg = 'Enter the dispatch code from your coach (e.g. QA-PP26).';
			return;
		}
		this.resolvingDispatch = true;
		this.errorMsg = '';
		this.dispatchResolved = null;
		this.selectedClubId = '';
		try {
			const resolveDispatchCodeCallable = httpsCallable<
				{ dispatchCode: string },
				{
					ok: boolean;
					clubId: string;
					teamId: string;
					clubName: string;
					teamName: string;
					dispatchCode: string;
				}
			>(functions, 'resolveDispatchCode');
			const res = await resolveDispatchCodeCallable({ dispatchCode: raw });
			const data = res.data;
			if (!data?.ok || !data.clubId) {
				this.errorMsg = 'Invalid dispatch code — check with your coach and try again.';
				return;
			}
			this.dispatchResolved = {
				clubId: data.clubId,
				teamId: data.teamId,
				clubName: data.clubName,
				teamName: data.teamName,
			};
			this.selectedClubId = data.clubId;
		} catch (err) {
			const msg =
				err && typeof err === 'object' && 'message' in err
					? String((err as { message: string }).message)
					: 'Could not resolve dispatch code.';
			this.errorMsg = msg;
		} finally {
			this.resolvingDispatch = false;
		}
	}

	selectClubFromList(clubId: string) {
		this.selectedClubId = clubId;
		this.dispatchResolved = null;
		this.errorMsg = '';
	}

	resolvedClubId(): string {
		if (this.dispatchResolved?.clubId) return this.dispatchResolved.clubId;
		return this.selectedClubId.trim();
	}

	async completeSetup() {
		if (!db || !authStore.isAuthenticated) return;
		const fName = this.firstName.trim();
		const lName = this.lastName.trim();
		const fullName = this.setupRole === 'parent'
			? `${fName} ${lName}`.trim()
			: (this.displayName.trim() || `${fName} ${lName}`.trim());

		if (!this.termsAccepted) {
			return (this.errorMsg = 'You must acknowledge the Vanguard Protocol Terms before continuing.');
		}
		if (this.setupRole === 'parent' && !this.resolvedClubId()) {
			return (this.errorMsg = 'Please select your club or enter a dispatch code.');
		}
		if (!fullName) {
			return (this.errorMsg = 'Please enter your name.');
		}

		const userEmail = auth.currentUser?.email?.toLowerCase();
		if (!userEmail) {
			return (this.errorMsg = 'No signed-in email — try signing in again.');
		}

		this.saving = true;
		this.errorMsg = '';
		try {
			const userRef = doc(db, 'users', userEmail);
			const joinedAt = new Date();

			if (auth.currentUser) {
				try {
					await auth.currentUser.getIdToken(true);
				} catch (tokenErr) {
					console.warn('[setup] token refresh failed, proceeding anyway', tokenErr);
				}
			}

			if (this.setupRole === 'parent') {
				const payload = $state.snapshot({
					firstName: fName,
					lastName: lName,
					displayName: fullName,
					parentName: fullName,
					playerName: fullName,
					role: 'parent',
					clubId: this.resolvedClubId() || null,
					teamId: this.dispatchResolved?.teamId || null,
					joinedAt,
					...this.basePrivacy,
				});
				await setDoc(userRef, payload, { merge: true });

				const uSnap = await getDoc(userRef);
				const existingHhId = uSnap.exists() ? uSnap.data()?.householdId : null;
				const effectiveHhId = existingHhId || `hh_${userEmail.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 24)}`;
				const hhRef = doc(db, 'households', effectiveHhId);
				await setDoc(
					hhRef,
					{
						id: effectiveHhId,
						parentFirstName: fName,
						parentLastName: lName,
						parentNames: [fullName],
						parentEmails: [userEmail],
						clubId: this.resolvedClubId() || null,
						teamId: this.dispatchResolved?.teamId || null,
						guardians: [{
							email: userEmail,
							firstName: fName,
							lastName: lName,
							name: fullName,
						}],
						updatedAt: new Date(),
					},
					{ merge: true }
				);

				if (!existingHhId) {
					await setDoc(userRef, { householdId: effectiveHhId }, { merge: true });
				}
			} else {
				const claimCoachInviteCallable = httpsCallable(functions, 'claimCoachInvite');
				const claimResult = await claimCoachInviteCallable({});
				const claimData = claimResult.data as { ok: boolean; claimed: boolean; teamId?: string };
				if (!claimData.claimed) {
					this.errorMsg =
						'No pending coach invite found for your email address. Ask your director to send you an invite first.';
					this.saving = false;
					return;
				}
				const payload = $state.snapshot({
					displayName: fullName,
					playerName: fullName,
					joinedAt,
					...this.basePrivacy,
				});
				await setDoc(userRef, payload, { merge: true });
				await auth.currentUser?.getIdToken(true);
			}

			await authStore.refresh({ silent: true });
			while (authStore.isLoading) {
				await new Promise<void>((r) => setTimeout(r, 50));
			}
			untrack(() => {
				goto(applyLoginWaterfall(authStore.role, authStore.userProfile), { replaceState: true });
			});
		} catch (err) {
			this.errorMsg =
				'Error: ' +
				(err && typeof err === 'object' && 'message' in err
					? String((err as { message: string }).message)
					: 'unknown');
			this.saving = false;
		}
	}

	async handleLogout() {
		await handleSignOut();
	}
}
