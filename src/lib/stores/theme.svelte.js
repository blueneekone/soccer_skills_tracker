import { browser } from '$app/environment';

const STORAGE_KEY = 'sstracker-theme';

/** @typedef {'light' | 'dark' | 'system'} ThemePreference */

function createThemeStore() {
	/** @type {ThemePreference} */
	let preference = $state('system');

	function effectiveDark() {
		if (!browser) return false;
		if (preference === 'dark') return true;
		if (preference === 'light') return false;
		return window.matchMedia('(prefers-color-scheme: dark)').matches;
	}

	function apply() {
		if (!browser) return;
		document.documentElement.classList.toggle('dark', effectiveDark());
	}

	function init() {
		if (!browser) return;
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored === 'light' || stored === 'dark' || stored === 'system') {
			preference = stored;
		}
		apply();
		const mq = window.matchMedia('(prefers-color-scheme: dark)');
		mq.addEventListener('change', () => {
			if (preference === 'system') apply();
		});
	}

	/** @param {ThemePreference} p */
	function setPreference(p) {
		preference = p;
		if (browser) localStorage.setItem(STORAGE_KEY, p);
		apply();
	}

	return {
		get preference() {
			return preference;
		},
		init,
		setPreference,
		/** Re-apply dark/light from preference (e.g. after leaving player-elite shell). */
		apply
	};
}

export const themeStore = createThemeStore();
