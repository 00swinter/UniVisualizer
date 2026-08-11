<script lang="ts">
	import type { PixelBuffer } from '$lib/classes/PixelBuffer';
	import PixelBufferDisplay from './PixelBufferDisplay.svelte';

	interface Props {
		buffer: PixelBuffer | null;
		scale?: number;
	}

	type Channel = 'r' | 'g' | 'b' | 'a';
	type RowPixel = { r: number; g: number; b: number; a: number };

	let { buffer, scale = 1 }: Props = $props();

	let gradientOpen = $state(false);
	let selectionPct = $state(0.5);

	let chartCanvas: HTMLCanvasElement | undefined = $state();
	let displayHeight = $state(200);

	let showR = $state(true);
	let showG = $state(true);
	let showB = $state(true);
	let showA = $state(false);

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
				a: rowSlice[i + 3]
			});
		}
		return pixels;
	});

	$effect(() => {
		if (chartCanvas && rowData) {
			const ctx = chartCanvas.getContext('2d');
			if (!ctx) return;

			const w = chartCanvas.width;
			const h = chartCanvas.height;

			ctx.fillStyle = '#181818';
			ctx.fillRect(0, 0, w, h);

			ctx.strokeStyle = '#333';
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

			if (showR) drawGraphLine('#ef4444', 'r');
			if (showG) drawGraphLine('#22c55e', 'g');
			if (showB) drawGraphLine('#3b82f6', 'b');
			if (showA) drawGraphLine('#e5e7eb', 'a');
		}
	});
</script>

<div class="gradient-inspector" class:compact={!gradientOpen} style="--scale: {scale}">
	{#if buffer}
		<div class="inspector-layout">
			<div class="image-wrapper">
				<PixelBufferDisplay buffer={buffer} fixedWidth={600} bind:imageHeight={displayHeight}>
					{#if gradientOpen}
						<div class="scan-line" style:top="{scanLineTopPct}%"></div>
					{/if}
				</PixelBufferDisplay>
			</div>

			{#if gradientOpen}
				<div class="slider-wrapper" style:height="{displayHeight}px">
					<input
						type="range"
						min="0"
						max="1"
						step="0.001"
						bind:value={selectionPct}
						class="vertical-slider"
						style:width="{displayHeight}px"
						aria-label="Scan row"
						aria-orientation="vertical"
					/>
				</div>
			{/if}
		</div>

		<button
			type="button"
			class="gradient-toggle"
			onclick={() => (gradientOpen = !gradientOpen)}
			aria-expanded={gradientOpen}
		>
			<span class="material-icons-round">{gradientOpen ? 'expand_less' : 'expand_more'}</span>
			<span>{gradientOpen ? 'Hide gradient' : 'Show gradient'}</span>
		</button>

		{#if gradientOpen}
			<div class="chart-container" style:width="600px">
				<div class="chart-header">
					<span>Row Index: {rowIndex}</span>

					<div class="toggles">
						<button
							class="toggle-btn red"
							class:active={showR}
							onclick={() => (showR = !showR)}
							title="Toggle Red"
						>
							R
						</button>
						<button
							class="toggle-btn green"
							class:active={showG}
							onclick={() => (showG = !showG)}
							title="Toggle Green"
						>
							G
						</button>
						<button
							class="toggle-btn blue"
							class:active={showB}
							onclick={() => (showB = !showB)}
							title="Toggle Blue"
						>
							B
						</button>
						<button
							class="toggle-btn alpha"
							class:active={showA}
							onclick={() => (showA = !showA)}
							title="Toggle Alpha"
						>
							A
						</button>
					</div>
				</div>

				<div class="chart-body">
					<div class="y-axis" aria-hidden="true">
						<span>255</span>
						<span>128</span>
						<span>0</span>
					</div>
					<canvas bind:this={chartCanvas} width={600} height={150}></canvas>
				</div>
			</div>
		{/if}
	{:else}
		<div class="empty-msg">No Data</div>
	{/if}
</div>

<style>
	.gradient-inspector {
		background: #252525;
		padding: 20px;
		border-radius: 8px;
		border: 1px solid #444;
		display: inline-flex;
		flex-direction: column;
		gap: 15px;
		color: #ddd;
		font-family: monospace;

		transform: scale(var(--scale));
		transform-origin: top left;
	}

	.gradient-inspector.compact {
		padding: 12px;
		gap: 10px;
	}

	.inspector-layout {
		display: flex;
		gap: 15px;
		align-items: flex-end;
	}

	.image-wrapper {
		position: relative;
		line-height: 0;
		display: flex;
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

	.slider-wrapper {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 30px;
		background: #1e1e1e;
		border-radius: 4px;
		padding: 0;
		border: 1px solid #333;
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

	.vertical-slider:focus-visible::-webkit-slider-thumb {
		box-shadow:
			0 0 0 3px rgba(0, 0, 0, 0.45),
			0 0 0 5px rgba(239, 68, 68, 0.45);
	}

	.vertical-slider:focus-visible::-moz-range-thumb {
		box-shadow:
			0 0 0 3px rgba(0, 0, 0, 0.45),
			0 0 0 5px rgba(239, 68, 68, 0.45);
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

	.vertical-slider::-moz-range-progress {
		height: 6px;
		border-radius: 999px;
		background: color-mix(in srgb, #ef4444 45%, #333);
	}

	.gradient-toggle {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		width: 600px;
		padding: 6px 10px;
		border: 1px dashed #444;
		border-radius: 4px;
		background: #1e1e1e;
		color: #888;
		font-family: inherit;
		font-size: 0.75rem;
		cursor: pointer;
		transition: all 0.15s;
	}

	.gradient-toggle:hover {
		color: #ddd;
		border-color: #666;
		background: #252525;
	}

	.gradient-toggle .material-icons-round {
		font-size: 18px;
	}

	.chart-container {
		background: #1e1e1e;
		border: 1px solid #444;
		padding: 10px;
		border-radius: 4px;
		box-sizing: border-box;
	}

	.chart-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 0.8rem;
		margin-bottom: 8px;
		color: #888;
	}

	.chart-body {
		display: flex;
		align-items: stretch;
		gap: 6px;
	}

	.y-axis {
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		align-items: flex-end;
		font-size: 0.7rem;
		color: #888;
		line-height: 1;
		padding: 1px 0;
		flex-shrink: 0;
		min-width: 3ch;
		user-select: none;
	}

	.toggles {
		display: flex;
		gap: 4px;
	}
	.toggle-btn {
		background: #111;
		border: 1px solid #444;
		color: #666;
		width: 24px;
		height: 24px;
		border-radius: 4px;
		font-size: 0.7rem;
		font-weight: bold;
		cursor: pointer;
		display: grid;
		place-items: center;
		transition: all 0.2s;
		padding: 0;
	}

	.toggle-btn.active.red {
		background: #ef4444;
		color: #fff;
		border-color: #ef4444;
		box-shadow: 0 0 8px rgba(239, 68, 68, 0.4);
	}
	.toggle-btn.active.green {
		background: #22c55e;
		color: #fff;
		border-color: #22c55e;
		box-shadow: 0 0 8px rgba(34, 197, 94, 0.4);
	}
	.toggle-btn.active.blue {
		background: #3b82f6;
		color: #fff;
		border-color: #3b82f6;
		box-shadow: 0 0 8px rgba(59, 130, 246, 0.4);
	}
	.toggle-btn.active.alpha {
		background: #e5e7eb;
		color: #111;
		border-color: #e5e7eb;
		box-shadow: 0 0 8px rgba(229, 231, 235, 0.4);
	}

	canvas {
		display: block;
		width: 100%;
		border: 1px solid #333;
		flex: 1;
		min-width: 0;
	}

	.empty-msg {
		padding: 20px;
		color: #666;
		text-align: center;
	}
</style>
