import { isProfileComplete as computeIsProfileComplete } from '$lib/auth/profile.js';

/** User identity + profile document state. */
export function createUserState() {
	let user = $state(null);
	let userProfile = $state(null);
	let isProfileComplete = $state(false);

	function setProfile(profile) {
		userProfile = profile;
		isProfileComplete = computeIsProfileComplete(profile);
	}

	function clearUser() {
		user = null;
		userProfile = null;
		isProfileComplete = false;
	}

	const phoneNumber = $derived(/** @type {string | null} */ (user)?.phoneNumber ?? null);
	const phoneVerified = $derived(
		!!phoneNumber && !!(/** @type {Record<string, unknown>} */ (userProfile)?.phoneVerified),
	);
	const ageBand = $derived(
		/** @type {string} */ (
			(/** @type {Record<string, unknown>} */ (userProfile))?.ageBand ?? 'adult'
		),
	);
	const isTeenRestricted = $derived(ageBand === 'teen13to16');
	const isAdult = $derived(ageBand === 'adult');

	return {
		get user() {
			return user;
		},
		set user(v) {
			user = v;
		},
		get userProfile() {
			return userProfile;
		},
		get isProfileComplete() {
			return isProfileComplete;
		},
		get phoneNumber() {
			return phoneNumber;
		},
		get phoneVerified() {
			return phoneVerified;
		},
		get ageBand() {
			return ageBand;
		},
		get isTeenRestricted() {
			return isTeenRestricted;
		},
		get isAdult() {
			return isAdult;
		},
		setProfile,
		clearUser,
	};
}
