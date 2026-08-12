<script lang="ts">
	import OperatorBase from './OperatorBase.svelte';
	import { PixelBuffer } from '$lib/classes/PixelBuffer';
	import MathPlot2D from '$lib/components/MathPlot2D.svelte';
	import * as MD from '$lib/classes/MathPlot2D.svelte.js';
	import RadioSelect from '$lib/components/RadioSelect.svelte';
	import { Colors } from '$lib/classes/Colors';

	interface Props {
		input: PixelBuffer | null;
		output?: PixelBuffer | null;
		enabled?: boolean;
		collapsed?: boolean;
	}

	type Channel = 'all' | 'red' | 'green' | 'blue';
	type ControlMode = 'linear' | 'gamma' | 'bezier';
	type ChannelMode = 'all' | 'seperated';

	let {
		input,
		output = $bindable(null),
		enabled = $bindable(true),
		collapsed = $bindable(true)
	}: Props = $props();

	let controlMode = $state<ControlMode>('linear');
	let channelMode = $state<ChannelMode>('all');
	let activeTab = $state<'red' | 'green' | 'blue'>('red');

	const clamp255 = (v: number) => Math.max(0, Math.min(255, v));
	const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

	type PlotPoint = InstanceType<typeof MD.Point>;

	function makePoint(x: number, y: number, color?: string) {
		const p = new MD.Point(x, y);
		p.isDraggable = true;
		if (color) p.color = color;
		p.constraint = (nx: number, ny: number) => ({
			x: clamp255(nx),
			y: clamp255(ny)
		});
		return p;
	}

	function channelColor(channel: Channel) {
		if (channel === 'all') return Colors.gray_white();
		if (channel === 'red') return Colors.red();
		if (channel === 'green') return Colors.green();
		return Colors.blue();
	}

	const midHandleColor = Colors.yellow();

	function paintChannel(points: PlotPoint[], channel: Channel) {
		const color = channelColor(channel);
		for (const p of points) p.color = color;
		return points;
	}

	function syncLinearMid(channel: Channel) {
		const [p1, p2] = linearPoints[channel];
		const mid = linearMids[channel];
		mid.x = (p1.x + p2.x) / 2;
		mid.y = (p1.y + p2.y) / 2;
	}

	function clampPairTranslation(p1: PlotPoint, p2: PlotPoint, dx: number, dy: number) {
		let dxMin = -Infinity;
		let dxMax = Infinity;
		let dyMin = -Infinity;
		let dyMax = Infinity;
		for (const p of [p1, p2]) {
			dxMin = Math.max(dxMin, -p.x);
			dxMax = Math.min(dxMax, 255 - p.x);
			dyMin = Math.max(dyMin, -p.y);
			dyMax = Math.min(dyMax, 255 - p.y);
		}
		return {
			dx: Math.max(dxMin, Math.min(dxMax, dx)),
			dy: Math.max(dyMin, Math.min(dyMax, dy))
		};
	}

	function wireLinearHandles(channel: Channel) {
		const [p1, p2] = linearPoints[channel];
		const mid = linearMids[channel];

		p1.constraint = (nx: number, ny: number) => ({
			x: clamp255(nx),
			y: clamp255(ny)
		});
		p2.constraint = (nx: number, ny: number) => ({
			x: clamp255(nx),
			y: clamp255(ny)
		});

		mid.constraint = (nx: number, ny: number) => {
			const curX = (p1.x + p2.x) / 2;
			const curY = (p1.y + p2.y) / 2;
			const { dx, dy } = clampPairTranslation(p1, p2, nx - curX, ny - curY);
			p1.x += dx;
			p1.y += dy;
			p2.x += dx;
			p2.y += dy;
			return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
		};
	}

	const linearDefaults = {
		all: [
			[64, 64],
			[192, 192]
		],
		red: [
			[64, 64],
			[192, 192]
		],
		green: [
			[64, 64],
			[192, 192]
		],
		blue: [
			[64, 64],
			[192, 192]
		]
	} as const;

	const gammaDefaults = {
		all: [128, 128],
		red: [128, 128],
		green: [128, 128],
		blue: [128, 128]
	} as const;

	const bezierDefaults = {
		all: [
			[85, 85],
			[170, 170]
		],
		red: [
			[85, 85],
			[170, 170]
		],
		green: [
			[85, 85],
			[170, 170]
		],
		blue: [
			[85, 85],
			[170, 170]
		]
	} as const;

	const linearPoints = {
		all: paintChannel(
			linearDefaults.all.map(([x, y]) => makePoint(x, y)),
			'all'
		),
		red: paintChannel(
			linearDefaults.red.map(([x, y]) => makePoint(x, y)),
			'red'
		),
		green: paintChannel(
			linearDefaults.green.map(([x, y]) => makePoint(x, y)),
			'green'
		),
		blue: paintChannel(
			linearDefaults.blue.map(([x, y]) => makePoint(x, y)),
			'blue'
		)
	};

	const linearMids: Record<Channel, PlotPoint> = {
		all: makePoint(128, 128, midHandleColor),
		red: makePoint(128, 128, midHandleColor),
		green: makePoint(128, 128, midHandleColor),
		blue: makePoint(128, 128, midHandleColor)
	};

	for (const ch of ['all', 'red', 'green', 'blue'] as const) {
		wireLinearHandles(ch);
		syncLinearMid(ch);
	}

	// Keep the yellow handle centered between the two endpoints.
	$effect(() => {
		for (const ch of ['all', 'red', 'green', 'blue'] as const) {
			const [p1, p2] = linearPoints[ch];
			p1.x;
			p1.y;
			p2.x;
			p2.y;
			syncLinearMid(ch);
		}
	});

	const gammaPoints = {
		all: paintChannel([makePoint(...gammaDefaults.all)], 'all')[0],
		red: paintChannel([makePoint(...gammaDefaults.red)], 'red')[0],
		green: paintChannel([makePoint(...gammaDefaults.green)], 'green')[0],
		blue: paintChannel([makePoint(...gammaDefaults.blue)], 'blue')[0]
	};

	const bezierPoints = {
		all: paintChannel(
			bezierDefaults.all.map(([x, y]) => makePoint(x, y)),
			'all'
		),
		red: paintChannel(
			bezierDefaults.red.map(([x, y]) => makePoint(x, y)),
			'red'
		),
		green: paintChannel(
			bezierDefaults.green.map(([x, y]) => makePoint(x, y)),
			'green'
		),
		blue: paintChannel(
			bezierDefaults.blue.map(([x, y]) => makePoint(x, y)),
			'blue'
		)
	};

	function resetPoints(
		targets: PlotPoint[],
		defaults: readonly (readonly [number, number])[]
	) {
		defaults.forEach(([x, y], i) => {
			targets[i].x = x;
			targets[i].y = y;
		});
	}

	function onReset() {
		controlMode = 'linear';
		channelMode = 'all';
		activeTab = 'red';

		(Object.keys(linearDefaults) as Channel[]).forEach((ch) => {
			resetPoints(linearPoints[ch], linearDefaults[ch]);
			syncLinearMid(ch);
		});
		(Object.keys(gammaDefaults) as Channel[]).forEach((ch) => {
			const [x, y] = gammaDefaults[ch];
			gammaPoints[ch].x = x;
			gammaPoints[ch].y = y;
		});
		(Object.keys(bezierDefaults) as Channel[]).forEach((ch) => {
			resetPoints(bezierPoints[ch], bezierDefaults[ch]);
		});
	}

	function activeChannel(): Channel {
		return channelMode === 'all' ? 'all' : activeTab;
	}

	function getControlPoints(channel: Channel): PlotPoint[] {
		if (controlMode === 'linear') {
			return [...linearPoints[channel], linearMids[channel]];
		}
		if (controlMode === 'gamma') return [gammaPoints[channel]];
		return bezierPoints[channel];
	}

	/** Single straight line through the two endpoint controls (clamped to 0–255). */
	function evalLinear(x: number, points: PlotPoint[]) {
		const [p1, p2] = points;
		const dx = p2.x - p1.x;
		if (Math.abs(dx) < 1e-6) {
			// Vertical control segment → hard threshold at that x
			return x < p1.x ? 0 : 255;
		}
		const slope = (p2.y - p1.y) / dx;
		return clamp255(p1.y + slope * (x - p1.x));
	}

	/** Gamma curve that passes through the control point. */
	function evalGamma(x: number, point: PlotPoint) {
		const cx = clamp01(point.x / 255);
		const cy = clamp01(point.y / 255);
		const safeCx = Math.min(0.999, Math.max(0.001, cx));
		const safeCy = Math.min(0.999, Math.max(0.001, cy));
		const g = Math.log(safeCy) / Math.log(safeCx);
		return clamp255(Math.pow(clamp01(x / 255), g) * 255);
	}

	/** Cubic Bezier from (0,0) → (255,255) with two control points. */
	function evalBezier(x: number, p1: PlotPoint, p2: PlotPoint) {
		const target = clamp255(x);
		let lo = 0;
		let hi = 1;

		for (let i = 0; i < 24; i++) {
			const mid = (lo + hi) / 2;
			const mt = 1 - mid;
			const bx = 3 * mt * mt * mid * p1.x + 3 * mt * mid * mid * p2.x + mid * mid * mid * 255;
			if (bx < target) lo = mid;
			else hi = mid;
		}

		const t = (lo + hi) / 2;
		const mt = 1 - t;
		const by = 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * 255;
		return clamp255(by);
	}

	function solveCurve(x: number, channel: Channel) {
		if (controlMode === 'linear') {
			return evalLinear(x, linearPoints[channel]);
		}
		if (controlMode === 'gamma') {
			return evalGamma(x, gammaPoints[channel]);
		}
		const [p1, p2] = bezierPoints[channel];
		return evalBezier(x, p1, p2);
	}

	let plotTitle = $derived.by(() => {
		if (controlMode !== 'gamma') return '';
		const channel = activeChannel();
		const point = gammaPoints[channel];
		const cx = clamp01(point.x / 255);
		const cy = clamp01(point.y / 255);
		const safeCx = Math.min(0.999, Math.max(0.001, cx));
		const safeCy = Math.min(0.999, Math.max(0.001, cy));
		const g = Math.log(safeCy) / Math.log(safeCx);
		return `γ = ${g.toFixed(2)}`;
	});

	let plotItems = $derived.by(() => {
		const channel = activeChannel();
		const points = getControlPoints(channel);

		// Touch coordinates so drag updates re-derive the curve.
		for (const p of points) {
			p.x;
			p.y;
		}

		const curve = new MD.Func((x: number) => solveCurve(x, channel));
		curve.color = channelColor(channel);
		curve.width = 3;

		return [...points, curve];
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

		// Depend on modes + every control point so LUT rebuilds while dragging.
		controlMode;
		channelMode;
		for (const ch of ['all', 'red', 'green', 'blue'] as const) {
			for (const p of linearPoints[ch]) {
				p.x;
				p.y;
			}
			gammaPoints[ch].x;
			gammaPoints[ch].y;
			for (const p of bezierPoints[ch]) {
				p.x;
				p.y;
			}
		}

		const src = input.data;
		const dst = new Uint8ClampedArray(src.length);
		const lutR = new Uint8ClampedArray(256);
		const lutG = new Uint8ClampedArray(256);
		const lutB = new Uint8ClampedArray(256);

		if (channelMode === 'all') {
			for (let i = 0; i < 256; i++) {
				const v = solveCurve(i, 'all');
				lutR[i] = v;
				lutG[i] = v;
				lutB[i] = v;
			}
		} else {
			for (let i = 0; i < 256; i++) {
				lutR[i] = solveCurve(i, 'red');
				lutG[i] = solveCurve(i, 'green');
				lutB[i] = solveCurve(i, 'blue');
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
</script>

<OperatorBase title="Contrast" icon="contrast" bind:enabled bind:collapsed {onReset}>
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
				{ label: 'All', value: 'all' },
				{ label: 'Per Channel', value: 'seperated' }
			]}
			bind:value={channelMode}
		/>
	</div>

	<div class="plot">
		{#if channelMode === 'seperated'}
			<RadioSelect
				options={[
				{ label: 'R', value: 'red', color: Colors.red() },
				{ label: 'G', value: 'green', color: Colors.green() },
				{ label: 'B', value: 'blue', color: Colors.blue() }
				]}
				bind:value={activeTab}
			/>
		{/if}
		<MathPlot2D
			title={plotTitle}
			items={plotItems}
			xDomain={[0, 255]}
			yDomain={[0, 255]}
			width={220}
			height={220}
			flipY={false}
			showGrid={true}
			showLabel={false}
			domainLabelPadding={[3, 2.5, 2, 5]}
			padding={[20, 30, 20, 20]}
			xGridStep={63.75}
			yGridStep={63.75}
			xLabelStep={63.75}
			yLabelStep={63.75}
		/>
	</div>
</OperatorBase>

<style>
	.controls {
		display: flex;
		flex-direction: column;
		justify-content: flex-start;
		align-items: center;
		padding: 10px 15px 2px;
		gap: 2px;
	}
	.plot {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		width: 100%;
		min-width: 0;
		gap: 2px;
	}

	.plot :global(.plot-container) {
		max-width: 100%;
	}
</style>
