<script lang="ts">
  import { onMount } from "svelte";
  import { PixelBuffer } from "$lib/classes/PixelBuffer";

  interface Props {
    buffer?: PixelBuffer | null;
    maxRes?: number;
  hidden?: boolean;
  }

let { buffer = $bindable(null), maxRes = 1500, hidden = false }: Props = $props();

  let resolution = $state(250);
  let isLoading = $state(false);
  let selectedExample = $state("");
  let customUrl = $state("");
  let sourceImage: HTMLImageElement | null = $state(null);
  let fileInput: HTMLInputElement | undefined = $state();

  let isMenuOpen = $state(false);

  const examples: { name: string; url: string }[] = [
    {
      name: "Cat",
      url: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Black_cat_on_blue.jpg/1280px-Black_cat_on_blue.jpg",
    },
    {
      name: "Checkerboard Identity",
      url: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Checkerboard_identity.svg/330px-Checkerboard_identity.svg.png",
    },
    {
      name: "The Iguazu Falls",
      url: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/44_-_Iguazu_-_Décembre_2007.jpg/960px-44_-_Iguazu_-_Décembre_2007.jpg",
    },
    {
      name: "Multiple Dogs",
      url: "https://upload.wikimedia.org/wikipedia/commons/6/69/Dog_morphological_variation.png",
    },
    {
      name: "Rainbow Gradient",
      url: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Rainbow-gradient-fully-saturated.svg/1280px-Rainbow-gradient-fully-saturated.svg.png",
    },
    {
      name: "Gray Stepped Gradient",
      url: "https://upload.wikimedia.org/wikipedia/commons/9/9b/Escala_de_cinza.jpg",
    },
    {
      name: "Multiple Gray Gradient",
      url: "https://upload.wikimedia.org/wikipedia/commons/2/27/Grayscale_4bit_palette_color_test_chart.png",
    },
    {
      name: "Sunflower",
      url: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/Sunflower_from_Silesia.JPG/1280px-Sunflower_from_Silesia.JPG",
    },
    {
      name: "Traffic/Street",
      url: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Crossing_the_Hudson_River_on_the_George_Washington_Bridge_from_Fort_Lee%2C_New_Jersey_to_Manhattan%2C_New_York_%287237796950%29.jpg/500px-Crossing_the_Hudson_River_on_the_George_Washington_Bridge_from_Fort_Lee%2C_New_Jersey_to_Manhattan%2C_New_York_%287237796950%29.jpg",
    },
    {
      name: "Forest",
      url: "https://diff.wikimedia.org/wp-content/uploads/2025/10/1024px-Paudorf_Waldweg_am_Eichberg-4927.jpg?",
    },
    {
      name: "Lizard",
      url: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Large_Scaled_Forest_Lizard.jpg/1280px-Large_Scaled_Forest_Lizard.jpg",
    },
    {
      name: "Charles III",
      url: "https://upload.wikimedia.org/wikipedia/en/5/5b/Charles_III_by_Jonathan_Yeo.jpg",
    },
    {
      name: "TV Pixelart",
      url: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Pixelart-tv-iso.svg/1280px-Pixelart-tv-iso.svg.png",
    },
  ];

  const loadImageSource = async (src: string) => {
    isLoading = true;
    try {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.src = src;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Image failed to load"));
      });
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
      let targetWidth: number;
      let targetHeight: number;

      if (img.width > img.height) {
        targetWidth = resolution;
        targetHeight = Math.round(resolution / aspect);
      } else {
        targetHeight = resolution;
        targetWidth = Math.round(resolution * aspect);
      }

      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
      buffer = new PixelBuffer(targetWidth, targetHeight, imageData.data);
    }
  });

  const handleSelectExample = (url: string) => {
    selectedExample = url;
    loadImageSource(url);
  };

  const handleLoadUrl = () => {
    if (customUrl) loadImageSource(customUrl);
  };
  const handleFileUpload = (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result;
        if (typeof result === "string") loadImageSource(result);
      };
      reader.readAsDataURL(file);
    }
  };

  onMount(() => {
    const sunflower = examples.find((ex) => ex.name === "Sunflower");
    const initialUrl = sunflower?.url ?? examples[0].url;
    selectedExample = initialUrl;
    loadImageSource(initialUrl);
  });

  const closeMenu = () => {
    isMenuOpen = false;
  };
</script>

<div class="loader-wrapper">
  {#if !hidden && !isMenuOpen}
    <div class="main-card">
      <div class="slider-group">
        <span class="slider-label">Res</span>
        <input
          type="range"
          min="5"
          max={maxRes}
          bind:value={resolution}
          disabled={!sourceImage}
        />
        <span class="val">{resolution}px</span>
      </div>

      <button class="btn-main" onclick={() => (isMenuOpen = true)}>
        {sourceImage ? "Change image" : "Load image"}
      </button>
    </div>
  {/if}

  {#if isMenuOpen}
    <div
      class="modal-backdrop"
      onclick={closeMenu}
      role="presentation"
    ></div>

    <div class="modal-content">
      <div class="modal-header">
        <h3>Load Image</h3>
        <button class="btn-close" onclick={closeMenu}>✕</button>
      </div>

      <div class="modal-body">
        <div class="examples-section">
          <span class="section-label">Example</span>
          <div class="example-grid" role="listbox" aria-label="Example images">
            {#each examples as ex (ex.url)}
              <button
                type="button"
                class="example-card"
                class:selected={selectedExample === ex.url}
                role="option"
                aria-selected={selectedExample === ex.url}
                onclick={() => handleSelectExample(ex.url)}
              >
                <span class="example-name">{ex.name}</span>
                <img
                  class="example-thumb"
                  src={ex.url}
                  alt=""
                  loading="lazy"
                  referrerpolicy="no-referrer"
                />
              </button>
            {/each}
          </div>
        </div>

        <div class="option-row">
          <span class="opt-label">URL</span>
          <input type="text" placeholder="https://..." bind:value={customUrl} />
          <button
            class="btn-action"
            onclick={handleLoadUrl}
            disabled={!customUrl}>Go</button
          >
        </div>

        <div class="divider"><span>OR</span></div>

        <input
          type="file"
          accept="image/*"
          bind:this={fileInput}
          onchange={handleFileUpload}
          hidden
        />
        <button class="btn-upload" onclick={() => fileInput?.click()}>
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
    position: fixed;
    top: 12px;
    left: 12px;
    z-index: 40;
    font-family: system-ui, sans-serif;
    color: var(--text);
  }

  .main-card {
    background: rgba(30, 30, 30, 0.92);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 999px;
    padding: 7px 10px;
    width: auto;
    max-width: calc(100vw - 24px);
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 8px;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(10px);
  }

  .slider-group {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
  }

  .slider-label {
    font-size: 0.68rem;
    color: var(--text-dim);
    white-space: nowrap;
  }

  .val {
    color: var(--accent);
    font-family: monospace;
    font-size: 0.68rem;
    white-space: nowrap;
  }
  input[type="range"] {
    -webkit-appearance: none;
    appearance: none;
    width: 82px;
    height: 18px;
    margin: 0;
    background: transparent;
    cursor: pointer;
  }

  input[type="range"]:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }

  input[type="range"]:focus {
    outline: none;
  }

  input[type="range"]:focus-visible::-webkit-slider-thumb {
    box-shadow:
      0 0 0 3px rgba(0, 0, 0, 0.45),
      0 0 0 5px color-mix(in srgb, var(--accent) 55%, transparent);
  }

  input[type="range"]:focus-visible::-moz-range-thumb {
    box-shadow:
      0 0 0 3px rgba(0, 0, 0, 0.45),
      0 0 0 5px color-mix(in srgb, var(--accent) 55%, transparent);
  }

  input[type="range"]::-webkit-slider-runnable-track {
    height: 4px;
    border-radius: 999px;
    background: #333;
    border: 1px solid #444;
  }

  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 14px;
    height: 14px;
    margin-top: -5px;
    border-radius: 50%;
    background: var(--accent);
    border: 2px solid #111;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.45);
    cursor: pointer;
  }

  input[type="range"]:disabled::-webkit-slider-thumb {
    cursor: not-allowed;
  }

  input[type="range"]::-moz-range-track {
    height: 4px;
    border-radius: 999px;
    background: #333;
    border: 1px solid #444;
  }

  input[type="range"]::-moz-range-thumb {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--accent);
    border: 2px solid #111;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.45);
    cursor: pointer;
  }

  input[type="range"]:disabled::-moz-range-thumb {
    cursor: not-allowed;
  }

  input[type="range"]::-moz-range-progress {
    height: 4px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--accent) 45%, #333);
  }

  .btn-main {
    background: var(--accent);
    color: white;
    border: none;
    padding: 6px 9px;
    border-radius: 999px;
    font-weight: 600;
    font-size: 0.68rem;
    cursor: pointer;
    white-space: nowrap;
  }
  .btn-main:hover {
    background: var(--accent-hover);
  }

  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(2px);
    z-index: 99;
  }

  .modal-content {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: min(560px, calc(100vw - 32px));
    max-height: calc(100vh - 32px);
    overflow-y: auto;
    background: var(--modal-bg);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 20px;
    z-index: 100;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
    animation: fadeIn 0.2s ease-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }
  .modal-header h3 {
    margin: 0;
    font-size: 1rem;
    color: white;
  }
  .btn-close {
    background: none;
    border: none;
    color: var(--text-dim);
    font-size: 1.2rem;
    cursor: pointer;
  }
  .btn-close:hover {
    color: white;
  }

  .modal-body {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .examples-section {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .section-label {
    font-size: 0.8rem;
    color: var(--text-dim);
  }

  .example-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
  }

  .example-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 8px;
    padding: 8px 6px;
    color: white;
    cursor: pointer;
    min-width: 0;
  }

  .example-card:hover {
    background: #333;
    border-color: #555;
  }

  .example-card.selected {
    background: #2a3a55;
    border-color: var(--accent);
  }

  .example-name {
    width: 100%;
    font-size: 0.72rem;
    line-height: 1.2;
    text-align: center;
    color: var(--text);
    overflow: hidden;
    display: -webkit-box;
    line-clamp: 2;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    word-break: break-word;
  }

  .example-thumb {
    width: 72px;
    height: 72px;
    object-fit: cover;
    border-radius: 6px;
    background: #222;
    border: 1px solid #555;
    flex-shrink: 0;
  }

  .option-row {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .opt-label {
    width: 40px;
    font-size: 0.8rem;
    color: var(--text-dim);
    flex-shrink: 0;
  }

  input[type="text"] {
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
    height: 36px;
    cursor: pointer;
    flex-shrink: 0;
  }
  .btn-action:disabled {
    background: #444;
    color: #888;
    cursor: not-allowed;
  }

  .divider {
    text-align: center;
    position: relative;
    margin: 4px 0;
  }
  .divider::before {
    content: "";
    position: absolute;
    top: 50%;
    left: 0;
    width: 100%;
    height: 1px;
    background: #444;
    z-index: 0;
  }
  .divider span {
    position: relative;
    z-index: 1;
    background: var(--modal-bg);
    padding: 0 8px;
    font-size: 0.75rem;
    color: #666;
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
  .btn-upload:hover {
    background: #404040;
  }

  @media (max-width: 480px) {
    .example-grid {
      grid-template-columns: repeat(3, 1fr);
    }

    .example-thumb {
      width: 60px;
      height: 60px;
    }
  }
</style>
