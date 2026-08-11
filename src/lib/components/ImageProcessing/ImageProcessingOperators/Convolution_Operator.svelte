<script>
    import OperatorBase from './OperatorBase.svelte';
    import { PixelBuffer } from '$lib/classes/PixelBuffer';
    import InfoContainer from '$lib/components/Info_Container.svelte';

    let { input, output = $bindable(), enabled = $bindable(true) } = $props();

    // Grid Dimensions
    let cols = $state(3);
    let rows = $state(3);
    
    // The Kernel Values (flat array representing the grid)
    let kernel = $state(Array(9).fill(0));
    
    // Anchor Point [x, y]
    let anchor = $state({ x: 1, y: 1 });

    // Update kernel array size when dimensions change
    $effect(() => {
        const size = cols * rows;
        if (kernel.length !== size) {
            kernel = Array(size).fill(0);
            // Reset anchor to center if it falls out of bounds
            anchor.x = Math.floor(cols / 2);
            anchor.y = Math.floor(rows / 2);
        }
    });

    function onReset() {
        cols = 3;
        rows = 3;
        kernel = Array(9).fill(0);
        kernel[4] = 1; // Default identity
        anchor = { x: 1, y: 1 };
    }

    $effect(() => {
        if (!input || !enabled) {
            output = input;
            return;
        }
        output = new PixelBuffer(input.width, input.height);
        // Logic for convolution goes here
    });
</script>

<OperatorBase title="Custom Kernel" icon="grid_on" bind:enabled {onReset}>
    <div class="kernel-ui">
        <div class="settings-bar">
            <div class="input-group">
                <label>Width</label>
                <input type="number" min="1" max="5" bind:value={cols} />
            </div>
            <div class="input-group">
                <label>Height</label>
                <input type="number" min="1" max="5" bind:value={rows} />
            </div>
            <div class="anchor-info">
                Anchor: <span>{anchor.x}, {anchor.y}</span>
            </div>
        </div>

        <div 
            class="kernel-grid" 
            style="grid-template-columns: repeat({cols}, 1fr);"
        >
            {#each Array(rows) as _, y}
                {#each Array(cols) as __, x}
                    {@const index = y * cols + x}
                    <div class="cell-wrapper" class:is-anchor={anchor.x === x && anchor.y === y}>
                        <input 
                            type="number" 
                            step="0.1"
                            bind:value={kernel[index]} 
                        />
                        <button 
                            class="anchor-btn" 
                            onclick={() => { anchor = { x, y }; }}
                            title="Set as Anchor"
                        ></button>
                    </div>
                {/each}
            {/each}
        </div>
    </div>

    <InfoContainer title="Instructions">
        <p>Set the <strong>weights</strong> in each field. Click the small dot in the corner of a cell to set the <strong>Anchor Point</strong>.</p>
    </InfoContainer>
</OperatorBase>

<style>
    .kernel-ui {
        display: flex;
        flex-direction: column;
        gap: 12px;
        background: #1a1a1a;
        padding: 16px;
        border-radius: 8px;
    }

    .settings-bar {
        display: flex;
        gap: 15px;
        align-items: center;
        border-bottom: 1px solid #333;
        padding-bottom: 10px;
    }

    .input-group {
        display: flex;
        flex-direction: column;
        font-size: 0.7rem;
        color: #888;
    }

    .input-group input {
        background: #222;
        border: 1px solid #444;
        color: white;
        width: 50px;
        border-radius: 4px;
        padding: 2px 5px;
    }

    .anchor-info {
        font-size: 0.75rem;
        color: #aaa;
        margin-left: auto;
    }

    .kernel-grid {
        display: grid;
        gap: 4px;
        justify-content: center;
    }

    .cell-wrapper {
        position: relative;
        background: #222;
        border: 2px solid transparent;
        border-radius: 4px;
        transition: all 0.2s;
    }

    .cell-wrapper.is-anchor {
        border-color: #ff3e00;
        background: #2a1a15;
    }

    .cell-wrapper input {
        width: 50px;
        height: 40px;
        background: transparent;
        border: none;
        color: white;
        text-align: center;
        font-family: monospace;
    }

    /* Hide arrows in number input */
    input::-webkit-outer-spin-button,
    input::-webkit-inner-spin-button {
        appearance: none;
        margin: 0;
    }

    .anchor-btn {
        position: absolute;
        top: 2px;
        right: 2px;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #444;
        border: none;
        cursor: pointer;
        padding: 0;
    }

    .is-anchor .anchor-btn {
        background: #ff3e00;
        box-shadow: 0 0 5px #ff3e00;
    }

    .anchor-btn:hover {
        background: #888;
    }
</style>