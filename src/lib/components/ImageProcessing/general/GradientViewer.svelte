<script lang="ts">
  import type { PixelBuffer } from "$lib/classes/PixelBuffer";
  import PixelBufferDisplay from "./PixelBufferDisplay.svelte";

  interface Props {
    buffer: PixelBuffer | null;
    scale?: number;
    imageWidth?: number;
    maxImageHeight?: number;
    /** Outer image-frame height (incl. borders); bindable for sibling layout. */
    imageHeight?: number;
  }

  type Channel = "r" | "g" | "b" | "a";
  type RowPixel = { r: number; g: number; b: number; a: number };

  const MAX_DISPLAY_WIDTH = 560;

  let {
    buffer,
    scale = 1,
    imageWidth,
    maxImageHeight = 380,
    imageHeight = $bindable(0),
  }: Props = $props();

  let gradientOpen = $state(false);
  let selectionPct = $state(0.5);

  let chartCanvas: HTMLCanvasElement | undefined = $state();
  let displayHeight = $state(200);

  /** Outer image-frame height (clientHeight + 1px borders), used to size/align the row slider. */
  let imageFrameHeight = $derived(Math.max(0, displayHeight + 2));

  $effect(() => {
    imageHeight = imageFrameHeight;
  });

  let showR = $state(true);
  let showG = $state(true);
  let showB = $state(true);
  let showA = $state(false);

  let chartShowR = $state(true);
  let chartShowG = $state(true);
  let chartShowB = $state(true);
  let chartShowA = $state(false);

  let resolvedWidth = $derived.by(() => {
    if (imageWidth != null) return imageWidth;
    if (!buffer || buffer.width <= 0) return 280;
    const byHeight = (buffer.width / buffer.height) * maxImageHeight;
    return Math.max(160, Math.floor(Math.min(byHeight, MAX_DISPLAY_WIDTH)));
  });

  let rowIndex = $derived.by(() => {
    if (!buffer || buffer.height <= 1) return 0;
    const row = Math.floor(selectionPct * (buffer.height - 1));
    return Math.max(0, Math.min(row, buffer.height - 1));
  });

  let scanLineTopPct = $derived.by(() => {
    if (!buffer || buffer.height === 0) return 50;
    return ((rowIndex + 0.5) / buffer.height) * 100;
  });

  let rowData = $derived.by((): RowPixel[] | null => {
    if (!buffer || !gradientOpen) return null;
    const width = buffer.width;
    const start = rowIndex * width * 4;
    const end = start + width * 4;
    if (end > buffer.data.length) return [];

    const rowSlice = new Uint8ClampedArray(buffer.data.slice(start, end));
    const pixels: RowPixel[] = [];
    for (let i = 0; i < rowSlice.length; i += 4) {
      pixels.push({
        r: rowSlice[i],
        g: rowSlice[i + 1],
        b: rowSlice[i + 2],
        a: rowSlice[i + 3],
      });
    }
    return pixels;
  });

  $effect(() => {
    if (chartCanvas && rowData) {
      const ctx = chartCanvas.getContext("2d");
      if (!ctx) return;

      const w = chartCanvas.width;
      const h = chartCanvas.height;

      ctx.fillStyle = "#181818";
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = "#333";
      ctx.lineWidth = 1;
      [0, 0.5, 1].forEach((p) => {
        const yPos = Math.floor(h - h * p) - 0.5;
        ctx.beginPath();
        ctx.moveTo(0, yPos);
        ctx.lineTo(w, yPos);
        ctx.stroke();
      });

      if (rowData.length === 0) return;

      const getY = (val: number) => h - (val / 255) * h;
      const getX = (index: number) => (index / (rowData.length - 1)) * w;

      const drawGraphLine = (color: string, channel: Channel) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(getX(0), getY(rowData[0][channel]));
        for (let i = 1; i < rowData.length; i++) {
          ctx.lineTo(getX(i), getY(rowData[i][channel]));
        }
        ctx.stroke();
      };

      if (chartShowR) drawGraphLine("#ef4444", "r");
      if (chartShowG) drawGraphLine("#22c55e", "g");
      if (chartShowB) drawGraphLine("#3b82f6", "b");
      if (chartShowA) drawGraphLine("#e5e7eb", "a");
    }
  });
</script>

<div class="gradient-viewer" class:open={gradientOpen} style="--scale: {scale}">
  {#if buffer}
    <div class="viewer-row">
      <!-- One shared box: image + chart + both RGBA stacks -->
      <div class="media-box" style:--media-w="{resolvedWidth}px">
        <div class="media-grid">
          <div class="image-slot">
            <PixelBufferDisplay
              {buffer}
              fixedWidth={resolvedWidth}
              showTools={false}
              bind:showR
              bind:showG
              bind:showB
              bind:showA
              bind:imageHeight={displayHeight}
            >
              {#if gradientOpen}
                <div
                  class="scan-line"
                  style:top="{scanLineTopPct}%"
                ></div>
              {/if}
            </PixelBufferDisplay>
          </div>

          <div class="img-channels">
            <button
              type="button"
              class="ch-btn red"
              class:active={showR}
              disabled={showA}
              onclick={() => (showR = !showR)}
              title="Toggle Red"
            >
              R
            </button>
            <button
              type="button"
              class="ch-btn green"
              class:active={showG}
              disabled={showA}
              onclick={() => (showG = !showG)}
              title="Toggle Green"
            >
              G
            </button>
            <button
              type="button"
              class="ch-btn blue"
              class:active={showB}
              disabled={showA}
              onclick={() => (showB = !showB)}
              title="Toggle Blue"
            >
              B
            </button>
            <button
              type="button"
              class="ch-btn alpha"
              class:active={showA}
              onclick={() => (showA = !showA)}
              title="View Alpha"
            >
              A
            </button>
          </div>

          {#if gradientOpen}
            <div class="chart-slot">
              <div class="chart-body">
                <div class="y-axis" aria-hidden="true">
                  <span>255</span>
                  <span>128</span>
                  <span>0</span>
                </div>
                <canvas
                  bind:this={chartCanvas}
                  width={resolvedWidth}
                  height={120}
                ></canvas>
              </div>
            </div>

            <div class="chart-channels">
              <button
                type="button"
                class="ch-btn red"
                class:active={chartShowR}
                onclick={() => (chartShowR = !chartShowR)}
                title="Toggle Red"
              >
                R
              </button>
              <button
                type="button"
                class="ch-btn green"
                class:active={chartShowG}
                onclick={() => (chartShowG = !chartShowG)}
                title="Toggle Green"
              >
                G
              </button>
              <button
                type="button"
                class="ch-btn blue"
                class:active={chartShowB}
                onclick={() => (chartShowB = !chartShowB)}
                title="Toggle Blue"
              >
                B
              </button>
              <button
                type="button"
                class="ch-btn alpha"
                class:active={chartShowA}
                onclick={() => (chartShowA = !chartShowA)}
                title="Toggle Alpha"
              >
                A
              </button>
            </div>
          {/if}
        </div>
      </div>

      {#if gradientOpen}
        <div
          class="gradient-ctrl"
          style:--image-h="{imageFrameHeight}px"
        >
          <div class="slider-wrap">
            <input
              type="range"
              min="0"
              max="1"
              step="0.001"
              bind:value={selectionPct}
              class="vertical-slider"
              style:width="{Math.max(40, imageFrameHeight)}px"
              aria-label="Scan row"
              aria-orientation="vertical"
            />
          </div>
          <button
            type="button"
            class="collapse-gradient"
            onclick={() => (gradientOpen = false)}
            title="Hide gradient"
          >
            <span class="material-icons-round">expand_less</span>
          </button>
        </div>
      {:else}
        <button
          type="button"
          class="view-gradient-tab"
          style:height="{imageFrameHeight}px"
          onclick={() => (gradientOpen = true)}
          aria-expanded="false"
        >
          <span class="tab-label">View Gradient</span>
        </button>
      {/if}
    </div>
  {:else}
    <div class="empty-msg">No Data</div>
  {/if}
</div>

<style>
  .gradient-viewer {
    display: inline-block;
    width: fit-content;
    max-width: 100%;
    color: #ddd;
    font-family: monospace;
    transform: scale(var(--scale));
    transform-origin: top left;
  }

  .viewer-row {
    --media-pad: 10px;
    --media-border: 1px;
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    gap: 10px;
    width: fit-content;
  }

  /* Shared floating box for image + graph + both RGBA stacks */
  .media-box {
    padding: var(--media-pad);
    border-radius: 12px;
    background: rgba(30, 30, 34, 0.92);
    border: var(--media-border) solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.4);
    box-sizing: border-box;
  }

  .media-grid {
    display: grid;
    grid-template-columns: var(--media-w) auto;
    grid-template-areas: "image imgCh";
    column-gap: 10px;
    row-gap: 10px;
    align-items: start;
    width: fit-content;
  }

  .open .media-grid {
    grid-template-areas:
      "image imgCh"
      "chart chartCh";
  }


  .image-slot {
    grid-area: image;
    width: var(--media-w);
    line-height: 0;
  }

  .image-slot :global(.image-frame) {
    width: var(--media-w);
    box-sizing: border-box;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 4px;
    overflow: hidden;
  }

  .image-slot :global(.image-frame canvas) {
    width: 100% !important;
    height: auto !important;
    display: block;
  }

  .chart-slot {
    grid-area: chart;
    width: var(--media-w);
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
  }

  .img-channels,
  .chart-channels {
    display: flex;
    flex-direction: column;
    gap: 6px;
    align-self: start;
  }

  .img-channels {
    grid-area: imgCh;
  }

  .chart-channels {
    grid-area: chartCh;
  }

  .chart-body {
    position: relative;
    width: var(--media-w);
    height: 120px;
    box-sizing: border-box;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 4px;
    overflow: hidden;
    background: #181818;
  }

  /* Overlay labels so the plot stays full image width */
  .y-axis {
    position: absolute;
    left: 4px;
    top: 2px;
    bottom: 2px;
    z-index: 2;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: flex-start;
    font-size: 0.65rem;
    color: #aaa;
    line-height: 1;
    pointer-events: none;
    user-select: none;
    text-shadow:
      0 0 3px #000,
      0 0 3px #000;
  }

  .chart-body canvas {
    display: block;
    width: 100%;
    height: 100%;
    border: none;
    box-sizing: border-box;
  }

  .gradient-ctrl {
    /* Match media-box inset so the slider area lines up with the image frame */
    padding-top: calc(var(--media-border) + var(--media-pad));
    display: flex;
    flex-direction: column;
    align-items: stretch;
    width: 36px;
    flex-shrink: 0;
    box-sizing: border-box;
    border-radius: 10px;
    background: rgba(30, 30, 34, 0.92);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.4);
    overflow: hidden;
  }

  .slider-wrap {
    height: var(--image-h);
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 0;
    box-sizing: border-box;
  }

  .collapse-gradient {
    display: grid;
    place-items: center;
    width: 100%;
    height: 28px;
    padding: 0;
    border: none;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 0;
    background: transparent;
    color: #888;
    cursor: pointer;
    flex-shrink: 0;
  }

  .collapse-gradient:hover {
    color: #ddd;
    background: rgba(255, 255, 255, 0.04);
  }

  .collapse-gradient .material-icons-round {
    font-size: 18px;
  }

  .view-gradient-tab {
    margin-top: calc(var(--media-border) + var(--media-pad));
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    padding: 8px 0;
    box-sizing: border-box;
    border-radius: 10px;
    background: rgba(30, 30, 34, 0.92);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.4);
    color: #94a3b8;
    cursor: pointer;
    font-family: inherit;
  }

  .view-gradient-tab:hover {
    color: #e2e8f0;
    border-color: rgba(59, 130, 246, 0.5);
  }

  .tab-label {
    writing-mode: vertical-rl;
    text-orientation: mixed;
    transform: rotate(180deg);
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    white-space: nowrap;
    user-select: none;
  }

  .ch-btn {
    width: 25.5px;
    height: 25.5px;
    border: 1px solid #444;
    background: #111;
    color: #666;
    font-size: 0.7rem;
    font-weight: bold;
    border-radius: 6px;
    cursor: pointer;
    display: grid;
    place-items: center;
    padding: 0;
    transition: all 0.15s;
  }

  .ch-btn:hover:not(:disabled) {
    border-color: #666;
    color: #ddd;
  }

  .ch-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .ch-btn.active.red {
    background: #ef4444;
    color: #fff;
    border-color: #ef4444;
  }
  .ch-btn.active.green {
    background: #22c55e;
    color: #fff;
    border-color: #22c55e;
  }
  .ch-btn.active.blue {
    background: #3b82f6;
    color: #fff;
    border-color: #3b82f6;
  }
  .ch-btn.active.alpha {
    background: #e5e7eb;
    color: #111;
    border-color: #e5e7eb;
  }

  .vertical-slider {
    -webkit-appearance: none;
    appearance: none;
    height: 22px;
    margin: 0;
    padding: 0;
    background: transparent;
    cursor: pointer;
    transform: rotate(90deg);
    transform-origin: center center;
    flex-shrink: 0;
  }

  .vertical-slider:focus {
    outline: none;
  }

  .vertical-slider::-webkit-slider-runnable-track {
    height: 6px;
    border-radius: 999px;
    background: #333;
    border: 1px solid #444;
  }

  .vertical-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    margin-top: -6px;
    border-radius: 50%;
    background: #ef4444;
    border: 2px solid #111;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.45);
    cursor: pointer;
  }

  .vertical-slider::-moz-range-track {
    height: 6px;
    border-radius: 999px;
    background: #333;
    border: 1px solid #444;
  }

  .vertical-slider::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #ef4444;
    border: 2px solid #111;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.45);
    cursor: pointer;
  }

  .scan-line {
    position: absolute;
    left: 0;
    right: 0;
    height: 1px;
    background-color: rgba(255, 0, 0, 0.9);
    box-shadow: 0 0 3px rgba(255, 0, 0, 0.8);
    pointer-events: none;
    z-index: 10;
    transform: translateY(-50%);
  }

  .empty-msg {
    padding: 24px;
    color: #666;
    text-align: center;
    border-radius: 10px;
    background: rgba(30, 30, 34, 0.92);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
</style>
