import type { HandleClientError } from '@sveltejs/kit';

/**
 * Global client error handler — captures unhandled errors and formats
 * human-readable diagnostics for the +error.svelte boundary.
 */
export const handleError: HandleClientError = ({ error, event, status, message }) => {
	const err = error as (Error & { code?: string; status?: number }) | undefined;
	const errorMessage = err?.message || message || 'An unexpected runtime error occurred.';

	console.error('[SvelteKit Client Error]', {
		status,
		path: event?.url?.pathname,
		message: errorMessage,
		stack: err?.stack,
		error,
	});

	return {
		message: errorMessage,
		status: status || 500,
		stack: import.meta.env.DEV ? err?.stack : undefined,
	};
};
