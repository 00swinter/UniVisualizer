<script lang="ts">
	import { Colors } from '$lib/classes/Colors';

	interface Option {
		label: string;
		value: string;
		color?: string;
	}

	interface Props {
		options: Option[];
		value?: string;
		borderColor?: string;
		textColor?: string;
		width?: string;
	}

	let {
		options,
		value = $bindable(),
		borderColor = Colors.blue_sky_dark(0.8),
		textColor = Colors.gray_white_dark(),
		width = '100%'
	}: Props = $props();
</script>

<div class="segmented-control" style="--accent-color: {borderColor}; --text-color: {textColor}; width: {width};">
    {#each options as option, i}
        {@const isSelected = value === option.value}
        
        <label 
            class:selected={isSelected}
            style:background-color={isSelected && option.color ? option.color : null}
            style:border-color={isSelected && option.color ? option.color : null}
        >
            <input 
                type="radio" 
                bind:group={value} 
                value={option.value} 
            />
            <span class="label-text">{option.label}</span>
            
            {#if i < options.length - 1}
                <div class="divider"></div>
            {/if}
        </label>
    {/each}
</div>

<style>
    .segmented-control {
        display: inline-flex;
        flex-direction: row;
        border: 1px solid var(--accent-color);
        border-radius: 6px;
        overflow: hidden;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 12px;
        background-color: rgba(0,0,0,0.2); 
    }

    label {
        position: relative;
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        color: var(--text-color);
        transition: background-color 0.2s ease-in-out, color 0.2s ease-in-out;
        user-select: none;
        font-weight: bold;
    }

    input[type="radio"] {
        position: absolute;
        opacity: 0;
        width: 0;
        height: 0;
    }

    .label-text {
        padding: 5px 10px;
        width: 100%;
        text-align: center;
        white-space: nowrap;
        z-index: 2;
    }

    /* Default Selected State */
    label.selected {
        background-color: var(--accent-color);
        color: white;
    }

    /* The Divider Line */
    .divider {
        position: absolute;
        right: 0;
        top: 0;
        bottom: 0;
        width: 1px;
        background-color: var(--accent-color);
        z-index: 1;
    }

    label.selected .divider,
    label:has(+ label.selected) .divider {
        opacity: 0;
    }
</style>