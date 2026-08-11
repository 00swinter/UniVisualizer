<script>
  let { 
    buffer, 
    fixedHeight = null, 
    fixedWidth = null 
  } = $props();

  let canvas = $state();

  let showR = $state(true);
  let showG = $state(true);
  let showB = $state(true);

  $effect(() => {
    if (canvas && buffer) {
      const ctx = canvas.getContext('2d');
      canvas.width = buffer.width;
      canvas.height = buffer.height;

      const processedData = new Uint8ClampedArray(buffer.data);

      if (!showR || !showG || !showB) {
        for (let i = 0; i < processedData.length; i += 4) {
          if (!showR) processedData[i] = 0;     // Red
          if (!showG) processedData[i + 1] = 0; // Green
          if (!showB) processedData[i + 2] = 0; // Blue
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
        onclick={() => showR = !showR} 
        title="Toggle Red Channel"
      >R</button>
      <button 
        class="ch-btn green" 
        class:active={showG} 
        onclick={() => showG = !showG} 
        title="Toggle Green Channel"
      >G</button>
      <button 
        class="ch-btn blue" 
        class:active={showB} 
        onclick={() => showB = !showB} 
        title="Toggle Blue Channel"
      >B</button>
    </div>
  {/if}

  {#if buffer}
    <canvas 
      bind:this={canvas}
      style:width={fixedWidth ? `${fixedWidth}px` : 'auto'}
      style:height={!fixedWidth && fixedHeight ? `${fixedHeight}px` : 'auto'}
      style:aspect-ratio="{buffer.width} / {buffer.height}"
      style:display="block"
    ></canvas>
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
    display: inline-block;
    position: relative;
    border: 1px solid #444;
    background: #000;
    line-height: 0;
  }

  .channel-tools {
    position: absolute;
    top: 8px;
    right: 8px;
    display: flex;
    gap: 4px;
    background: rgba(0, 0, 0, 0.6);
    padding: 4px;
    border-radius: 6px;
    backdrop-filter: blur(2px);
    z-index: 10;
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

  .ch-btn:hover { background: #333; }

  .ch-btn.active.red { background: #ef4444; color: white; border-color: #ef4444; }
  .ch-btn.active.green { background: #22c55e; color: white; border-color: #22c55e; }
  .ch-btn.active.blue { background: #3b82f6; color: white; border-color: #3b82f6; }


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
  }
</style>