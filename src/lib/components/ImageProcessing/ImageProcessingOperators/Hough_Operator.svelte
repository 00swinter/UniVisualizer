<script lang="ts">
	import OperatorBase from './OperatorBase.svelte';
	import { PixelBuffer } from '$lib/classes/PixelBuffer';
	import { runHough, type HoughStage } from '$lib/classes/hough';
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

	const STAGE_OPTIONS: { id: HoughStage; label: string }[] = [
		{ id: 'votes', label: 'Step 1: Voters' },
		{ id: 'space', label: 'Step 2: Accumulator' },
		{ id: 'peaks', label: 'Step 3: Peaks' },
		{ id: 'lines', label: 'Step 4: Lines' }
	];

	const STAGE_INFO: Record<HoughStage, { title: string; description: string; overview?: string }> = {
		votes: {
			title: 'Voting pixels',
			description:
				'A pixel votes when its brightness is at or above the cutoff. Darker pixels stay out. Run Threshold or Canny first so only the edges vote.'
		},
		space: {
			title: 'Accumulator',
			description:
				'Each voting pixel supports every line that could pass through it. Across the image is the angle θ, from 0° on the left to 180° on the right. Down the image is the distance ρ, negative at the top and positive at the bottom. The busiest cell is white.'
		},
		peaks: {
			title: 'Peaks',
			description:
				'A cell is kept when its votes reach Strength, as a percent of the busiest cell, and no busier cell sits within about 8° and 12 pixels. Each color is one line, strongest first. Angle step is the gap between the angle columns.'
		},
		lines: {
			title: 'Lines',
			description:
				'Each kept cell is drawn back with ρ = x cos θ + y sin θ. The stroke crosses the whole frame, in the same color as its peak. The input stays underneath, dimmed.',
			overview:
				'Edge pixels vote for every line through them. The votes pile up in angle–distance space, and the tallest piles are the lines in the picture.'
		}
	};

	let {
		input,
		output = $bindable(null),
		enabled = $bindable(true),
		collapsed = $bindable(true),
		matchHeight = 0
	}: Props = $props();

	let stage = $state<HoughStage>('lines');
	let edgeThreshold = $state(128);
	let angleStep = $state(1);
	let minStrength = $state(30);
	let maxLines = $state(8);
	let voterCount = $state(0);
	let lineCount = $state(0);
	let infoOpen = $state(false);

	const stageInfo = $derived(STAGE_INFO[stage]);
	const showAngle = $derived(stage !== 'votes');
	const showPeaks = $derived(stage === 'peaks' || stage === 'lines');

	function onReset() {
		stage = 'lines';
		edgeThreshold = 128;
		angleStep = 1;
		minStrength = 30;
		maxLines = 8;
	}

	$effect(() => {
		if (!input) {
			output = null;
			voterCount = 0;
			lineCount = 0;
			return;
		}
		if (!enabled) {
			output = input;
			voterCount = 0;
			lineCount = 0;
			return;
		}

		const selected = stage;
		const cutoff = edgeThreshold;
		const step = angleStep;
		const strength = minStrength;
		const limit = maxLines;
		const result = runHough(
			input.data,
			input.width,
			input.height,
			selected,
			cutoff,
			step,
			strength,
			limit
		);
		voterCount = result.voters;
		lineCount = result.lines;
		output = new PixelBuffer(input.width, input.height, result.data);
	});
</script>

<OperatorBase title="Hough Transform" icon="show_chart" bind:enabled bind:collapsed {matchHeight} {onReset}>
	<div class="controls">
		<OptionSelect label="Stage" bind:value={stage} options={STAGE_OPTIONS} />
		<Parameter
			type="range"
			label="Edge cutoff"
			bind:value={edgeThreshold}
			min={0}
			max={255}
			step={1}
			color={Colors.gray_white()}
		/>
		{#if showAngle}
			<Parameter
				type="range"
				label="Angle step"
				bind:value={angleStep}
				min={1}
				max={5}
				step={1}
				unit="°"
				color={Colors.cyan()}
			/>
		{/if}
		{#if showPeaks}
			<Parameter
				type="range"
				label="Strength"
				bind:value={minStrength}
				min={0}
				max={100}
				step={1}
				unit="%"
				color={Colors.yellow_amber()}
			/>
			<Parameter
				type="range"
				label="Max lines"
				bind:value={maxLines}
				min={1}
				max={20}
				step={1}
				color={Colors.blue()}
			/>
		{/if}
		<p class="readout">
			{voterCount.toLocaleString()} voters{#if showPeaks}
				· {lineCount} {lineCount === 1 ? 'line' : 'lines'}{/if}
		</p>
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

	.readout {
		margin: 0;
		font-size: 0.72rem;
		color: #94a3b8;
		font-variant-numeric: tabular-nums;
	}

	p {
		margin: 0 0 8px;
	}

	p:last-child {
		margin-bottom: 0;
	}
</style>
