<script lang="ts">
	let syncing = $state(false);
	let syncedDevices = $state<string[]>([]);
	let currentHrv = $state<number | null>(null);

	const syncGarmin = async () => {
		syncing = true;
		await new Promise((r) => setTimeout(r, 800));
		syncedDevices.push('Garmin Fenix 7');
		currentHrv = 62; // Mock HRV
		syncing = false;
	};

	const syncAppleHealth = async () => {
		syncing = true;
		await new Promise((r) => setTimeout(r, 800));
		syncedDevices.push('Apple Watch Series 9');
		currentHrv = 65; // Mock HRV
		syncing = false;
	};

	const syncWhoop = async () => {
		syncing = true;
		await new Promise((r) => setTimeout(r, 800));
		syncedDevices.push('Whoop 4.0');
		currentHrv = 58; // Mock HRV
		syncing = false;
	};
</script>

<div class="card">
	<div class="card-header">Wearable API Integrations</div>
	<div class="card-body">
		<p class="text-sm-sub mb-4">Connect your biometrics to allow the AI to autonomously adapt workloads based on Heart Rate Variability (HRV).</p>

		<div class="flex gap-2 mb-4">
			<button class="btn-primary btn-dark" onclick={syncAppleHealth} disabled={syncing}>
				{syncing ? 'Syncing...' : 'Connect Apple HealthKit'}
			</button>
			<button class="btn-primary" onclick={syncGarmin} disabled={syncing}>
				{syncing ? 'Syncing...' : 'Connect Garmin'}
			</button>
			<button class="btn-primary" onclick={syncWhoop} disabled={syncing}>
				{syncing ? 'Syncing...' : 'Connect Whoop'}
			</button>
		</div>

		{#if syncedDevices.length > 0}
			<div class="mt-4 p-4 rounded bg-gray-100 dark:bg-gray-800">
				<h4 class="font-bold mb-2">Connected Devices</h4>
				<ul class="list-disc pl-5">
					{#each syncedDevices as device}
						<li>{device}</li>
					{/each}
				</ul>
				{#if currentHrv !== null}
					<div class="mt-4 text-green-600 font-bold">
						Latest HRV: {currentHrv} ms (Baseline stable)
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>
