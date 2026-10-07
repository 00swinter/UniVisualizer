<script lang="ts">
	import OperatorBase from './OperatorBase.svelte';
	import { PixelBuffer } from '$lib/classes/PixelBuffer';
	import OptionSelect from '$lib/components/OptionSelect.svelte';
	import OptionCheckbox from '$lib/components/OptionCheckbox.svelte';
	import Parameter from '$lib/components/Parameter.svelte';
	import InfoContainer from '$lib/components/Info_Container.svelte';
	import { Colors } from '$lib/classes/Colors';

	interface Props {
		input: PixelBuffer | null;
		output?: PixelBuffer | null;
		enabled?: boolean;
		collapsed?: boolean;
		matchHeight?: number;
	}

	type NoiseMode = 'salt_pepper' | 'gaussian';

	const MODE_OPTIONS: { id: NoiseMode; label: string }[] = [
		{ id: 'salt_pepper', label: 'Salt & Pepper' },
		{ id: 'gaussian', label: 'Gaussian' }
	];

	const MODE_INFO: Record<NoiseMode, { title: string; description: string }> = {
		salt_pepper: {
			title: 'Salt & Pepper',
			description:
				'Amount is the share of pixels that are replaced. Those pixels become pure white or pure black. Salt is how many of them are white. The rest are black. Every other pixel stays as it was.'
		},
		gaussian: {
			title: 'Gaussian',
			description:
				'Each pixel is nudged by a random amount. Most nudges are small. Sigma is the typical size of a nudge, in brightness steps. Monochrome uses one nudge for red, green, and blue together, so the grain stays gray. Off, each channel is nudged on its own.'
		}
	};

	let {
		input,
		output = $bindable(null),
		enabled = $bindable(true),
		collapsed = $bindable(true),
		matchHeight = 0
	}: Props = $props();

	let mode = $state<NoiseMode>('salt_pepper');
	let amount = $state(8);
	let salt = $state(50);
	let sigma = $state(25);
	let monochrome = $state(true);
	let seed = $state(1);
	let infoOpen = $state(false);

	const modeInfo = $derived(MODE_INFO[mode]);

	function onReset() {
		mode = 'salt_pepper';
		amount = 8;
		salt = 50;
		sigma = 25;
		monochrome = true;
		seed = 1;
	}

	function reroll() {
		seed = Math.floor(Math.random() * 1_000_000);
	}

	function mulberry32(pattern: number) {
		let state = pattern >>> 0;
		return () => {
			state = (state + 0x6d2b79f5) >>> 0;
			let t = Math.imul(state ^ (state >>> 15), 1 | state);
			t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
	}

	/** Box–Muller. Always consumes two random values so the pattern stays put. */
	function standardNormal(rng: () => number) {
		const u = Math.max(rng(), 1e-12);
		const v = rng();
		return Math.sqrt(-2 * Math.log(u)) * Math.cos(Math.PI * 2 * v);
	}

	function applySaltPepper(
		src: Uint8ClampedArray,
		dst: Uint8ClampedArray,
		density: number,
		saltShare: number,
		pattern: number
	) {
		dst.set(src);
		if (density <= 0) return;
		const rng = mulberry32(pattern);
		for (let i = 0; i < src.length; i += 4) {
			const pick = rng();
			const kind = rng();
			if (pick >= density) continue;
			const value = kind < saltShare ? 255 : 0;
			dst[i] = value;
			dst[i + 1] = value;
			dst[i + 2] = value;
		}
	}

	function applyGaussian(
		src: Uint8ClampedArray,
		dst: Uint8ClampedArray,
		spread: number,
		gray: boolean,
		pattern: number
	) {
		dst.set(src);
		if (spread <= 0) return;
		const rng = mulberry32(pattern);
		for (let i = 0; i < src.length; i += 4) {
			if (gray) {
				const nudge = standardNormal(rng) * spread;
				dst[i] = src[i] + nudge;
				dst[i + 1] = src[i + 1] + nudge;
				dst[i + 2] = src[i + 2] + nudge;
			} else {
				dst[i] = src[i] + standardNormal(rng) * spread;
				dst[i + 1] = src[i + 1] + standardNormal(rng) * spread;
				dst[i + 2] = src[i + 2] + standardNormal(rng) * spread;
			}
		}
	}

	$effect(() => {
		if (!input) {
			output = null;
			return;
		}
		if (!enabled) {
			output = input;
			return;
		}

		const nextOutput = new PixelBuffer(input.width, input.height);
		const src = input.data as Uint8ClampedArray;
		const dst = nextOutput.data as Uint8ClampedArray;
		const pattern = Number.isFinite(seed) ? Math.trunc(seed) : 1;

		if (mode === 'salt_pepper') {
			applySaltPepper(src, dst, amount / 100, salt / 100, pattern);
		} else {
			applyGaussian(src, dst, sigma, monochrome, pattern);
		}

		output = nextOutput;
	});
</script>

<OperatorBase title="Noise" icon="grain" bind:enabled bind:collapsed {matchHeight} {onReset}>
	<div class="controls">
		<OptionSelect label="Type" bind:value={mode} options={MODE_OPTIONS} />

		{#if mode === 'salt_pepper'}
			<Parameter
				type="range"
				label="Amount"
				bind:value={amount}
				min={0}
				max={100}
				step={1}
				unit="%"
				color={Colors.gray_white()}
			/>
			<Parameter
				type="range"
				label="Salt"
				bind:value={salt}
				min={0}
				max={100}
				step={1}
				unit="%"
				color={Colors.gray_slate()}
			/>
		{:else}
			<Parameter
				type="range"
				label="Sigma"
				bind:value={sigma}
				min={0}
				max={80}
				step={1}
				color={Colors.gray_white()}
			/>
			<OptionCheckbox label="Monochrome" bind:checked={monochrome} />
		{/if}

		<div class="seed-row">
			<Parameter
				type="number"
				label="Seed"
				bind:value={seed}
				min={0}
				max={999999}
				step={1}
				color={Colors.yellow_amber()}
			/>
			<button type="button" class="reroll" onclick={reroll} title="Draw a new pattern">
				<span class="material-icons-round">shuffle</span>
				New pattern
			</button>
		</div>
	</div>

	<InfoContainer title={modeInfo.title} bind:open={infoOpen}>
		<p>{modeInfo.description}</p>
		<p>
			Seed fixes the pattern. The same seed draws the same noise, so the picture stays still while
			you change the sliders or the steps after this one. New pattern picks another seed.
		</p>
	</InfoContainer>
</OperatorBase>

<style>
	.controls {
		display: flex;
		flex-direction: column;
		gap: 10px;
		margin-bottom: 10px;
	}

	.controls :global(.option_group) {
		margin-bottom: 0;
	}

	.controls :global(.param-container) {
		padding: 6px 8px;
		border-radius: 8px;
		border-left-width: 5px;
		gap: 4px;
	}

	.controls :global(.param-container .header) {
		font-size: 0.75rem;
	}

	.controls :global(.param-container .value-readout) {
		font-size: 0.7rem;
		padding: 1px 8px;
		border-radius: 999px;
		border-width: 1px;
	}

	.controls :global(.param-container .slider) {
		height: 14px;
	}

	.seed-row {
		display: flex;
		align-items: stretch;
		gap: 8px;
	}

	.seed-row :global(.param-container) {
		flex: 1 1 auto;
		min-width: 0;
	}

	.reroll {
		flex: 0 0 auto;
		align-self: stretch;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 2px;
		padding: 6px 8px;
		border-radius: 8px;
		border: 1px solid #343d4a;
		background: #161b22;
		color: #94a3b8;
		font-family: inherit;
		font-size: 0.65rem;
		font-weight: 600;
		line-height: 1.1;
		cursor: pointer;
	}

	.reroll .material-icons-round {
		font-size: 16px;
	}

	.reroll:hover {
		border-color: #4b5563;
		color: #f1f5f9;
		background: #222;
	}

	p {
		margin: 0 0 8px;
	}

	p:last-child {
		margin-bottom: 0;
	}
</style>
