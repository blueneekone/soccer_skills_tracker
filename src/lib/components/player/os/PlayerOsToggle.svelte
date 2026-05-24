<script lang="ts">
	let {
		checked = false,
		disabled = false,
		label,
		onchange,
	}: {
		checked?: boolean;
		disabled?: boolean;
		label: string;
		onchange?: (value: boolean) => void;
	} = $props();
</script>

<button
	type="button"
	class="pd-os-toggle"
	class:pd-os-toggle--on={checked}
	class:pd-os-toggle--disabled={disabled}
	role="switch"
	aria-checked={checked}
	aria-label={label}
	{disabled}
	title={disabled ? 'Locked for minor accounts' : checked ? 'Click to disable' : 'Click to enable'}
	onclick={() => {
		if (!disabled) onchange?.(!checked);
	}}
>
	<span class="pd-os-toggle__state">{checked ? 'On' : 'Off'}</span>
</button>
