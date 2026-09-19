import { resolve } from '$app/paths';

/** Resolve app paths without svelte-check overload friction on dynamic strings. */
export function resolveAppPath(path: string): string {
	if (!path || !path.startsWith('/')) {
		return path;
	}
	return (resolve as unknown as (route: string) => string)(path);
}
