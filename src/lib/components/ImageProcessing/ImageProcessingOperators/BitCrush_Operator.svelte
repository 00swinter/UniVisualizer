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

	type CrushMode = 'color' | 'luminance';

	const MODE_OPTIONS: { id: CrushMode; label: string }[] = [
		{ id: 'color', label: 'Color' },
		{ id: 'luminance', label: 'Luminance' }
	];

	/** 4×4 Bayer matrix. Values run from 0 through 15. */
	const BAYER_4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

	let {
		input,
		output = $bindable(null),
		enabled = $bindable(true),
		collapsed = $bindable(true),
		matchHeight = 0
	}: Props = $props();

	let mode = $state<CrushMode>('color');
	let bits = $state(3);
	let dither = $state(false);
	let infoOpen = $state(false);

	const depth = $derived(Math.min(8, Math.max(1, Math.round(bits))));
	const levels = $derived(1 << depth);

	const info = $derived.by(() => {
		if (mode === 'luminance') {
			return {
				title: 'Luminance crush',
				description: `Brightness is measured with Rec. 709, then rounded onto ${levels} gray shades from black to white. Color is discarded. At 1 bit the split sits around middle gray.`
			};
		}
		return {
			title: 'Color crush',
			description: `Red, green, and blue are each rounded onto ${levels} shades, spread from 0 to 255. Fewer bits means wider flat bands. The histogram falls onto those shades.`
		};
	});

	function onReset() {
		mode = 'color';
		bits = 3;
		dither = false;
	}

	function quantize(value: number, steps: number, offset: number) {
		const nudged = Math.min(255, Math.max(0, value + offset));
		const q = Math.round((nudged / 255) * steps);
		return Math.round((q * 255) / steps);
	}

	function ditherOffset(x: number, y: number, step: number) {
		const cell = BAYER_4[((y & 3) << 2) + (x & 3)];
		return ((cell + 0.5) / 16 - 0.5) * step;
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
		const steps = levels - 1;
		const step = 255 / steps;
		const useDither = dither && depth < 8;
		const width = input.width;

		if (mode === 'luminance') {
			for (let i = 0, p = 0; i < src.length; i += 4, p++) {
				const x = p % width;
				const y = (p / width) | 0;
				const offset = useDither ? ditherOffset(x, y, step) : 0;
				const gray =
					0.2126 * src[i] + 0.7152 * src[i + 1] + 0.0722 * src[i + 2];
				const crushed = quantize(gray, steps, offset);
				dst[i] = crushed;
				dst[i + 1] = crushed;
				dst[i + 2] = crushed;
				dst[i + 3] = src[i + 3];
			}
		} else if (!useDither && depth === 8) {
			dst.set(src);
		} else {
			for (let i = 0, p = 0; i < src.length; i += 4, p++) {
				const x = p % width;
				const y = (p / width) | 0;
				const offset = useDither ? ditherOffset(x, y, step) : 0;
				dst[i] = quantize(src[i], steps, offset);
				dst[i + 1] = quantize(src[i + 1], steps, offset);
				dst[i + 2] = quantize(src[i + 2], steps, offset);
				dst[i + 3] = src[i + 3];
			}
		}

		output = nextOutput;
	});
</script>

<OperatorBase title="Bit Crusher" icon="memory" bind:enabled bind:collapsed {matchHeight} {onReset}>
	<div class="controls">
		<OptionSelect label="Mode" bind:value={mode} options={MODE_OPTIONS} />
		<Parameter
			type="range"
			label="Bits"
			bind:value={bits}
			min={1}
			max={8}
			step={1}
			color={Colors.purple_violet()}
		/>
		<Parameter type="display" label="Levels" value={levels} color={Colors.gray_slate()} />
		<OptionCheckbox label="Dither" bind:checked={dither} />
	</div>

	<InfoContainer title={info.title} bind:open={infoOpen}>
		<p>{info.description}</p>
		<p>
			Dither adds a small repeating offset before the rounding, so neighboring pixels can land on
			different shades. The flat bands break up. At 8 bits the color mode leaves the image unchanged,
			and dither does nothing.
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

	p {
		margin: 0 0 8px;
	}

	p:last-child {
		margin-bottom: 0;
	}
</style>
