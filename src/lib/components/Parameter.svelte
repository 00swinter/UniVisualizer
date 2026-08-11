<script lang="ts">
	type ParamType = 'range' | 'number' | 'boolean' | 'none' | 'display';

	interface Props {
		type?: ParamType;
		label?: string;
		value?: number | boolean;
		unit?: string;
		min?: number;
		max?: number;
		step?: number;
		color?: string;
	}

	let {
		type = 'none',
		label = 'sample text',
		value = $bindable(),
		unit = '',
		min = 0,
		max = 10,
		step = 1,
		color = 'white'
	}: Props = $props();
</script>

<div class="param-container" style="--accent-color: {color}">
    
    <div class="header">
        <span class="label">{label}</span>
        
        {#if (type === 'range' || type === 'display') && typeof value === 'number'}
            <span class="value-readout">{Math.round(value * 100) / 100}{unit}</span>
        {/if}
    </div>

    {#if type === 'range'}
        <input type="range" {min} {max} {step} bind:value class="slider"/>

    {:else if type === 'number'}
        <input type="number" {min} {max} {step} bind:value class="input-box"/>

    {:else if type === 'boolean'}
        <button 
            class="toggle-btn" 
            class:active={!!value} 
            onclick={() => (value = !value)}>
            {value ? "ON" : "OFF"}
        </button>
    {/if}

</div>

<style>
    .param-container {
        display: flex;
        flex-direction: column;
        background: #222;
        padding: 10px;
        border-radius: 15px;
        border: 2px solid #414141;
        border-left: 10px solid var(--accent-color);
        min-width: 100px;
        
        gap: 8px;
    }

    .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 1.1rem;
        color: #ddd;
        font-weight: bold;
    }

    .value-readout {
        font-family: monospace;
        color: white;
        border: solid 2px var(--accent-color);
        border-radius: 15px;
        padding: 5px;
        padding-left: 15px;
        padding-right: 15px;
        margin-left: 8px;

    }

    /* Range Slider — cross-browser (WebKit + Firefox) */
    .slider {
        -webkit-appearance: none;
        appearance: none;
        width: 100%;
        height: 22px;
        margin: 0;
        background: transparent;
        cursor: pointer;
    }

    .slider:focus {
        outline: none;
    }

    .slider:focus-visible::-webkit-slider-thumb {
        box-shadow:
            0 0 0 3px rgba(0, 0, 0, 0.45),
            0 0 0 5px color-mix(in srgb, var(--accent-color) 55%, transparent);
    }

    .slider:focus-visible::-moz-range-thumb {
        box-shadow:
            0 0 0 3px rgba(0, 0, 0, 0.45),
            0 0 0 5px color-mix(in srgb, var(--accent-color) 55%, transparent);
    }

    .slider::-webkit-slider-runnable-track {
        height: 6px;
        border-radius: 999px;
        background: #333;
        border: 1px solid #444;
    }

    .slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        margin-top: -6px;
        border-radius: 50%;
        background: var(--accent-color);
        border: 2px solid #111;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.45);
        cursor: pointer;
    }

    .slider::-moz-range-track {
        height: 6px;
        border-radius: 999px;
        background: #333;
        border: 1px solid #444;
    }

    .slider::-moz-range-thumb {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: var(--accent-color);
        border: 2px solid #111;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.45);
        cursor: pointer;
    }

    .slider::-moz-range-progress {
        height: 6px;
        border-radius: 999px;
        background: color-mix(in srgb, var(--accent-color) 45%, #333);
    }

    /* Input Box Styling (Number/Text) */
    .input-box {
        background: #333;
        border: 1px solid #444;
        color: white;
        padding: 5px;
        border-radius: 4px;
        width: 100%;
        box-sizing: border-box;
    }
    .input-box:focus {
        outline: none;
        border-color: var(--accent-color);
    }

    /* Toggle Button Styling */
    .toggle-btn {
        background: #444;
        color: #aaa;
        border: none;
        padding: 6px;
        border-radius: 4px;
        cursor: pointer;
        font-weight: bold;
        transition: 0.2s;
    }
    .toggle-btn.active {
        background: var(--accent-color);
        color: #111; /* Contrast text for active state */
    }
</style>