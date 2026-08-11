<script lang="ts">
	import type { PixelBuffer } from '$lib/classes/PixelBuffer';

	interface Props {
		input: PixelBuffer | null;
		width?: string;
		height?: string;
	}

	let {
		input,
		width = '100%',
		height = '150px'
	}: Props = $props();

	let open = $state(false);
	let showR = $state(true);
	let showG = $state(true);
	let showB = $state(true);
	let showA = $state(false);

	let histR = $state(new Uint32Array(256));
	let histG = $state(new Uint32Array(256));
	let histB = $state(new Uint32Array(256));
	let histA = $state(new Uint32Array(256));
	let maxCount = $state(1);

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

		maxCount = max > 0 ? max : 1;
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

<div class="operator-card" class:collapsed={!open} style:width={width}>
	<button type="button" class="header" onclick={() => (open = !open)} aria-expanded={open}>
		<div class="title-group">
			<span class="icon">📊</span>
			<span class="title">Histogram</span>
		</div>

		<span class="material-icons-round chevron">{open ? 'expand_less' : 'expand_more'}</span>
	</button>

	{#if open}
		<div class="toggles">
			<button class="toggle-btn red" class:active={showR} onclick={() => (showR = !showR)}>R</button>
			<button
				class="toggle-btn green"
				class:active={showG}
				onclick={() => (showG = !showG)}>G</button
			>
			<button class="toggle-btn blue" class:active={showB} onclick={() => (showB = !showB)}>B</button>
			<button
				class="toggle-btn alpha"
				class:active={showA}
				onclick={() => (showA = !showA)}>A</button
			>
		</div>

		<div class="graph-container" style:height={height}>
			<div class="y-label top">{maxCount}</div>
			<div class="y-label mid">{Math.round(maxCount / 2)}</div>
			<div class="y-label bottom">0</div>
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
			</svg>
		</div>

		<div class="x-labels">
			<span>0</span>
			<span>128</span>
			<span>255</span>
		</div>
	{/if}
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

	.operator-card.collapsed {
		padding: 8px 12px;
	}

	.header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		padding: 0;
		margin: 0;
		border: none;
		background: transparent;
		color: inherit;
		cursor: pointer;
		text-align: left;
	}

	.operator-card:not(.collapsed) .header {
		margin-bottom: 12px;
		border-bottom: 1px solid #444;
		padding-bottom: 8px;
	}

	.title-group {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.icon {
		font-size: 1.2rem;
	}
	.title {
		font-weight: bold;
		font-size: 0.9rem;
	}

	.chevron {
		font-size: 20px;
		color: #888;
	}

	.toggles {
		display: flex;
		gap: 4px;
		margin-bottom: 10px;
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

	.graph-container {
		width: 100%;
		background: #111;
		border: 1px solid #444;
		border-radius: 4px;
		overflow: hidden;
		position: relative;
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

	.x-labels {
		display: flex;
		justify-content: space-between;
		margin-top: 4px;
		font-size: 0.7rem;
		color: #666;
		font-family: monospace;
	}
</style>
