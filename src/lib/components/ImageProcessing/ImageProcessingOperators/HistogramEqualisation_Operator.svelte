<script lang="ts">
	import OperatorBase from './OperatorBase.svelte';
	import { PixelBuffer } from '$lib/classes/PixelBuffer';

	interface Props {
		input: PixelBuffer | null;
		output?: PixelBuffer | null;
		enabled?: boolean;
		collapsed?: boolean;
		matchHeight?: number;
	}

	let {
		input,
		output = $bindable(null),
		enabled = $bindable(true),
		collapsed = $bindable(true),
		matchHeight = 0
	}: Props = $props();

	type CdfStats = { min: number; mappedMid: number; mappedMax: number };

	function onReset() {
		// Auto operator with no user-tunable parameters.
	}

	function buildEqualizationLut(hist: Uint32Array, totalPixels: number) {
		const lut = new Uint8ClampedArray(256);
		const cdf = new Uint32Array(256);

		let sum = 0;
		for (let i = 0; i < 256; i++) {
			sum += hist[i];
			cdf[i] = sum;
		}

		let min = 0;
		while (min < 255 && hist[min] === 0) min++;

		const cdfMin = cdf[min];
		const denominator = totalPixels - cdfMin;

		for (let i = 0; i < 256; i++) {
			if (cdf[i] <= cdfMin || denominator <= 0) {
				lut[i] = 0;
				continue;
			}

			const equalized = ((cdf[i] - cdfMin) / denominator) * 255;
			lut[i] = Math.max(0, Math.min(255, Math.round(equalized)));
		}

		return { lut, min };
	}

	let stats = $derived.by((): Record<'r' | 'g' | 'b', CdfStats> => {
		if (!input) {
			return {
				r: { min: 0, mappedMid: 128, mappedMax: 255 },
				g: { min: 0, mappedMid: 128, mappedMax: 255 },
				b: { min: 0, mappedMid: 128, mappedMax: 255 }
			};
		}

		const src = input.data;
		const totalPixels = input.width * input.height;
		const histR = new Uint32Array(256);
		const histG = new Uint32Array(256);
		const histB = new Uint32Array(256);

		for (let i = 0; i < src.length; i += 4) {
			histR[src[i]]++;
			histG[src[i + 1]]++;
			histB[src[i + 2]]++;
		}

		const red = buildEqualizationLut(histR, totalPixels);
		const green = buildEqualizationLut(histG, totalPixels);
		const blue = buildEqualizationLut(histB, totalPixels);

		return {
			r: { min: red.min, mappedMid: red.lut[128], mappedMax: red.lut[255] },
			g: { min: green.min, mappedMid: green.lut[128], mappedMax: green.lut[255] },
			b: { min: blue.min, mappedMid: blue.lut[128], mappedMax: blue.lut[255] }
		};
	});

	$effect(() => {
		if (!input) {
			output = null;
			return;
		}

		if (!enabled) {
			output = input;
			return;
		}

		const src = input.data;
		const totalPixels = input.width * input.height;
		const histR = new Uint32Array(256);
		const histG = new Uint32Array(256);
		const histB = new Uint32Array(256);

		for (let i = 0; i < src.length; i += 4) {
			histR[src[i]]++;
			histG[src[i + 1]]++;
			histB[src[i + 2]]++;
		}

		const red = buildEqualizationLut(histR, totalPixels);
		const green = buildEqualizationLut(histG, totalPixels);
		const blue = buildEqualizationLut(histB, totalPixels);

		const dst = new Uint8ClampedArray(src.length);
		for (let i = 0; i < src.length; i += 4) {
			dst[i] = red.lut[src[i]];
			dst[i + 1] = green.lut[src[i + 1]];
			dst[i + 2] = blue.lut[src[i + 2]];
			dst[i + 3] = src[i + 3];
		}

		output = new PixelBuffer(input.width, input.height, dst);
	});
</script>

<OperatorBase
	title="Histogram Equalisation"
	icon="equalizer"
	bind:enabled
	bind:collapsed
	{matchHeight}
	{onReset}
>
	<div class="content">
		<p class="description">
			Remaps each RGB channel through its cumulative distribution to flatten dense intensity bands.
		</p>

		<div class="stats-grid">
			<div class="stat-card red">
				<span class="channel">R</span>
				<span class="metric">min {stats.r.min}</span>
				<span class="metric">128 -> {stats.r.mappedMid}</span>
				<span class="metric">255 -> {stats.r.mappedMax}</span>
			</div>
			<div class="stat-card green">
				<span class="channel">G</span>
				<span class="metric">min {stats.g.min}</span>
				<span class="metric">128 -> {stats.g.mappedMid}</span>
				<span class="metric">255 -> {stats.g.mappedMax}</span>
			</div>
			<div class="stat-card blue">
				<span class="channel">B</span>
				<span class="metric">min {stats.b.min}</span>
				<span class="metric">128 -> {stats.b.mappedMid}</span>
				<span class="metric">255 -> {stats.b.mappedMax}</span>
			</div>
		</div>
	</div>
</OperatorBase>

<style>
	.content {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.description {
		margin: 0;
		color: #cbd5e1;
		font-size: 0.82rem;
		line-height: 1.45;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 8px;
	}

	.stat-card {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 6px 12px;
		align-items: center;
		padding: 8px 10px;
		border: 1px solid #343d4a;
		border-radius: 8px;
		background: #161b22;
		font-size: 0.78rem;
	}

	.stat-card.red {
		color: #fca5a5;
	}

	.stat-card.green {
		color: #86efac;
	}

	.stat-card.blue {
		color: #93c5fd;
	}

	.channel {
		font-weight: 700;
		grid-row: 1 / span 3;
	}

	.metric {
		color: #e2e8f0;
		font-variant-numeric: tabular-nums;
	}
</style>
