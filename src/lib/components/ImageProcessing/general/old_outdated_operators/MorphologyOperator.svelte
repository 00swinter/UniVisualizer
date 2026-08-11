<script>
    import { PixelBuffer } from '$lib/classes/PixelBuffer';

    let { 
        input, 
        output = $bindable(),
        isEnabled = true,
        exposedKernel = $bindable(),
    } = $props();

    let enabled = $state(isEnabled);
    let mode = $state('dilation');

    let gridState = $state(Array(49).fill(false));

    $effect.pre(() => {
        const center = 24;
        [center, center-1, center+1, center-7, center+7].forEach(i => gridState[i] = true);
    });

    let activeKernel = $derived.by(() => {
        const offsets = [];
        for (let i = 0; i < gridState.length; i++) {
            if (gridState[i]) {
                const col = i % 7;
                const row = Math.floor(i / 7);
                // Center is at (3, 3)
                offsets.push({ x: col - 3, y: row - 3 });
            }
        }
        return offsets;
    });

    $effect(() => {
        exposedKernel = activeKernel;
    });

    function loadPreset(name) {
        const newGrid = Array(49).fill(false);
        const center = 24;

        if (name === 'cross') {
            [center, center-1, center+1, center-7, center+7].forEach(i => newGrid[i] = true);
        } else if (name === 'square3') {
            // 3x3 Square around center
            for(let y=-1; y<=1; y++) 
                for(let x=-1; x<=1; x++) 
                    newGrid[center + y*7 + x] = true;
        } else if (name === 'disc5') {
            // Rough 5x5 Circle
            const indices = [
                -2, -1, 0, 1, 2, // y=0
                -1, 0, 1,        // y=-2
                -2, -1, 0, 1, 2, // y=-1
                -2, -1, 0, 1, 2, // y=1
                -1, 0, 1         // y=2
            ]; 
            for(let y=-2; y<=2; y++) {
                for(let x=-2; x<=2; x++) {
                    if (x*x + y*y <= 5) newGrid[center + y*7 + x] = true;
                }
            }
        }
        gridState = newGrid;
    }

    function getPixel(data, width, x, y) {
        if (x < 0) x = 0; else if (x >= width) x = width - 1;
        const height = data.length / (width * 4);
        if (y < 0) y = 0; else if (y >= height) y = height - 1;
        const i = (y * width + x) * 4;
        return { r: data[i], g: data[i+1], b: data[i+2] };
    }

    function runPass(sourceData, w, h, kernel, type) {
        const result = new Uint8ClampedArray(sourceData.length);
        for (let i = 0; i < sourceData.length; i += 4) {
            const x = (i / 4) % w;
            const y = Math.floor((i / 4) / w);

            let rVal, gVal, bVal;

            if (type === 'dilation') {
                rVal = 0; gVal = 0; bVal = 0;
                for (let k of kernel) {
                    const p = getPixel(sourceData, w, x + k.x, y + k.y);
                    if (p.r > rVal) rVal = p.r;
                    if (p.g > gVal) gVal = p.g;
                    if (p.b > bVal) bVal = p.b;
                }
            } else {
                rVal = 255; gVal = 255; bVal = 255;
                for (let k of kernel) {
                    const p = getPixel(sourceData, w, x + k.x, y + k.y);
                    if (p.r < rVal) rVal = p.r;
                    if (p.g < gVal) gVal = p.g;
                    if (p.b < bVal) bVal = p.b;
                }
            }
            result[i] = rVal; result[i+1] = gVal; result[i+2] = bVal; result[i+3] = sourceData[i+3];
        }
        return result;
    }

    $effect(() => {
        if (!input || !enabled) {
            output = enabled ? null : input;
            if (!enabled && input) output = input;
            return;
        }

        const w = input.width;
        const h = input.height;
        let finalData;

        if (activeKernel.length === 0) {
            output = input;
            return;
        }

        if (mode === 'dilation') {
            finalData = runPass(input.data, w, h, activeKernel, 'dilation');
        } else if (mode === 'erosion') {
            finalData = runPass(input.data, w, h, activeKernel, 'erosion');
        } else if (mode === 'opening') {
            const step1 = runPass(input.data, w, h, activeKernel, 'erosion');
            finalData = runPass(step1, w, h, activeKernel, 'dilation');
        } else if (mode === 'closing') {
            const step1 = runPass(input.data, w, h, activeKernel, 'dilation');
            finalData = runPass(step1, w, h, activeKernel, 'erosion');
        }

        output = new PixelBuffer(w, h, finalData);
    });
</script>

<div class="operator-card" class:disabled={!enabled}>
    <div class="header">
        <div class="header-left">
            <input type="checkbox" bind:checked={enabled} class="toggle-checkbox"/>
            <span class="icon">🦠</span>
            <span class="title">Morphology</span>
        </div>
    </div>

    <div class="controls" inert={!enabled}>
        <label>
            <span>Operation</span>
            <select bind:value={mode}>
                <option value="dilation">Dilation (Grow)</option>
                <option value="erosion">Erosion (Shrink)</option>
                <option value="opening">Opening (Clean Noise)</option>
                <option value="closing">Closing (Fill Holes)</option>
            </select>
        </label>

        <div class="kernel-section">
            <div class="kernel-header">
                <span>Kernel Grid (7x7)</span>
                <div class="presets">
                    <button onclick={() => loadPreset('cross')} title="Cross">✚</button>
                    <button onclick={() => loadPreset('square3')} title="3x3 Box">◼</button>
                    <button onclick={() => loadPreset('disc5')} title="Circle">●</button>
                </div>
            </div>

            <div class="grid-container">
                {#each gridState as active, i}
                    <button 
                        class="grid-cell" 
                        class:active={active}
                        class:center={i === 24}
                        onmousedown={() => gridState[i] = !gridState[i]}
                        aria-label="Toggle kernel pixel"
                    ></button>
                {/each}
            </div>
        </div>
    </div>
</div>

<style>
    .operator-card {
        background: #2a2a2a;
        border: 1px solid #444;
        border-radius: 8px;
        padding: 12px;
        color: #e0e0e0;
        width: 260px;
        font-family: sans-serif;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .operator-card.disabled {
        opacity: 0.6;
        border-color: #333;
        border-style: dashed;
    }

    .header {
        display: flex;
        align-items: center;
        border-bottom: 1px solid #444;
        padding-bottom: 8px;
    }
    .header-left { display: flex; align-items: center; gap: 8px; }
    .toggle-checkbox { width: 16px; height: 16px; cursor: pointer; accent-color: #3b82f6; }
    .icon { font-size: 1.2rem; }
    .title { font-weight: bold; font-size: 0.95rem; }

    .controls { display: flex; flex-direction: column; gap: 12px; }
    .controls label { display: flex; flex-direction: column; gap: 4px; font-size: 0.8rem; color: #aaa; }

    select {
        background: #181818; color: #fff; border: 1px solid #555;
        padding: 6px; border-radius: 4px; width: 100%; cursor: pointer;
    }

    .kernel-section {
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    .kernel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.8rem;
        color: #aaa;
    }

    .presets { display: flex; gap: 4px; }
    .presets button {
        background: #333; border: 1px solid #555; color: #ccc;
        width: 20px; height: 20px; font-size: 10px;
        display: flex; align-items: center; justify-content: center;
        cursor: pointer; border-radius: 3px; padding: 0;
    }
    .presets button:hover { background: #444; color: #fff; }

    .grid-container {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 2px;
        background: #111;
        padding: 2px;
        border: 1px solid #444;
        border-radius: 4px;
        aspect-ratio: 1;
    }

    .grid-cell {
        background: #222;
        border: none;
        cursor: pointer;
        padding: 0;
        border-radius: 1px;
    }

    .grid-cell:hover { background: #333; }

    .grid-cell.active {
        background: #3b82f6;
    }

    .grid-cell.center {
        position: relative;
    }
    .grid-cell.center::after {
        content: '';
        position: absolute;
        top: 25%; left: 25%; width: 50%; height: 50%;
        background: rgba(255,255,255,0.3);
        border-radius: 50%;
        pointer-events: none;
    }
    .grid-cell.active.center::after {
        background: rgba(255,255,255,0.6);
    }
</style>