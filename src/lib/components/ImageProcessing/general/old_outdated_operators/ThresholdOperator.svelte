<script>
    import { PixelBuffer } from '$lib/classes/PixelBuffer';

    let { 
        input, 
        output = $bindable(),
        isEnabled = true
    } = $props();

    // --- State ---
    let enabled = $state(isEnabled);
    let threshold = $state(128); // Default middle gray
    let mode = $state('binary'); // 'binary' or 'inverse'

    // --- Main Effect ---
    $effect(() => {
        if (!input) {
            output = null;
            return;
        }

        // Bypass Logic
        if (!enabled) {
            output = input;
            return;
        }

        const w = input.width;
        const h = input.height;
        const newData = new Uint8ClampedArray(input.data.length);
        const sourceData = input.data;

        for (let i = 0; i < sourceData.length; i += 4) {
            // Get Grayscale Luminance first (Standard weighting)
            const r = sourceData[i];
            const g = sourceData[i+1];
            const b = sourceData[i+2];
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;

            let val;
            if (mode === 'binary') {
                // Standard: Bright -> White, Dark -> Black
                val = gray >= threshold ? 255 : 0;
            } else {
                // Inverse: Bright -> Black, Dark -> White
                val = gray >= threshold ? 0 : 255;
            }

            newData[i] = val;
            newData[i+1] = val;
            newData[i+2] = val;
            newData[i+3] = sourceData[i+3]; // Preserve Alpha
        }

        output = new PixelBuffer(w, h, newData);
    });
</script>

<div class="operator-card" class:disabled={!enabled}>
    <div class="header">
        <div class="header-left">
            <input 
                type="checkbox" 
                bind:checked={enabled} 
                class="toggle-checkbox"
            />
            <span class="icon">🌗</span>
            <span class="title">Threshold</span>
        </div>
        <span class="value-display" class:dim={!enabled}>{threshold}</span>
    </div>

    <div class="controls" inert={!enabled}>
        <label>
            <span>Cutoff Level</span>
            <div class="slider-row">
                <span class="min">0</span>
                <input 
                    type="range" 
                    min="0" 
                    max="255" 
                    step="1" 
                    bind:value={threshold}
                />
                <span class="max">255</span>
            </div>
        </label>

        <label>
            <span>Mode</span>
            <select bind:value={mode}>
                <option value="binary">Standard (White > Thresh)</option>
                <option value="inverse">Inverse (Black > Thresh)</option>
            </select>
        </label>
    </div>
</div>

<style>
    .operator-card {
        background: #2a2a2a;
        border: 1px solid #444;
        border-radius: 8px;
        padding: 12px;
        color: #e0e0e0;
        width: 250px;
        font-family: sans-serif;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        display: flex;
        flex-direction: column;
        gap: 12px;
        transition: opacity 0.2s, border-color 0.2s;
    }

    .operator-card.disabled {
        opacity: 0.6;
        border-color: #333;
        border-style: dashed;
    }

    .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 1px solid #444;
        padding-bottom: 8px;
    }

    .header-left { display: flex; align-items: center; gap: 8px; }
    .toggle-checkbox { width: 16px; height: 16px; cursor: pointer; accent-color: #3b82f6; }
    .icon { font-size: 1.2rem; }
    .title { font-weight: bold; font-size: 0.95rem; }
    
    .value-display {
        font-family: monospace;
        background: #111;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 0.8rem;
        color: #4ade80; /* Green text */
        border: 1px solid #333;
    }
    .value-display.dim { color: #666; }

    .controls { display: flex; flex-direction: column; gap: 12px; }
    .controls label { display: flex; flex-direction: column; gap: 4px; font-size: 0.8rem; color: #aaa; }

    /* Slider Styling */
    .slider-row {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.75rem;
        color: #666;
    }

    input[type="range"] {
        flex: 1;
        cursor: pointer;
        accent-color: #4ade80; /* Match the value display color */
    }

    select {
        background: #181818; color: #fff; border: 1px solid #555;
        padding: 6px; border-radius: 4px; width: 100%; cursor: pointer;
    }
    select:hover { border-color: #777; }
</style>