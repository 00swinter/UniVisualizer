<script>
    let { 
        type = "none",       // Options: 'range', 'number', 'boolean', 'none', display
        label = "sample text", 
        value = $bindable(),
        unit = "",  //  ° π m 
        min = 0, 
        max = 10, 
        step = 1, 
        color = "white" 
    } = $props();
</script>

<div class="param-container" style="--accent-color: {color}">
    
    <div class="header">
        <span class="label">{label}</span>
        
        {#if type === 'range' || type === 'display'}
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
            class:active={value} 
            onclick={() => value = !value}>
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

    /* Range Slider Styling */
    .slider {
        width: 100%;
        accent-color: var(--accent-color);
        cursor: pointer;
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