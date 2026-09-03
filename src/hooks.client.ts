import type { HandleClientError } from '@sveltejs/kit';
import * as Sentry from '@sentry/sveltekit';
import { sanitizeSentryEvent } from '$lib/utils/sentryHelpers';

Sentry.init({
	dsn: "https://example@o0.ingest.sentry.io/0", // Placeholder DSN
	tracesSampleRate: 1.0,
	beforeSend(event, hint) {
		const originalException = hint.originalException;
		
		if (originalException instanceof DOMException && originalException.name === 'SecurityError') {
			event.tags = { ...event.tags, security_anomaly: 'true' };
		}
		
		if (originalException instanceof TypeError && originalException.message.includes('Proxy')) {
			event.tags = { ...event.tags, svelte5_proxy_leak: 'true' };
		}
		
		return sanitizeSentryEvent(event);
	}
});

export const handleError: HandleClientError = Sentry.handleErrorWithSentry(({ error, event, status, message }) => {
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
});
