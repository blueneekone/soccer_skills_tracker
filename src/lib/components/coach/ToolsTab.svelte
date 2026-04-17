<script>
	import { workoutsStore } from '$lib/stores/workouts.svelte.js';

	let { teamId = '' } = $props();

	const exportXlsx = async () => {
		const w = workoutsStore.workouts;
		if (!w.length) return alert('No workout data found to export.');
		try {
			const XLSX = await import('xlsx');
			const exportData = w.map((item) => ({
				Date: item.createdAt ? new Date(item.createdAt.seconds * 1000).toLocaleDateString() : 'N/A',
				Name: item.name,
				Type: item.type || 'Workout',
				Level: item.reqLevel || 1,
				Description: item.drill || ''
			}));
			const ws = XLSX.utils.json_to_sheet(exportData);
			const wb = XLSX.utils.book_new();
			XLSX.utils.book_append_sheet(wb, ws, 'Team_Drills');
			XLSX.writeFile(wb, 'Team_Export.xlsx');
		} catch (e) {
			alert('Export error: ' + e.message);
		}
	};
</script>

<div class="tools-tab">
	<div class="card">
		<div class="card-header">⚙️ Coach Tools</div>
		<div class="card-body">
			<p class="text-sm-sub">Export team drill library and session data.</p>
			<button class="primary-btn btn-blue w-100" onclick={exportXlsx}>📊 Export Team Data (Excel)</button>
		</div>
	</div>
</div>
