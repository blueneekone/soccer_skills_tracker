/** @type {import('./$types').PageLoad} */
export function load({ params }) {
	const raw = params.playerKey;
	return {
		playerKey: typeof raw === 'string' ? raw : '',
	};
}
