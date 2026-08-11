<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { PixelBuffer } from '$lib/classes/PixelBuffer';

  interface Props {
    buffer: PixelBuffer | null;
    fixedHeight?: number | null;
    fixedWidth?: number | null;
    imageHeight?: number;
    children?: Snippet;
  }

  let {
    buffer,
    fixedHeight = null,
    fixedWidth = null,
    imageHeight = $bindable(0),
    children
  }: Props = $props();

  let canvas: HTMLCanvasElement | undefined = $state();

  let showR = $state(true);
  let showG = $state(true);
  let showB = $state(true);
  let showA = $state(false);

  $effect(() => {
    if (canvas && buffer) {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = buffer.width;
      canvas.height = buffer.height;

      const processedData = new Uint8ClampedArray(buffer.data);

      for (let i = 0; i < processedData.length; i += 4) {
        if (showA) {
          // Alpha mode: grayscale mask only (RGB buttons disabled while active)
          const a = processedData[i + 3];
          processedData[i] = a;
          processedData[i + 1] = a;
          processedData[i + 2] = a;
          processedData[i + 3] = 255;
        } else {
          if (!showR) processedData[i] = 0;
          if (!showG) processedData[i + 1] = 0;
          if (!showB) processedData[i + 2] = 0;
          // keep processedData[i + 3] — real alpha / transparency
        }
      }

      const imageData = new ImageData(processedData, buffer.width, buffer.height);
      ctx.putImageData(imageData, 0, 0);
    }
  });
</script>

<div class="pixel-display">
  {#if buffer}
    <div class="channel-tools">
      <button 
        class="ch-btn red" 
        class:active={showR} 
        disabled={showA}
        onclick={() => showR = !showR} 
        title="Toggle Red Channel"
      >R</button>
      <button 
        class="ch-btn green" 
        class:active={showG} 
        disabled={showA}
        onclick={() => showG = !showG} 
        title="Toggle Green Channel"
      >G</button>
      <button 
        class="ch-btn blue" 
        class:active={showB} 
        disabled={showA}
        onclick={() => showB = !showB} 
        title="Toggle Blue Channel"
      >B</button>
      <button 
        class="ch-btn alpha" 
        class:active={showA} 
        onclick={() => showA = !showA} 
        title="View Alpha Channel"
      >view alpha</button>
    </div>

    <div class="image-frame" bind:clientHeight={imageHeight}>
      <canvas 
        bind:this={canvas}
        style:width={fixedWidth ? `${fixedWidth}px` : 'auto'}
        style:height={!fixedWidth && fixedHeight ? `${fixedHeight}px` : 'auto'}
        style:aspect-ratio="{buffer.width} / {buffer.height}"
        style:display="block"
      ></canvas>
      {@render children?.()}
    </div>
  {:else}
    <div 
      class="empty-state"
      style:width={fixedWidth ? `${fixedWidth}px` : 'auto'}
      style:height={fixedHeight ? `${fixedHeight}px` : '300px'}
    >No Data</div>
  {/if}
</div>

<style>
  .pixel-display {
    display: inline-flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 6px;
    line-height: 0;
  }

  .channel-tools {
    display: flex;
    gap: 4px;
    background: rgba(0, 0, 0, 0.6);
    padding: 4px;
    border-radius: 6px;
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
    transition: all 0.2s;
    padding: 0;
  }

  .ch-btn.alpha {
    width: auto;
    padding: 0 8px;
    white-space: nowrap;
  }

  .ch-btn:hover:not(:disabled) { background: #333; }

  .ch-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .ch-btn.active.red { background: #ef4444; color: white; border-color: #ef4444; }
  .ch-btn.active.green { background: #22c55e; color: white; border-color: #22c55e; }
  .ch-btn.active.blue { background: #3b82f6; color: white; border-color: #3b82f6; }
  .ch-btn.active.alpha { background: #e5e7eb; color: #111; border-color: #e5e7eb; }

  .image-frame {
    position: relative;
    border: 1px solid #444;
    background: #000;
  }

  canvas {
    image-rendering: pixelated; 
    background-image: linear-gradient(45deg, #333 25%, transparent 25%), 
                      linear-gradient(-45deg, #333 25%, transparent 25%), 
                      linear-gradient(45deg, transparent 75%, #333 75%), 
                      linear-gradient(-45deg, transparent 75%, #333 75%);
    background-size: 20px 20px;
  }

  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    color: #666;
    background: #222;
    border: 1px solid #444;
  }
</style>
