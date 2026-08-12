<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { PixelBuffer } from '$lib/classes/PixelBuffer';

	interface Props {
		buffer: PixelBuffer | null;
		fixedHeight?: number | null;
		fixedWidth?: number | null;
		imageHeight?: number;
		showTools?: boolean;
		showR?: boolean;
		showG?: boolean;
		showB?: boolean;
		showA?: boolean;
		hoveredPixel?: { x: number; y: number; r: number; g: number; b: number; a: number } | null;
		histogramHighlightBin?: number | null;
		histogramHighlightChannels?: { r: boolean; g: boolean; b: boolean; a: boolean };
		showHistogramMatches?: boolean;
		children?: Snippet;
	}

	type HoverValueLine = { value: number | string; label: string };

	let {
		buffer,
		fixedHeight = null,
		fixedWidth = null,
		imageHeight = $bindable(0),
		showTools = true,
		showR = $bindable(true),
		showG = $bindable(true),
		showB = $bindable(true),
		showA = $bindable(false),
		hoveredPixel = $bindable(null),
		histogramHighlightBin = null,
		histogramHighlightChannels = { r: true, g: true, b: true, a: false },
		showHistogramMatches = false,
		children
	}: Props = $props();

	let canvas: HTMLCanvasElement | undefined = $state();
	let overlayCanvas: HTMLCanvasElement | undefined = $state();
	let hoveredImageX = $state<number | null>(null);
	let hoveredImageY = $state<number | null>(null);

	let hoveredImagePixel = $derived.by(() => {
		if (!buffer || hoveredImageX == null || hoveredImageY == null) return null;

		const x = Math.max(0, Math.min(hoveredImageX, buffer.width - 1));
		const y = Math.max(0, Math.min(hoveredImageY, buffer.height - 1));
		const index = (y * buffer.width + x) * 4;

		if (index + 3 >= buffer.data.length) return null;

		return {
			x,
			y,
			r: buffer.data[index],
			g: buffer.data[index + 1],
			b: buffer.data[index + 2],
			a: buffer.data[index + 3]
		};
	});

	$effect(() => {
		hoveredPixel = hoveredImagePixel;
	});

	let hoveredImageLines = $derived.by((): HoverValueLine[] => {
		if (!hoveredImagePixel) return [];

		return [
			{ value: `(${hoveredImagePixel.x}, ${hoveredImagePixel.y})`, label: '' },
			{ value: hoveredImagePixel.r, label: 'R' },
			{ value: hoveredImagePixel.g, label: 'G' },
			{ value: hoveredImagePixel.b, label: 'B' },
			{ value: hoveredImagePixel.a, label: 'A' }
		];
	});

	function updateHoveredImage(event: MouseEvent) {
		if (!buffer || buffer.width <= 0 || buffer.height <= 0) {
			hoveredImageX = null;
			hoveredImageY = null;
			return;
		}

		const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
		const relativeX = Math.max(0, Math.min(event.clientX - rect.left, rect.width));
		const relativeY = Math.max(0, Math.min(event.clientY - rect.top, rect.height));

		hoveredImageX = Math.max(
			0,
			Math.min(Math.floor((relativeX / rect.width) * buffer.width), buffer.width - 1)
		);
		hoveredImageY = Math.max(
			0,
			Math.min(Math.floor((relativeY / rect.height) * buffer.height), buffer.height - 1)
		);
	}

	function clearHoveredImage() {
		hoveredImageX = null;
		hoveredImageY = null;
	}

	$effect(() => {
		if (canvas && buffer) {
			const ctx = canvas.getContext('2d');
			if (!ctx) return;

			canvas.width = buffer.width;
			canvas.height = buffer.height;

			const processedData = new Uint8ClampedArray(buffer.data);

			for (let i = 0; i < processedData.length; i += 4) {
				if (showA) {
					const a = processedData[i + 3];
					processedData[i] = a;
					processedData[i + 1] = a;
					processedData[i + 2] = a;
					processedData[i + 3] = 255;
				} else {
					if (!showR) processedData[i] = 0;
					if (!showG) processedData[i + 1] = 0;
					if (!showB) processedData[i + 2] = 0;
				}
			}

			const imageData = new ImageData(processedData, buffer.width, buffer.height);
			ctx.putImageData(imageData, 0, 0);
		}
	});

	$effect(() => {
		if (!overlayCanvas) return;

		const ctx = overlayCanvas.getContext('2d');
		if (!ctx) return;

		const width = buffer?.width ?? 0;
		const height = buffer?.height ?? 0;
		overlayCanvas.width = width;
		overlayCanvas.height = height;
		ctx.clearRect(0, 0, width, height);

		if (
			!buffer ||
			!showHistogramMatches ||
			histogramHighlightBin == null ||
			width <= 0 ||
			height <= 0
		) {
			return;
		}

		const matchBin = Math.max(0, Math.min(histogramHighlightBin, 255));
		const { r: useR, g: useG, b: useB, a: useA } = histogramHighlightChannels;
		const source = buffer.data;

		ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
		ctx.fillRect(0, 0, width, height);

		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				const index = (y * width + x) * 4;
				const matchesR = useR && source[index] === matchBin;
				const matchesG = useG && source[index + 1] === matchBin;
				const matchesB = useB && source[index + 2] === matchBin;
				const matchesA = useA && source[index + 3] === matchBin;

				if (!matchesR && !matchesG && !matchesB && !matchesA) continue;

				let fill = 'rgba(255, 255, 255, 0.9)';
				const matchCount =
					Number(matchesR) + Number(matchesG) + Number(matchesB) + Number(matchesA);

				if (matchCount === 1) {
					if (matchesR) fill = 'rgba(239, 68, 68, 0.95)';
					else if (matchesG) fill = 'rgba(34, 197, 94, 0.95)';
					else if (matchesB) fill = 'rgba(59, 130, 246, 0.95)';
					else fill = 'rgba(229, 231, 235, 0.95)';
				}

				ctx.clearRect(x, y, 1, 1);
				ctx.fillStyle = fill;
				ctx.fillRect(x, y, 1, 1);
			}
		}
	});
</script>

<div class="pixel-display" class:tools-hidden={!showTools}>
	{#if buffer}
		{#if showTools}
			<div class="channel-tools">
				<button
					class="ch-btn red"
					class:active={showR}
					disabled={showA}
					onclick={() => (showR = !showR)}
					title="Toggle Red Channel"
				>
					R
				</button>
				<button
					class="ch-btn green"
					class:active={showG}
					disabled={showA}
					onclick={() => (showG = !showG)}
					title="Toggle Green Channel"
				>
					G
				</button>
				<button
					class="ch-btn blue"
					class:active={showB}
					disabled={showA}
					onclick={() => (showB = !showB)}
					title="Toggle Blue Channel"
				>
					B
				</button>
				<button
					class="ch-btn alpha"
					class:active={showA}
					onclick={() => (showA = !showA)}
					title="View Alpha Channel"
				>
					view alpha
				</button>
			</div>
		{/if}

		<div class="image-frame" bind:clientHeight={imageHeight}>
			<canvas
				bind:this={canvas}
				style:width={fixedWidth ? `${fixedWidth}px` : 'auto'}
				style:height={!fixedWidth && fixedHeight ? `${fixedHeight}px` : 'auto'}
				style:aspect-ratio="{buffer.width} / {buffer.height}"
				style:display="block"
			></canvas>
			<canvas
				bind:this={overlayCanvas}
				class="image-highlight-overlay"
				aria-hidden="true"
			></canvas>
			<div
				class="image-hover-layer"
				role="img"
				aria-label="Image pixel values"
				onmousemove={updateHoveredImage}
				onmouseleave={clearHoveredImage}
			></div>
			{#if hoveredImageLines.length > 0}
				<div class="image-hover-info">
					{#each hoveredImageLines as line (line.label)}
						<div class="hover-line-item" class:no-label={!line.label}>
							<span class="hover-line-value">{line.value}</span>
							{#if line.label}
								<span class="hover-line-label">- {line.label}</span>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
			{@render children?.()}
		</div>
	{:else}
		<div
			class="empty-state"
			style:width={fixedWidth ? `${fixedWidth}px` : 'auto'}
			style:height={fixedHeight ? `${fixedHeight}px` : '300px'}
		>
			No Data
		</div>
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

	.pixel-display.tools-hidden {
		align-items: stretch;
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

	.ch-btn:hover:not(:disabled) {
		background: #333;
	}

	.ch-btn:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}

	.ch-btn.active.red {
		background: #ef4444;
		color: white;
		border-color: #ef4444;
	}
	.ch-btn.active.green {
		background: #22c55e;
		color: white;
		border-color: #22c55e;
	}
	.ch-btn.active.blue {
		background: #3b82f6;
		color: white;
		border-color: #3b82f6;
	}
	.ch-btn.active.alpha {
		background: #e5e7eb;
		color: #111;
		border-color: #e5e7eb;
	}

	.image-frame {
		position: relative;
		border: 1px solid rgba(255, 255, 255, 0.12);
		background: #000;
		border-radius: 6px;
		overflow: hidden;
	}

	.image-hover-layer {
		position: absolute;
		inset: 0;
		z-index: 5;
	}

	.image-highlight-overlay {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		z-index: 4;
		pointer-events: none;
		image-rendering: pixelated;
	}

	.image-hover-info {
		position: absolute;
		top: 6px;
		right: 8px;
		z-index: 6;
		font-size: 0.65rem;
		font-family: monospace;
		color: #ddd;
		line-height: 1.1;
		padding: 3px 5px;
		border-radius: 4px;
		background: rgba(0, 0, 0, 0.5);
		pointer-events: none;
		user-select: none;
		text-align: right;
		text-shadow:
			0 0 3px #000,
			0 0 3px #000;
	}

	.hover-line-item {
		display: grid;
		grid-template-columns: auto auto;
		justify-content: end;
		column-gap: 0.45rem;
	}

	.hover-line-item.no-label {
		grid-template-columns: auto;
	}

	.hover-line-value {
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	.hover-line-label {
		text-align: left;
	}

	canvas {
		image-rendering: pixelated;
		background-image:
			linear-gradient(45deg, #333 25%, transparent 25%),
			linear-gradient(-45deg, #333 25%, transparent 25%),
			linear-gradient(45deg, transparent 75%, #333 75%),
			linear-gradient(-45deg, transparent 75%, #333 75%);
		background-size: 20px 20px;
	}

	.image-highlight-overlay {
		background: transparent;
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
