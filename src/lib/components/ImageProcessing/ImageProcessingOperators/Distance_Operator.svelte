<script lang="ts">
	import OperatorBase from './OperatorBase.svelte';
	import { PixelBuffer } from '$lib/classes/PixelBuffer';
	import {
		runDistance,
		type DistanceMetric,
		type DistanceRange
	} from '$lib/classes/distance';
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

	const METRIC_OPTIONS: { id: DistanceMetric; label: string }[] = [
		{ id: 'euclidean', label: 'Euclidean' },
		{ id: 'city', label: 'City block' },
		{ id: 'chessboard', label: 'Chessboard' }
	];

	const RANGE_OPTIONS: { id: DistanceRange; label: string }[] = [
		{ id: 'stretch', label: 'Stretch' },
		{ id: 'scale', label: 'Scale' }
	];

	const METRIC_INFO: Record<DistanceMetric, { title: string; description: string }> = {
		euclidean: {
			title: 'Euclidean',
			description:
				'Each object pixel becomes its straight-line distance to the nearest background pixel. Points at the same distance form circles. The middle of a blob is the brightest part.'
		},
		city: {
			title: 'City block',
			description:
				'Steps only go up, down, left, and right. A diagonal move costs two steps. Points at the same distance form diamonds. This is the city-block distance, also called D4.'
		},
		chessboard: {
			title: 'Chessboard',
			description:
				'Steps go to any of the eight neighbors. A diagonal move costs one step, the same as a straight move. Points at the same distance form squares. This is the chessboard distance, also called D8.'
		}
	};

	let {
		input,
		output = $bindable(null),
		enabled = $bindable(true),
		collapsed = $bindable(true),
		matchHeight = 0
	}: Props = $props();

	let metric = $state<DistanceMetric>('euclidean');
	let cutoff = $state(128);
	let invert = $state(false);
	let range = $state<DistanceRange>('stretch');
	let gain = $state(16);
	let farthest = $state(0);
	let infoOpen = $state(false);

	const metricInfo = $derived(METRIC_INFO[metric]);

	const rangeInfo = $derived(
		range === 'stretch'
			? 'Stretch paints the farthest object pixel white. Background stays black, so a thicker shape gets a brighter core. Farthest is that distance, in pixels.'
			: 'Each pixel of distance adds Gain gray levels, then the value stops at white. The same thickness stays the same brightness from one picture to the next. Farthest is that distance, in pixels.'
	);

	function onReset() {
		metric = 'euclidean';
		cutoff = 128;
		invert = false;
		range = 'stretch';
		gain = 16;
	}

	$effect(() => {
		if (!input) {
			output = null;
			farthest = 0;
			return;
		}
		if (!enabled) {
			output = input;
			farthest = 0;
			return;
		}

		const result = runDistance(
			input.data as Uint8ClampedArray,
			input.width,
			input.height,
			metric,
			cutoff,
			invert,
			range,
			gain
		);
		farthest = result.maxDistance;
		output = new PixelBuffer(input.width, input.height, result.data);
	});
</script>

<OperatorBase
	title="Distance Transform"
	icon="filter_center_focus"
	bind:enabled
	bind:collapsed
	{matchHeight}
	{onReset}
>
	<div class="controls">
		<OptionSelect label="Metric" bind:value={metric} options={METRIC_OPTIONS} />
		<Parameter
			type="range"
			label="Cutoff"
			bind:value={cutoff}
			min={0}
			max={255}
			step={1}
			color={Colors.gray_white()}
		/>
		<OptionCheckbox label="Invert" bind:checked={invert} />
		<OptionSelect label="Range" bind:value={range} options={RANGE_OPTIONS} />
		{#if range === 'scale'}
			<Parameter
				type="range"
				label="Gain"
				bind:value={gain}
				min={1}
				max={64}
				step={1}
				color={Colors.gray_slate()}
			/>
		{/if}
		<Parameter
			type="display"
			label="Farthest"
			value={farthest}
			unit=" px"
			color={Colors.yellow_amber()}
		/>
	</div>

	<InfoContainer title={metricInfo.title} bind:open={infoOpen}>
		<p>{metricInfo.description}</p>
		<p>{rangeInfo}</p>
		<p>
			Cutoff uses the same luminance as Threshold, 0.299R + 0.587G + 0.114B. Pixels at or above
			the cutoff are the object. Invert takes the pixels below the cutoff, for black shapes on a
			white page. If the picture has no background, the result stays black.
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
