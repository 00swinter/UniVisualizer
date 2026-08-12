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

	type ChannelRange = { min: number; max: number };

	function onReset() {
		// Auto operator with no user-tunable parameters.
	}

	function computeChannelRange(hist: Uint32Array): ChannelRange {
		let min = 0;
		while (min < 255 && hist[min] === 0) min++;

		let max = 255;
		while (max > 0 && hist[max] === 0) max--;

		return { min, max };
	}

	function buildStretchLut(min: number, max: number) {
		const lut = new Uint8ClampedArray(256);

		if (max <= min) {
			for (let i = 0; i < 256; i++) lut[i] = i;
			return lut;
		}

		for (let i = 0; i < 256; i++) {
			const stretched = ((i - min) / (max - min)) * 255;
			lut[i] = Math.max(0, Math.min(255, Math.round(stretched)));
		}

		return lut;
	}

	let sourceRanges = $derived.by((): Record<'r' | 'g' | 'b', ChannelRange> => {
		if (!input) {
			return {
				r: { min: 0, max: 255 },
				g: { min: 0, max: 255 },
				b: { min: 0, max: 255 }
			};
		}

		const src = input.data;
		const histR = new Uint32Array(256);
		const histG = new Uint32Array(256);
		const histB = new Uint32Array(256);

		for (let i = 0; i < src.length; i += 4) {
			histR[src[i]]++;
			histG[src[i + 1]]++;
			histB[src[i + 2]]++;
		}

		return {
			r: computeChannelRange(histR),
			g: computeChannelRange(histG),
			b: computeChannelRange(histB)
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
		const lutR = buildStretchLut(sourceRanges.r.min, sourceRanges.r.max);
		const lutG = buildStretchLut(sourceRanges.g.min, sourceRanges.g.max);
		const lutB = buildStretchLut(sourceRanges.b.min, sourceRanges.b.max);

		const dst = new Uint8ClampedArray(src.length);
		for (let i = 0; i < src.length; i += 4) {
			dst[i] = lutR[src[i]];
			dst[i + 1] = lutG[src[i + 1]];
			dst[i + 2] = lutB[src[i + 2]];
			dst[i + 3] = src[i + 3];
		}

		output = new PixelBuffer(input.width, input.height, dst);
	});
</script>

<OperatorBase
	title="Histogram Normalisation"
	icon="bar_chart"
	bind:enabled
	bind:collapsed
	{matchHeight}
	{onReset}
>
	<div class="content">
		<p class="description">
			Stretches each RGB channel so its occupied intensity range fills `0-255`.
		</p>

		<div class="range-grid">
			<div class="range-card red">
				<span class="channel">R</span>
				<span class="range">{sourceRanges.r.min} -> {sourceRanges.r.max}</span>
			</div>
			<div class="range-card green">
				<span class="channel">G</span>
				<span class="range">{sourceRanges.g.min} -> {sourceRanges.g.max}</span>
			</div>
			<div class="range-card blue">
				<span class="channel">B</span>
				<span class="range">{sourceRanges.b.min} -> {sourceRanges.b.max}</span>
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

	.range-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 8px;
	}

	.range-card {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		padding: 8px 10px;
		border: 1px solid #343d4a;
		border-radius: 8px;
		background: #161b22;
		font-size: 0.78rem;
	}

	.range-card.red {
		color: #fca5a5;
	}

	.range-card.green {
		color: #86efac;
	}

	.range-card.blue {
		color: #93c5fd;
	}

	.channel {
		font-weight: 700;
	}

	.range {
		color: #e2e8f0;
		font-variant-numeric: tabular-nums;
	}
</style>
