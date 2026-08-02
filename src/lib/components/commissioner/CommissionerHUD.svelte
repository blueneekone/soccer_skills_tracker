<script lang="ts">
	/**
	 * CommissionerHUD.svelte — Command Plane Status
	 * Strict 90-degree corners, zero gamification, Data Cyan telemetry.
	 */
</script>

<header class="command-plane-system-status w-full bg-[#0f172a] border-b border-[#334155] p-4 flex items-center justify-between z-10">
	<div class="flex items-center gap-4">
		<div class="w-8 h-8 bg-[#14b8a6] rounded-none flex items-center justify-center text-[#000000] font-bold font-geist-sans uppercase tracking-widest text-xs">
			FED
		</div>
		<div>
			<h1 class="text-white font-geist-sans uppercase tracking-widest text-sm m-0">Federation Command</h1>
			<p class="text-[#14b8a6] font-geist-mono text-xs m-0">STATUS: ODP ONLINE // MASTER TENANT ACTIVE</p>
		</div>
	</div>

	<div class="flex items-center gap-6 font-geist-mono text-xs text-[#334155]">
		<div class="flex flex-col text-right">
			<span class="uppercase tracking-widest">Network Safety</span>
			<span class="text-[#14b8a6]">SECURE</span>
		</div>
		<div class="w-px h-8 bg-[#334155]"></div>
		<div class="flex flex-col text-right">
			<span class="uppercase tracking-widest">Nodes</span>
			<span class="text-white">1,024 ACTIVE</span>
		</div>
	</div>
</header>
