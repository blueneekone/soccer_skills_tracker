<script lang="ts">
	import type { SystemSettingsEngine } from './SystemSettingsEngine.svelte.js';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';

	let { engine }: { engine: SystemSettingsEngine } = $props();
</script>

<div class="adm-toolbar ss-toolbar">
	<div class="adm-toolbar__left">
		<h1 class="adm-toolbar__title">System Settings</h1>
		<div class="adm-toolbar__meta">
			<span class="adm-toolbar__sub">
				Platform-level configuration. Changes here affect all tenants.
			</span>
		</div>
	</div>
</div>

<div class="ss-tabs" role="tablist" aria-label="System settings sections">
	<button
		type="button"
		class="ss-tab"
		class:ss-tab--active={engine.activeTab === 'access'}
		role="tab"
		aria-selected={engine.activeTab === 'access'}
		onclick={() => (engine.activeTab = 'access')}
	>
		<Icon name={"status.shield-check" as IconName} />
		<span>Access Control</span>
	</button>
	<button
		type="button"
		class="ss-tab"
		class:ss-tab--active={engine.activeTab === 'flags'}
		role="tab"
		aria-selected={engine.activeTab === 'flags'}
		onclick={() => (engine.activeTab = 'flags')}
	>
		<Icon name={"nav.toggle-on" as IconName} />
		<span>Feature Flags</span>
	</button>
	<button
		type="button"
		class="ss-tab"
		class:ss-tab--active={engine.activeTab === 'integrations'}
		role="tab"
		aria-selected={engine.activeTab === 'integrations'}
		onclick={() => (engine.activeTab = 'integrations')}
	>
		<Icon name={"sys.plug-zap" as IconName} />
		<span>External Integrations</span>
	</button>
</div>
