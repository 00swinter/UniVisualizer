<script lang="ts">
	interface Props {
		label?: string;
		checked?: boolean;
		id?: string;
	}

	let {
		label,
		checked = $bindable(false),
		id = Math.random().toString(36).substring(7)
	}: Props = $props();
</script>

<div class="option_group checkbox">
	{#if label}
		<label for={id}>{label}</label>
	{/if}
	<button
		type="button"
		{id}
		class="custom_checkbox"
		class:checked
		role="checkbox"
		aria-checked={checked}
		aria-label={label}
		onclick={() => (checked = !checked)}
	>
		{#if checked}
			<span class="material-icons-round check-icon">check</span>
		{/if}
	</button>
</div>

<style>
	.option_group {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 5px;
		margin-bottom: 10px;
	}

	label {
		font: 700 0.65rem 'Inter', sans-serif;
		color: #94a3b8;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		text-align: center;
		line-height: 1.2;
		max-width: 4.5rem;
	}

	.custom_checkbox {
		width: 24px;
		height: 24px;
		background: #161b22;
		border: 1px solid #343d4a;
		border-radius: 5px;
		color: #f1f5f9;
		cursor: pointer;
		outline: none;
		padding: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		transition:
			border-color 0.15s,
			background-color 0.15s;
	}

	.custom_checkbox:hover {
		border-color: #4b5563;
	}

	.custom_checkbox:focus-visible {
		border-color: #3b82f6;
	}

	.custom_checkbox.checked {
		background: #3b82f6;
		border-color: #3b82f6;
	}

	.check-icon {
		font-size: 0.85rem;
		line-height: 1;
	}
</style>
