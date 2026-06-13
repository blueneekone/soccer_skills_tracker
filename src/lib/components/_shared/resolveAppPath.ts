import { resolve } from '$app/paths';

/** Resolve app paths without svelte-check overload friction on dynamic strings. */
export function resolveAppPath(path: string): string {
	return (resolve as (route: string) => string)(path);
}
