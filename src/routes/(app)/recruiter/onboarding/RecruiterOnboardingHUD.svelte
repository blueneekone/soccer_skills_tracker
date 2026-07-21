<script lang="ts">
	import type { RecruiterCheckStatus } from '$lib/types/backgroundCheck.js';

	let { status }: { status: RecruiterCheckStatus | 'not_started' } = $props();

	let badgeClass = $derived(
		status === 'clear' ? 'bg-green-100 text-green-800' :
		status === 'invited' ? 'bg-blue-100 text-blue-800' :
		status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
		status === 'consider' || status === 'suspended' ? 'bg-red-100 text-red-800' :
		'bg-gray-100 text-gray-800'
	);

	let label = $derived(
		status === 'clear' ? 'Cleared' :
		status === 'invited' ? 'Invited' :
		status === 'pending' ? 'Pending' :
		status === 'consider' || status === 'suspended' ? 'Needs Review' :
		'Not Started'
	);
</script>

<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {badgeClass}">
	{label}
</span>
