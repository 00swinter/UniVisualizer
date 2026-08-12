<script lang="ts">
	import type { PixelBuffer } from '$lib/classes/PixelBuffer';
	import OptionCheckbox from '$lib/components/OptionCheckbox.svelte';

	interface Props {
		input: PixelBuffer | null;
		width?: string;
		/** Match sibling image frame height (px). */
		matchHeight?: number;
		/** Top offset to align with image inside its padded media box (px). */
		offsetTop?: number;
		onExpand?: (() => void) | undefined;
		/** Currently hovered bin index (0-255), bindable so siblings can read it. */
		hoveredBin?: number | null;
		/** External highlight bins to show as indicator lines (e.g. from gradient/image hover). */
		externalHighlightBins?: { bin: number; color: string }[];
	}

	let {
		input,
		width = '100%',
		matchHeight,
		offsetTop = 0,
		onExpand,
		hoveredBin = $bindable(null),
		externalHighlightBins = []
	}: Props = $props();

	let showR = $state(true);
	let showG = $state(true);
	let showB = $state(true);
	let showA = $state(false);
	let ignoreTransparent = $state(true);

	let histR = $state(new Uint32Array(256));
	let histG = $state(new Uint32Array(256));
	let histB = $state(new Uint32Array(256));
	let histA = $state(new Uint32Array(256));
	let overallMaxCount = $state(1);

	function getMaxCount(data: Uint32Array): number {
		let max = 0;
		for (let i = 0; i < 256; i++) {
			if (data[i] > max) max = data[i];
		}
		return max;
	}

	let maxCount = $derived.by(() => {
		const visibleMaxima: number[] = [];
		if (showR) visibleMaxima.push(getMaxCount(histR));
		if (showG) visibleMaxima.push(getMaxCount(histG));
		if (showB) visibleMaxima.push(getMaxCount(histB));
		if (showA) visibleMaxima.push(getMaxCount(histA));

		if (visibleMaxima.length === 0) return overallMaxCount;
		const max = Math.max(...visibleMaxima);
		return max > 0 ? max : 1;
	});

	let matched = $derived(matchHeight != null && matchHeight > 0);
	let hoveredBinLines = $derived.by(() => {
		if (hoveredBin == null) return [];

		const values = [{ value: hoveredBin, label: 'X' }];
		if (showR) values.push({ value: histR[hoveredBin], label: 'R' });
		if (showG) values.push({ value: histG[hoveredBin], label: 'G' });
		if (showB) values.push({ value: histB[hoveredBin], label: 'B' });
		if (showA) values.push({ value: histA[hoveredBin], label: 'A' });

		return values;
	});

	function updateHoveredBin(event: MouseEvent) {
		const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
		const relativeX = Math.max(0, Math.min(event.clientX - rect.left, rect.width));
		const bin = Math.floor((relativeX / rect.width) * 256);
		hoveredBin = Math.max(0, Math.min(bin, 255));
	}

	function clearHoveredBin() {
		hoveredBin = null;
	}

	$effect(() => {
		if (!input) {
			histR.fill(0);
			histG.fill(0);
			histB.fill(0);
			histA.fill(0);
			return;
		}

		const src = input.data;
		const r = new Uint32Array(256);
		const g = new Uint32Array(256);
		const b = new Uint32Array(256);
		const a = new Uint32Array(256);

		for (let i = 0; i < src.length; i += 4) {
			if (ignoreTransparent && src[i + 3] === 0) continue;
			r[src[i]]++;
			g[src[i + 1]]++;
			b[src[i + 2]]++;
			a[src[i + 3]]++;
		}

		let max = 0;
		for (let i = 0; i < 256; i++) {
			if (r[i] > max) max = r[i];
			if (g[i] > max) max = g[i];
			if (b[i] > max) max = b[i];
			if (a[i] > max) max = a[i];
		}

		histR = r;
		histG = g;
		histB = b;
		histA = a;

		overallMaxCount = max > 0 ? max : 1;
	});

	const createBarPath = (data: Uint32Array, max: number): string => {
		let d = `M 0,100 `;

		for (let i = 0; i < 256; i++) {
			const x1 = (i / 256) * 100;
			const x2 = ((i + 1) / 256) * 100;

			const val = data[i];
			const barHeight = (val / max) * 100;
			const y = 100 - barHeight;

			d += `L ${x1.toFixed(2)},${y.toFixed(2)} L ${x2.toFixed(2)},${y.toFixed(2)} `;
		}

		d += `L 100,100 Z`;
		return d;
	};
</script>

<div
	class="operator-card"
	class:matched
	style:width={width}
	style:height={matched ? `${matchHeight}px` : undefined}
	style:margin-top={offsetTop > 0 ? `${offsetTop}px` : undefined}
>
	<div class="header">
		<div class="title-group">
			<span class="title">Histogram</span>
		</div>

		<div class="toggles">
			<OptionCheckbox label="α=0" hoverText="Skip fully transparent pixels (alpha=0) — they distort the histogram with invisible pixel data" bind:checked={ignoreTransparent} labelPosition="left" />
			<div class="toggle-separator"></div>
			<button
				type="button"
				class="toggle-btn red"
				class:active={showR}
				onclick={() => (showR = !showR)}>R</button
			>
			<button
				type="button"
				class="toggle-btn green"
				class:active={showG}
				onclick={() => (showG = !showG)}>G</button
			>
			<button
				type="button"
				class="toggle-btn blue"
				class:active={showB}
				onclick={() => (showB = !showB)}>B</button
			>
			<button
				type="button"
				class="toggle-btn alpha"
				class:active={showA}
				onclick={() => (showA = !showA)}>A</button
			>
			{#if onExpand}
				<button
					type="button"
					class="toggle-btn expand-btn"
					onclick={onExpand}
					title="Expand histogram"
				>
					<span class="material-icons-round">open_in_full</span>
				</button>
			{/if}
		</div>
	</div>

	<div
		class="graph-container"
		role="img"
		aria-label="Histogram chart"
		onmousemove={updateHoveredBin}
		onmouseleave={clearHoveredBin}
	>
		<div class="y-label top">{maxCount}</div>
		<div class="y-label mid">{Math.round(maxCount / 2)}</div>
		<div class="y-label bottom">0</div>
		{#if hoveredBinLines.length > 0}
			<div class="hover-info">
				{#each hoveredBinLines as line (line.label)}
					<div class="hover-line-item">
						<span class="hover-line-value">{line.value}</span>
						<span class="hover-line-label">- {line.label}</span>
					</div>
				{/each}
			</div>
		{/if}
		<svg viewBox="0 0 100 100" preserveAspectRatio="none">
			<line x1="0" y1="25" x2="100" y2="25" class="grid-line" />
			<line x1="0" y1="50" x2="100" y2="50" class="grid-line" />
			<line x1="0" y1="75" x2="100" y2="75" class="grid-line" />

			{#if showR}
				<path d={createBarPath(histR, maxCount)} fill="#ef4444" class="hist-layer" />
			{/if}
			{#if showG}
				<path d={createBarPath(histG, maxCount)} fill="#22c55e" class="hist-layer" />
			{/if}
			{#if showB}
				<path d={createBarPath(histB, maxCount)} fill="#3b82f6" class="hist-layer" />
			{/if}
			{#if showA}
				<path d={createBarPath(histA, maxCount)} fill="#e5e7eb" class="hist-layer" />
			{/if}

			{#if hoveredBin != null}
				<line
					x1={((hoveredBin + 0.5) / 256) * 100}
					y1="0"
					x2={((hoveredBin + 0.5) / 256) * 100}
					y2="100"
					class="hover-line"
				/>
			{/if}

			{#each externalHighlightBins as hl (hl.color + hl.bin)}
				<line
					x1={((hl.bin + 0.5) / 256) * 100}
					y1="0"
					x2={((hl.bin + 0.5) / 256) * 100}
					y2="100"
					stroke={hl.color}
					stroke-width="1"
					vector-effect="non-scaling-stroke"
					stroke-dasharray="3 2"
					opacity="0.8"
				/>
			{/each}
		</svg>
	</div>

	<div class="x-labels">
		<span>0</span>
		<span>128</span>
		<span>255</span>
	</div>
</div>

<style>
	.operator-card {
		background: rgba(30, 37, 46, 0.95);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 10px;
		padding: 12px;
		color: #e0e0e0;
		font-family: sans-serif;
		box-shadow: 0 10px 28px rgba(0, 0, 0, 0.4);
		box-sizing: border-box;
		width: 100%;
	}

	.operator-card.matched {
		display: flex;
		flex-direction: column;
		min-height: 0;
	}

	.header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		width: 100%;
		margin: 0 0 10px;
		padding: 0 0 8px;
		border-bottom: 1px solid #444;
		flex-shrink: 0;
	}

	.title-group {
		display: flex;
		align-items: center;
		gap: 8px;
		min-width: 0;
	}
	.icon {
		font-size: 1.2rem;
	}
	.title {
		font-weight: bold;
		font-size: 0.9rem;
	}

	.toggles {
		display: flex;
		gap: 4px;
		flex-shrink: 0;
	}
	.toggle-separator {
		width: 1px;
		height: 16px;
		background: #444;
		margin: 0 10px;
		align-self: center;
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
	}
	.toggle-btn.active.green {
		background: #22c55e;
		color: #fff;
		border-color: #22c55e;
	}
	.toggle-btn.active.blue {
		background: #3b82f6;
		color: #fff;
		border-color: #3b82f6;
	}
	.toggle-btn.active.alpha {
		background: #e5e7eb;
		color: #111;
		border-color: #e5e7eb;
	}

	.expand-btn {
		color: #93c5fd;
	}

	.expand-btn:hover {
		border-color: #60a5fa;
		color: #eff6ff;
		background: rgba(59, 130, 246, 0.18);
	}

	.expand-btn .material-icons-round {
		font-size: 15px;
		line-height: 1;
	}

	.graph-container {
		width: 100%;
		height: 150px;
		background: #111;
		border: 1px solid #444;
		border-radius: 4px;
		overflow: hidden;
		position: relative;
		flex: 1 1 auto;
		min-height: 0;
	}

	.operator-card.matched .graph-container {
		height: auto;
	}

	svg {
		width: 100%;
		height: 100%;
		display: block;
		shape-rendering: crispEdges;
	}

	.grid-line {
		stroke: #333;
		stroke-width: 1;
		vector-effect: non-scaling-stroke;
	}
	.hist-layer {
		mix-blend-mode: screen;
		opacity: 0.9;
	}

	.y-label {
		position: absolute;
		left: 4px;
		font-size: 0.6rem;
		font-family: monospace;
		color: #888;
		background: rgba(0, 0, 0, 0.6);
		padding: 1px 3px;
		border-radius: 2px;
		pointer-events: none;
		z-index: 10;
	}
	.y-label.top {
		top: 4px;
	}
	.y-label.mid {
		top: 50%;
		transform: translateY(-50%);
		opacity: 0.5;
	}
	.y-label.bottom {
		bottom: 4px;
	}

	.hover-info {
		position: absolute;
		top: 6px;
		right: 8px;
		z-index: 10;
		font-size: 0.65rem;
		font-family: monospace;
		color: #ddd;
		line-height: 1.1;
		text-align: right;
		pointer-events: none;
		user-select: none;
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

	.hover-line-value {
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	.hover-line-label {
		text-align: left;
	}

	.hover-line {
		stroke: rgba(255, 255, 255, 0.5);
		stroke-width: 1;
		vector-effect: non-scaling-stroke;
	}

	.x-labels {
		display: flex;
		justify-content: space-between;
		margin-top: 4px;
		font-size: 0.7rem;
		color: #666;
		font-family: monospace;
		flex-shrink: 0;
	}
</style>
