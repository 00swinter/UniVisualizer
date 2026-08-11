<script>
	import OperatorBase from './OperatorBase.svelte';
	import { PixelBuffer } from '$lib/classes/PixelBuffer';
	import MathPlot2D from '$lib/components/MathPlot2D.svelte';
	import * as MD from '$lib/classes/MathPlot2D.svelte.js';
	import OptionSelect from '../../OptionSelect.svelte';
	import RadioSelect from '$lib/components/RadioSelect.svelte';
	import { Colors } from '$lib/classes/Colors';

	let { input, output = $bindable(), enabled = $bindable(true) } = $props();

	let controlMode = $state('linear'); // 'linear', 'gamma', 'bezier'
	let channelMode = $state('all'); // "all", "seperated"
	let activeTab = $state('red');

	function onReset() {}

	// points

	// linear

	const linear_points = {
		all1: new MD.Point(15,15),
		all2: new MD.Point(128, 128),
		all3: new MD.Point(240, 240),

		red1: new MD.Point(15,15),
		red2: new MD.Point(128, 128),
		red3: new MD.Point(240, 240),

		green1: new MD.Point(15,15),
		green2: new MD.Point(128, 128),
		green3: new MD.Point(240, 240),

		blue1: new MD.Point(15,15),
		blue2: new MD.Point(128, 128),
		blue3: new MD.Point(240, 240)
	}

	Object.values(linear_points).forEach((p) => {
		p.isDraggable = true;
		p.constraint = (x, y) => ({
			x: Math.max(0, Math.min(255, x)),
			y: Math.max(0, Math.min(255, y))
		});
	});

	const GammaPoints = {
		all: new MD.Point(128, 128),

		red: new MD.Point(128, 128),

		green: new MD.Point(128, 128),

		blue: new MD.Point(128, 128)
	}

	const BezierPoints = {
		all1: new MD.Point(64, 192),
		all2: new MD.Point(192, 64),

		red1: new MD.Point(64, 192),
		red2: new MD.Point(192, 64),

		green1: new MD.Point(64, 192),
		green2: new MD.Point(192, 64),

		blue1: new MD.Point(64, 192),
		blue2: new MD.Point(192, 64)
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

		output = nextOutput;
	});

	let plotItems = $derived.by(() => {
		return [];
	});

	/*

	let algoMode = $state('bezier'); // 'linear', 'gamma', 'bezier'
	let channelMode = $state('single');
	let activeTab = $state('red');

	// Initialize points at (255, 255) so the graph starts as a straight diagonal line (No Change)
	const points = {
		master: new MD.Point(255, 255),
		red: new MD.Point(255, 255),
		green: new MD.Point(255, 255),
		blue: new MD.Point(255, 255)
	};

	Object.values(points).forEach((p) => {
		p.isDraggable = true;
		p.constraint = (x, y) => ({
			x: Math.max(0, Math.min(255, x)),
			y: Math.max(0, Math.min(255, y))
		});
	});

	function onReset() {
		Object.values(points).forEach((p) => {
			p.x = 255;
			p.y = 255;
		});
		algoMode = 'linear';
		channelMode = 'single';
	}

	// --- Math Logic ---

	function solveCurve(x, point, mode) {
		const val = x / 255; // Input (0 to 1)
		const cx = point.x / 255; // Control X (0 to 1)
		const cy = point.y / 255; // Control Y (0 to 1)

		let y = val;

		if (mode === 'linear') {
			// --- LINEAR CONTRAST ---
			// Formula: y = (x - 0.5) * slope + 0.5
			// The slope is determined by the line connecting Middle Gray (0.5, 0.5) to our Point.

			// 1. Calculate Slope (Rise over Run) from the center pivot
			const run = cx - 0.5;

			// Avoid division by zero if point is perfectly vertical at 128
			if (Math.abs(run) < 0.001) {
				// Infinite slope (Thresholding)
				y = val > 0.5 ? 1 : 0;
			} else {
				const slope = (cy - 0.5) / run;
				y = (val - 0.5) * slope + 0.5;
			}
		} else if (mode === 'gamma') {
			// --- GAMMA ---
			// We use the X position of the point to determine the exponent.
			// Center (0.5) = Gamma 1.0. Left = High Gamma. Right = Low Gamma.
			const g = Math.pow(10, (0.5 - cx) * 2); // Logarithmic feel
			y = Math.pow(val, g);
		} else {
			// --- BEZIER ---
			if (Math.abs(cx - 0.5) < 0.001) return val * 255;
			const a = 1 - 2 * cx;
			const b = 2 * cx;
			const c = -val;
			const t = (-b + Math.sqrt(Math.max(0, b * b - 4 * a * c))) / (2 * a);
			y = 2 * (1 - t) * t * cy + t * t;
		}

		// Clamp results to 0-255 range
		return Math.max(0, Math.min(1, y)) * 255;
	}

	// --- Graph & Processing (Same as before) ---

	const currentPoint = $derived.by(() =>
		channelMode === 'single' ? points.master : points[activeTab]
	);

	const plotFunc = $derived.by(() => {
		const p = currentPoint;
		const m = algoMode;
		return new MD.Func((x) => solveCurve(x, p, m));
	});

	let plotItems = $derived([currentPoint, plotFunc]);

	$effect(() => {
		if (!input || !enabled) {
			output = input || null;
			return;
		}

		const src = input.data;
		const dst = new Uint8ClampedArray(src.length);
		const lutR = new Uint8ClampedArray(256);
		const lutG = new Uint8ClampedArray(256);
		const lutB = new Uint8ClampedArray(256);

		if (channelMode === 'single') {
			for (let i = 0; i < 256; i++) {
				const val = solveCurve(i, points.master, algoMode);
				lutR[i] = val;
				lutG[i] = val;
				lutB[i] = val;
			}
		} else {
			for (let i = 0; i < 256; i++) {
				lutR[i] = solveCurve(i, points.red, algoMode);
				lutG[i] = solveCurve(i, points.green, algoMode);
				lutB[i] = solveCurve(i, points.blue, algoMode);
			}
		}

		for (let i = 0; i < src.length; i += 4) {
			dst[i] = lutR[src[i]];
			dst[i + 1] = lutG[src[i + 1]];
			dst[i + 2] = lutB[src[i + 2]];
			dst[i + 3] = src[i + 3];
		}

		output = new PixelBuffer(input.width, input.height, dst);
	});

	const getTabColor = (tab) => {
		if (channelMode === 'single') return '#888';
		return tab === 'red' ? '#ff4444' : tab === 'green' ? '#44ff44' : '#4488ff';
	};

	*/
</script>

<OperatorBase title="Tone Curve" icon="contrast" bind:enabled {onReset}>
	<div class="controls">
		<RadioSelect
			options={[
				{ label: 'Linear', value: 'linear' },
				{ label: 'Gamma', value: 'gamma' },
				{ label: 'Bezier', value: 'bezier' }
			]}
			bind:value={controlMode}
		/>

		<RadioSelect
			options={[
				{ label: 'All Channels', value: 'all' },
				{ label: 'Separate Channels', value: 'seperated' }
			]}
			bind:value={channelMode}
		/>
	</div>

	<div class="plot">
		{#if channelMode === 'seperated'}
			<RadioSelect
				options={[
					{ label: 'Red', value: 'red', color: Colors.red() },
					{ label: 'Green', value: 'green', color: Colors.green() },
					{ label: 'Blue', value: 'blue', color: Colors.blue() }
				]}
				bind:value={activeTab}
				width="350px"
			/>
		{/if}
		<MathPlot2D
			title={''}
			bind:items={plotItems}
			xDomain={[0, 255]}
			yDomain={[0, 255]}
			width={300}
			height={300}
			flipY={false}
			showGrid={true}
			showLabel={false}
			domainLabelPadding={[3,2.5,2,5]}
			padding={[20,30,20,20]}
			xGridStep={64}
			yGridStep={64}
			xLabelStep={64}
			yLabelStep={64}
		/>
	</div>
</OperatorBase>

<style>
	.controls{
		display: flex;
		flex-direction: column;
		justify-content: flex-start;
		align-items: center;
		padding: 15px;
		gap: 15px;
	}
	.plot {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
	}
</style>
