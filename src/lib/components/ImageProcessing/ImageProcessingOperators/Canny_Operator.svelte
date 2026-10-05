<script lang="ts">
	import OperatorBase from './OperatorBase.svelte';
	import { PixelBuffer } from '$lib/classes/PixelBuffer';
	import { runCanny, type CannyStage } from '$lib/classes/canny';
	import OptionSelect from '$lib/components/OptionSelect.svelte';
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

	const STAGE_OPTIONS: { id: CannyStage; label: string }[] = [
		{ id: 'magnitude', label: 'Step 1: Magnitude' },
		{ id: 'direction', label: 'Step 2: Direction' },
		{ id: 'thinned', label: 'Step 3: Thinned' },
		{ id: 'threshold', label: 'Step 4: Threshold' },
		{ id: 'edges', label: 'Step 5: Edges' }
	];

	const STAGE_INFO: Record<CannyStage, { title: string; description: string; overview?: string }> = {
		magnitude: {
			title: 'Gradient magnitude',
			description:
				'How much the brightness changes at each pixel. Flat areas stay black. The strongest change in the image becomes white.'
		},
		direction: {
			title: 'Gradient direction',
			description:
				'Which way the brightness changes. Red means the bright side is to the right, and the hue turns as that direction rotates. Flat areas stay dark.'
		},
		thinned: {
			title: 'Non-maximum suppression',
			description:
				'Keeps only the brightest pixel across each ridge, along the direction from the previous step. The stroke shrinks to about one pixel.'
		},
		threshold: {
			title: 'Double threshold',
			description:
				'At or above High is a sure edge, drawn white. From Low up to High is a possible edge, drawn amber. Below Low is dropped.'
		},
		edges: {
			title: 'Hysteresis',
			description:
				'An amber pixel stays only when it touches a white pixel, directly or through other amber pixels. A faint line that continues a strong edge survives. A speck that touches nothing is removed.',
			overview:
				'Magnitude finds where brightness changes, direction records which way, and thinning narrows each ridge to one pixel. These cutoffs then keep the strong lines and the faint ones connected to them. Blur the photo first with Convolution → Gaussian Blur.'
		}
	};

	let {
		input,
		output = $bindable(null),
		enabled = $bindable(true),
		collapsed = $bindable(true),
		matchHeight = 0
	}: Props = $props();

	let stage = $state<CannyStage>('edges');
	let low = $state(40);
	let high = $state(100);
	let infoOpen = $state(false);

	const stageInfo = $derived(STAGE_INFO[stage]);
	const showCutoffs = $derived(stage === 'threshold' || stage === 'edges');

	function onReset() {
		stage = 'edges';
		low = 40;
		high = 100;
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

		const selected = stage;
		const lowCut = low;
		const highCut = high;
		output = new PixelBuffer(
			input.width,
			input.height,
			runCanny(input.data, input.width, input.height, selected, lowCut, highCut)
		);
	});
</script>

<OperatorBase title="Canny" icon="timeline" bind:enabled bind:collapsed {matchHeight} {onReset}>
	<div class="controls">
		<OptionSelect label="Stage" bind:value={stage} options={STAGE_OPTIONS} />
		{#if showCutoffs}
			<Parameter
				type="range"
				label="Low"
				bind:value={low}
				min={0}
				max={255}
				step={1}
				color={Colors.yellow_amber()}
			/>
			<Parameter
				type="range"
				label="High"
				bind:value={high}
				min={0}
				max={255}
				step={1}
				color={Colors.gray_white()}
			/>
		{/if}
	</div>

	<InfoContainer title={stageInfo.title} bind:open={infoOpen}>
		<p>{stageInfo.description}</p>
		{#if stageInfo.overview}
			<p>{stageInfo.overview}</p>
		{/if}
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
