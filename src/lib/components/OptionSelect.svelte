<script lang="ts">
	interface Option {
		id?: string;
		label?: string;
	}

	interface Props {
		label?: string;
		value?: string;
		options?: (Option | string)[];
		id?: string;
	}

	let {
		label,
		value = $bindable(),
		options = [],
		id = Math.random().toString(36).substring(7)
	}: Props = $props();
</script>

<div class="option_group">
    {#if label}
        <label for={id}>{label}</label>
    {/if}
    <select {id} bind:value class="custom_select">
        {#each options as opt}
            <option value={typeof opt === 'string' ? opt : (opt.id ?? '')}>{typeof opt === 'string' ? opt : (opt.label ?? opt.id ?? '')}</option>
        {/each}
    </select>
</div>

<style>
    .option_group {
        display: flex;
        flex-direction: column;
        gap: 5px;
        margin-bottom: 10px;
    }

    label {
        font: 700 0.65rem 'Inter', sans-serif;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .custom_select {
        background: #161b22;
        border: 1px solid #343d4a;
        color: #f1f5f9;
        border-radius: 5px;
        padding: 6px 8px;
        font-size: 0.8rem;
        cursor: pointer;
        outline: none;
        transition: border-color 0.15s;
    }

    .custom_select:focus {
        border-color: #3b82f6;
    }

    .custom_select option {
        background: #1e252e;
    }
</style>