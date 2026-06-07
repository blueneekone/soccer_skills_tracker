import { browser } from '$app/environment';

export type CheckrEmbedInstance = {
	render: (selector: string) => void;
};

export type CheckrWebSdk = {
	Embeds: {
		NewInvitation: new (options: Record<string, unknown>) => CheckrEmbedInstance;
	};
};

let cached: Promise<CheckrWebSdk> | null = null;

function resolveSdk(mod: Record<string, unknown>): CheckrWebSdk {
	if (mod.Embeds && typeof (mod.Embeds as CheckrWebSdk['Embeds']).NewInvitation === 'function') {
		return { Embeds: mod.Embeds as CheckrWebSdk['Embeds'] };
	}

	const def = mod.default as CheckrWebSdk | undefined;
	if (def?.Embeds?.NewInvitation) {
		return def;
	}

	const direct = mod as unknown as CheckrWebSdk;
	if (direct.Embeds?.NewInvitation) {
		return direct;
	}

	throw new Error('Checkr Web SDK loaded but Embeds.NewInvitation is unavailable.');
}

export function loadCheckrWebSdk(): Promise<CheckrWebSdk> {
	if (!browser) {
		return Promise.reject(new Error('Checkr Web SDK is only available in the browser.'));
	}

	if (!cached) {
		cached = import('@checkr/web-sdk')
			.then((mod) => resolveSdk(mod as Record<string, unknown>))
			.catch((err: unknown) => {
				cached = null;
				const msg = err instanceof Error ? err.message : String(err);
				throw new Error(`Failed to load Checkr Web SDK: ${msg}`);
			});
	}

	return cached;
}
