<script lang="ts">
    import type { PixelBuffer } from '$lib/classes/PixelBuffer';

    interface KernelOffset {
        x: number;
        y: number;
    }

    interface Highlight {
        x: number;
        y: number;
        isCenter: boolean;
        borderColor: string;
    }

    interface Props {
        buffer: PixelBuffer | null;
        centerIndex?: number;
        kernelOffsets?: KernelOffset[];
        fixedWidth?: number | null;
        fixedHeight?: number | null;
    }

    let {
        buffer,
        centerIndex = 0,
        kernelOffsets = [],
        fixedWidth = null,
        fixedHeight = null
    }: Props = $props();

    let canvas: HTMLCanvasElement | undefined = $state();
    let showR = $state(true);
    let showG = $state(true);
    let showB = $state(true);

    $effect(() => {
        if (canvas && buffer) {
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            canvas.width = buffer.width;
            canvas.height = buffer.height;
            const processedData = new Uint8ClampedArray(buffer.data);

            if (!showR || !showG || !showB) {
                for (let i = 0; i < processedData.length; i += 4) {
                    if (!showR) processedData[i] = 0;
                    if (!showG) processedData[i + 1] = 0;
                    if (!showB) processedData[i + 2] = 0;
                }
            }
            ctx.putImageData(new ImageData(processedData, buffer.width, buffer.height), 0, 0);
        }
    });

    let highlights = $derived.by((): Highlight[] => {
        if (!buffer) return [];

        const cx = centerIndex % buffer.width;
        const cy = Math.floor(centerIndex / buffer.width);

        const neighbors: Highlight[] = [];
        let centerPixelData: Highlight | null = null;

        for (const offset of kernelOffsets) {
            const x = cx + offset.x;
            const y = cy + offset.y;

            if (x < 0 || x >= buffer.width || y < 0 || y >= buffer.height) {
                continue;
            }

            const isCenter = offset.x === 0 && offset.y === 0;
            let borderColor: string;

            if (isCenter) {
                borderColor = '#ff0033';
                centerPixelData = { x, y, isCenter, borderColor };
            } else {
                const pixel = buffer.getPixel(x, y);
                const brightness = pixel.r * 0.299 + pixel.g * 0.587 + pixel.b * 0.114;
                borderColor = brightness > 128 ? 'black' : 'white';
                neighbors.push({ x, y, isCenter, borderColor });
            }
        }

        if (centerPixelData) {
            return [...neighbors, centerPixelData];
        } else {
            return neighbors;
        }
    });
</script>

<div class="convolution-display">
    {#if buffer}
        <div class="channel-tools">
            <button class="ch-btn red" class:active={showR} onclick={() => showR = !showR}>R</button>
            <button class="ch-btn green" class:active={showG} onclick={() => showG = !showG}>G</button>
            <button class="ch-btn blue" class:active={showB} onclick={() => showB = !showB}>B</button>
        </div>

        <div class="visualizer-stack"
             style:width={fixedWidth ? `${fixedWidth}px` : 'auto'}
             style:height={!fixedWidth && fixedHeight ? `${fixedHeight}px` : 'auto'}
             style:aspect-ratio="{buffer.width} / {buffer.height}">
            
            <canvas bind:this={canvas}></canvas>

            <svg class="overlay" viewBox="0 0 {buffer.width} {buffer.height}" preserveAspectRatio="none">
                {#each highlights as h}
                    <rect 
                        x={h.x} y={h.y} width="1" height="1" 
                        style:stroke={h.borderColor}
                        class="highlight-rect" 
                        class:center-pixel={h.isCenter}
                    />
                {/each}
            </svg>
        </div>
    {:else}
        <div class="empty-state">No Data</div>
    {/if}
</div>

<style>
    .convolution-display {
        display: inline-block;
        position: relative;
        background: #000;
        border: 1px solid #444;
        font-family: sans-serif;
    }

    .visualizer-stack {
        position: relative;
        display: block;
    }

    canvas {
        display: block;
        width: 100%;
        height: 100%;
        image-rendering: pixelated;
        background-image: linear-gradient(45deg, #333 25%, transparent 25%), 
                          linear-gradient(-45deg, #333 25%, transparent 25%), 
                          linear-gradient(45deg, transparent 75%, #333 75%), 
                          linear-gradient(-45deg, transparent 75%, #333 75%);
        background-size: 20px 20px;
    }

    .overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        overflow: visible;
    }

    .highlight-rect {
        fill: transparent;
        vector-effect: non-scaling-stroke;
        stroke-width: 2px;
        shape-rendering: crispEdges; 
        filter: drop-shadow(0px 0px 1px rgba(0,0,0,0.5));
    }

    .highlight-rect.center-pixel {
        stroke-width: 3px;
        z-index: 10; 
        filter: drop-shadow(0px 0px 2px red);
    }

    .channel-tools {
        position: absolute;
        top: 8px;
        right: 8px;
        display: flex;
        gap: 4px;
        z-index: 20;
        background: rgba(0, 0, 0, 0.6);
        padding: 4px;
        border-radius: 6px;
        backdrop-filter: blur(2px);
    }

    .ch-btn {
        width: 24px;
        height: 24px;
        border: 1px solid #555;
        background: #222;
        color: #666;
        font-size: 0.75rem;
        font-weight: bold;
        border-radius: 4px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
    }
    .ch-btn:hover { background: #333; }
    .ch-btn.active.red { background: #ef4444; color: white; border-color: #ef4444; }
    .ch-btn.active.green { background: #22c55e; color: white; border-color: #22c55e; }
    .ch-btn.active.blue { background: #3b82f6; color: white; border-color: #3b82f6; }

    .empty-state {
        padding: 2rem;
        color: #666;
        text-align: center;
    }
</style>