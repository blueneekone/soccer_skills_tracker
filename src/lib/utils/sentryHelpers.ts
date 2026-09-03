import type { Event } from '@sentry/sveltekit';

export function sanitizeSentryEvent(event: Event): Event {
	const piiKeys = ['email', 'phone', 'birthdate', 'address', 'passport'];

	function scrub(obj: any): any {
		if (Array.isArray(obj)) {
			return obj.map(scrub);
		} else if (obj !== null && typeof obj === 'object') {
			const result: Record<string, any> = {};
			for (const key in obj) {
				if (piiKeys.includes(key.toLowerCase())) {
					result[key] = '[REDACTED_PII]';
				} else {
					result[key] = scrub(obj[key]);
				}
			}
			return result;
		}
		return obj;
	}

	const clonedEvent = JSON.parse(JSON.stringify(event));
	return scrub(clonedEvent) as Event;
}
