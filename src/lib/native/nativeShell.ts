/**
 * Capacitor native shell — parent-first entry for iOS/Android wrappers.
 * Production WebView loads https://sstracker.app (see capacitor.config.ts).
 */

export const NATIVE_SERVER_ORIGIN = 'https://sstracker.app';
export const NATIVE_PARENT_FIRST_ROUTE = '/parent/household';

type CapacitorWindow = Window & {
	Capacitor?: { isNativePlatform?: () => boolean };
};

/** True when running inside a Capacitor iOS/Android WebView. */
export function isNativeCapacitorShell(): boolean {
	if (typeof window === 'undefined') return false;
	const cap = (window as CapacitorWindow).Capacitor;
	return Boolean(cap?.isNativePlatform?.());
}

/** Marketing/login entry paths that should pivot to the parent lounge in native. */
export function isNativeParentFirstEntry(pathname: string): boolean {
	return pathname === '/' || pathname === '/login';
}

/** Login href that returns guardians to household after auth. */
export function getNativeLoginHref(): string {
	return `/login?redirect=${encodeURIComponent(NATIVE_PARENT_FIRST_ROUTE)}`;
}

/** Post-auth or cold-start destination for the native parent shell. */
export function getNativeDefaultRoute(isAuthenticated: boolean): string {
	return isAuthenticated ? NATIVE_PARENT_FIRST_ROUTE : getNativeLoginHref();
}
