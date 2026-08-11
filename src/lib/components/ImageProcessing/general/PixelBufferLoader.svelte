<script>
  import { onMount } from 'svelte'; // <--- Import this
  import { PixelBuffer } from "$lib/classes/PixelBuffer";

  // Props
  let { buffer = $bindable(), maxRes = 250} = $props();

  // State
  let resolution = $state(maxRes);
  let isLoading = $state(false);
  let selectedExample = $state("");
  let customUrl = $state("");
  let sourceImage = $state(null); 
  let fileInput; 
  
  let isMenuOpen = $state(false);

  const examples = [
    { name: "Cat", url: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Black_cat_on_blue.jpg/1280px-Black_cat_on_blue.jpg" },
    { name: "Checkerboard Identity", url: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Checkerboard_identity.svg/330px-Checkerboard_identity.svg.png" },
    { name: "The Iguazu Falls", url: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/44_-_Iguazu_-_Décembre_2007.jpg/960px-44_-_Iguazu_-_Décembre_2007.jpg" },
    { name: "Multiple Dogs", url: "https://upload.wikimedia.org/wikipedia/commons/6/69/Dog_morphological_variation.png" },
    { name: "Rainbow Gradient", url: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bc/20151204-IMG_2634Regenbogen6.jpg/2560px-20151204-IMG_2634Regenbogen6.jpg" },
    { name: "Gray Stepped Gradient", url: "https://upload.wikimedia.org/wikipedia/commons/9/9b/Escala_de_cinza.jpg" },
    { name: "Multiple Gray Gradient", url: "https://upload.wikimedia.org/wikipedia/commons/2/27/Grayscale_4bit_palette_color_test_chart.png" },
    { name: "Sunflower", url: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/Sunflower_from_Silesia.JPG/1280px-Sunflower_from_Silesia.JPG" },
    { name: "Traffic/Street", url: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Crossing_the_Hudson_River_on_the_George_Washington_Bridge_from_Fort_Lee%2C_New_Jersey_to_Manhattan%2C_New_York_%287237796950%29.jpg/500px-Crossing_the_Hudson_River_on_the_George_Washington_Bridge_from_Fort_Lee%2C_New_Jersey_to_Manhattan%2C_New_York_%287237796950%29.jpg" },
    { name: "Forest", url: "https://diff.wikimedia.org/wp-content/uploads/2025/10/1024px-Paudorf_Waldweg_am_Eichberg-4927.jpg?w=1024" },
    { name: "Lizard", url: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Large_Scaled_Forest_Lizard.jpg/1280px-Large_Scaled_Forest_Lizard.jpg" },
    { name: "Charles III", url: "https://upload.wikimedia.org/wikipedia/en/5/5b/Charles_III_by_Jonathan_Yeo.jpg" },
    { name: "Dragon Pixelart", url: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/50x50x1b.svg/2560px-50x50x1b.svg.png" },
  ];

  const loadImageSource = async (src) => {
    isLoading = true;
    try {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.src = src;
      await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; });
      sourceImage = img;
      isMenuOpen = false; 
    } catch (err) {
      console.error("Failed to load image", err);
    } finally {
      isLoading = false;
    }
  };

  $effect(() => {
    if (sourceImage) {
      const img = sourceImage;
      const aspect = img.width / img.height;
      let targetWidth, targetHeight;

      if (img.width > img.height) {
        targetWidth = resolution;
        targetHeight = Math.round(resolution / aspect);
      } else {
        targetHeight = resolution;
        targetWidth = Math.round(resolution * aspect);
      }

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
      buffer = new PixelBuffer(targetWidth, targetHeight, imageData.data);
    }
  });

  const handleLoadExample = () => { if (selectedExample) loadImageSource(selectedExample); };
  const handleLoadUrl = () => { if (customUrl) loadImageSource(customUrl); };
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => loadImageSource(ev.target.result);
        reader.readAsDataURL(file);
    }
  };

  onMount(() => {
    if (examples.length > 0) {
      selectedExample = examples[0].url;
      const random = examples[Math.floor(Math.random() * examples.length)].url;
      loadImageSource(random);
    }
  });
</script>

<div class="loader-wrapper">
  <div class="main-card">
    <div class="header">
        <span class="label">Source Image</span>
        {#if isLoading}
            <span class="status loading">Loading...</span>
        {:else if sourceImage}
            <span class="status success">Active</span>
        {:else}
            <span class="status idle">None</span>
        {/if}
    </div>

    <div class="slider-group">
        <div class="slider-info">
            <span>Resolution</span>
            <span class="val">{resolution}px</span>
        </div>
        <input 
            type="range" 
            min="5" max={maxRes} 
            bind:value={resolution} 
            disabled={!sourceImage}
        />
    </div>

    <button class="btn-main" onclick={() => isMenuOpen = true}>
        {sourceImage ? '🔄 Replace Image' : '➕ Load Image'}
    </button>
  </div>

  {#if isMenuOpen}
    <div class="modal-backdrop" onclick={() => isMenuOpen = false} role="presentation"></div>
    
    <div class="modal-content">
        <div class="modal-header">
            <h3>Load Image</h3>
            <button class="btn-close" onclick={() => isMenuOpen = false}>✕</button>
        </div>

        <div class="modal-body">
            <div class="option-row">
                <span class="opt-label">Example</span>
                <select bind:value={selectedExample}>
                    <option value="" disabled selected>Select preset...</option>
                    {#each examples as ex}
                        <option value={ex.url}>{ex.name}</option>
                    {/each}
                </select>
                <button class="btn-action" onclick={handleLoadExample} disabled={!selectedExample}>Go</button>
            </div>

            <div class="option-row">
                <span class="opt-label">URL</span>
                <input type="text" placeholder="https://..." bind:value={customUrl} />
                <button class="btn-action" onclick={handleLoadUrl} disabled={!customUrl}>Go</button>
            </div>

            <div class="divider"><span>OR</span></div>

            <input 
                type="file" 
                accept="image/*" 
                bind:this={fileInput} 
                onchange={handleFileUpload} 
                hidden 
            />
            <button class="btn-upload" onclick={() => fileInput.click()}>
                📂 Upload from Computer
            </button>
        </div>
    </div>
  {/if}
</div>

<style>
  :global(:root) {
    --card-bg: #1e1e1e;
    --modal-bg: #252525;
    --border: #444;
    --text: #e0e0e0;
    --text-dim: #888;
    --accent: #3b82f6;
    --accent-hover: #2563eb;
    --success: #10b981;
  }

  .loader-wrapper {
    position: relative;
    font-family: system-ui, sans-serif;
    color: var(--text);
  }

  .main-card {
    background: var(--card-bg);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 16px;
    width: 300px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.2);
  }

  .header {
    display: flex;
    justify-content: space-between;
    font-size: 0.9rem;
    font-weight: 600;
  }

  .status { font-size: 0.75rem; text-transform: uppercase; font-weight: 700; }
  .status.loading { color: var(--accent); }
  .status.success { color: var(--success); }
  .status.idle { color: var(--text-dim); }

  .slider-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .slider-info { display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--text-dim); }
  .val { color: var(--accent); font-family: monospace; }
  input[type="range"] { width: 100%; accent-color: var(--accent); cursor: pointer; }

  .btn-main {
    background: var(--accent);
    color: white;
    border: none;
    padding: 10px;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
  }
  .btn-main:hover { background: var(--accent-hover); }


  .modal-backdrop {
    position: fixed;
    top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(0,0,0,0.6);
    backdrop-filter: blur(2px);
    z-index: 99;
  }

  .modal-content {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translateY(-500px) translateX(-160px);
    width: 320px;
    background: var(--modal-bg);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 16px;
    z-index: 100;
    box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    animation: slideIn 0.5s ease-out;
  }

  @keyframes slideIn {
    from { opacity: 0;}
    to { opacity: 1;}
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }
  .modal-header h3 { margin: 0; font-size: 1rem; color: white; }
  .btn-close {
    background: none; border: none; color: var(--text-dim);
    font-size: 1.2rem; cursor: pointer;
  }
  .btn-close:hover { color: white; }

  .modal-body { display: flex; flex-direction: column; gap: 12px; }

  .option-row {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .opt-label { width: 60px; font-size: 0.8rem; color: var(--text-dim); }

  select, input[type="text"] {
    flex: 1;
    background: #333;
    border: 1px solid #555;
    color: white;
    padding: 6px;
    border-radius: 4px;
    font-size: 0.85rem;
  }

  .btn-action {
    background: var(--accent);
    color: white;
    border: none;
    border-radius: 4px;
    padding: 0 10px;
    width: 50px;
    height: 50px;
    cursor: pointer;
  }
  .btn-action:disabled { background: #444; color: #888; cursor: not-allowed; }

  .divider {
    text-align: center;
    position: relative;
    margin: 8px 0;
  }
  .divider::before {
    content: ''; position: absolute; top: 50%; left: 0; width: 100%; height: 1px; background: #444; z-index: 0;
  }
  .divider span {
    position: relative; z-index: 1; background: var(--modal-bg); padding: 0 8px; font-size: 0.75rem; color: #666;
  }

  .btn-upload {
    width: 100%;
    padding: 10px;
    background: #333;
    border: 1px solid #555;
    color: var(--text);
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
  }
  .btn-upload:hover { background: #404040; }

</style>