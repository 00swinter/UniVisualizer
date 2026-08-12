<script lang="ts">
	import OperatorBase from './OperatorBase.svelte';
	import { PixelBuffer } from '$lib/classes/PixelBuffer';
	import OptionSelect from '../../OptionSelect.svelte';
	import InfoContainer from '$lib/components/Info_Container.svelte';

	type GrayscaleMode =
		| 'luminance_rec601'
		| 'luminance_rec709'
		| 'average'
		| 'desaturation'
		| 'red_channel'
		| 'green_channel'
		| 'blue_channel';

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

	function onReset() {
		mode = 'luminance_rec709';
	}

	let mode: GrayscaleMode = $state('luminance_rec709');
	let infoOpen = $state(false);

	const modeInfoTitle = $derived.by(() => {
		switch (mode) {
			case 'luminance_rec601':
			case 'luminance_rec709':
				return 'Luminance Mode';
			case 'average':
				return 'Average Mode';
			case 'desaturation':
				return 'Desaturation Mode';
			case 'red_channel':
				return 'Red Channel Mode';
			case 'green_channel':
				return 'Green Channel Mode';
			case 'blue_channel':
				return 'Blue Channel Mode';
		}
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
		// 1. Create a local buffer first to avoid immediate rebinding triggers
		const nextOutput = new PixelBuffer(input.width, input.height);

		switch (mode) {
			case 'luminance_rec601':
				for (let i = 0; i < input.data.length; i += 4) {
					const r = input.data[i];
					const g = input.data[i + 1];
					const b = input.data[i + 2];

					const gray = 0.299 * r + 0.587 * g + 0.114 * b;

					nextOutput.data[i] = gray;
					nextOutput.data[i + 1] = gray;
					nextOutput.data[i + 2] = gray;
					nextOutput.data[i + 3] = input.data[i + 3];
				}
				break;
			case 'luminance_rec709':
				for (let i = 0; i < input.data.length; i += 4) {
					const r = input.data[i];
					const g = input.data[i + 1];
					const b = input.data[i + 2];

					const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;

					nextOutput.data[i] = gray;
					nextOutput.data[i + 1] = gray;
					nextOutput.data[i + 2] = gray;
					nextOutput.data[i + 3] = input.data[i + 3];
				}
				break;
			case 'average':
				for (let i = 0; i < input.data.length; i += 4) {
					const r = input.data[i];
					const g = input.data[i + 1];
					const b = input.data[i + 2];

					const gray = (r + g + b) / 3;

					nextOutput.data[i] = gray;
					nextOutput.data[i + 1] = gray;
					nextOutput.data[i + 2] = gray;
					nextOutput.data[i + 3] = input.data[i + 3];
				}
				break;
			case 'desaturation':
				for (let i = 0; i < input.data.length; i += 4) {
					const r = input.data[i];
					const g = input.data[i + 1];
					const b = input.data[i + 2];

					const min = Math.min(r, g, b);
					const max = Math.max(r, g, b);

					const gray = (max + min) / 2;

					nextOutput.data[i] = gray;
					nextOutput.data[i + 1] = gray;
					nextOutput.data[i + 2] = gray;
					nextOutput.data[i + 3] = input.data[i + 3];
				}
				break;
			case 'red_channel':
				for (let i = 0; i < input.data.length; i += 4) {
					const r = input.data[i];

					const gray = r;

					nextOutput.data[i] = gray;
					nextOutput.data[i + 1] = gray;
					nextOutput.data[i + 2] = gray;
					nextOutput.data[i + 3] = input.data[i + 3];
				}
				break;
			case 'green_channel':
				for (let i = 0; i < input.data.length; i += 4) {
					const g = input.data[i + 1];

					const gray = g;

					nextOutput.data[i] = gray;
					nextOutput.data[i + 1] = gray;
					nextOutput.data[i + 2] = gray;
					nextOutput.data[i + 3] = input.data[i + 3];
				}
				break;
			case 'blue_channel':
				for (let i = 0; i < input.data.length; i += 4) {
					const b = input.data[i + 2];

					const gray = b;

					nextOutput.data[i] = gray;
					nextOutput.data[i + 1] = gray;
					nextOutput.data[i + 2] = gray;
					nextOutput.data[i + 3] = input.data[i + 3];
				}
				break;
		}
		output = nextOutput;
	});
</script>

<OperatorBase title="Grayscale" icon="blur_linear" bind:enabled bind:collapsed {matchHeight} {onReset}>
	<OptionSelect
		label="Mode"
		bind:value={mode}
		options={[
			{ id: 'luminance_rec709', label: 'Luminance (Rec. 709)' },
			{ id: 'luminance_rec601', label: 'Luminance (Rec. 601)' },
			{ id: 'average', label: 'Average' },
			{ id: 'desaturation', label: 'Desaturation' },
			{ id: 'red_channel', label: 'Red Channel' },
			{ id: 'green_channel', label: 'Green Channel' },
			{ id: 'blue_channel', label: 'Blue Channel' }
		]}
	/>
	<InfoContainer title={modeInfoTitle} bind:open={infoOpen}>
		{#if mode === 'luminance_rec601'}
			<p>Uses the luminance formula: <br /> 0.299 * R + 0.587 * G + 0.114 * B</p>
			<p>
				This is used primarily for Standard Definition (SD) video and older analog formats because
				its coefficients are calibrated for the phosphors found in vintage CRT monitors.
			</p>
		{:else if mode === 'luminance_rec709'}
			<p>Uses the luminance formula: <br /> 0.2126 * R + 0.7152 * G + 0.0722 * B</p>
			<p>
				This is the modern industry standard for High Definition (HD) displays and sRGB color
				spaces, as it more accurately reflects how the human eye perceives brightness on
				contemporary LED and LCD screens.
			</p>
		{:else if mode === 'average'}
			<p>Uses the average formula: (R + G + B) / 3</p>
		{:else if mode === 'desaturation'}
			<p>Uses the desaturation formula: <br /> (max(R, G, B) + min(R, G, B)) / 2</p>
		{:else if mode === 'red_channel'}
			<p>Extracts the red channel and uses it as the grayscale value.</p>
		{:else if mode === 'green_channel'}
			<p>Extracts the green channel and uses it as the grayscale value.</p>
		{:else if mode === 'blue_channel'}
			<p>Extracts the blue channel and uses it as the grayscale value.</p>
		{/if}
	</InfoContainer>
</OperatorBase>
