<script lang="ts">
	import OperatorBase from './OperatorBase.svelte';
	import { PixelBuffer } from '$lib/classes/PixelBuffer';
	import Parameter from '$lib/components/Parameter.svelte';
	import RadioSelect from '$lib/components/RadioSelect.svelte';
	import { Colors } from '$lib/classes/Colors';

	interface Props {
		input: PixelBuffer | null;
		output?: PixelBuffer | null;
		enabled?: boolean;
		collapsed?: boolean;
	}

	type ResizeMode = 'crop' | 'fit';

	const PIVOT_THUMB_MAX = 180;

	let pivotCanvas: HTMLCanvasElement | undefined = $state();

	let {
		input,
		output = $bindable(null),
		enabled = $bindable(true),
		collapsed = $bindable(true)
	}: Props = $props();

	let rotation = $state(0);
	let translationX = $state(0);
	let translationY = $state(0);
	let scaleX = $state(1);
	let scaleY = $state(1);
	let scaleLinked = $state(true);
	let anchorX = $state(0.5);
	let anchorY = $state(0.5);
	let resizeMode = $state<ResizeMode>('crop');

	function onReset() {
		rotation = 0;
		translationX = 0;
		translationY = 0;
		scaleX = 1;
		scaleY = 1;
		scaleLinked = true;
		anchorX = 0.5;
		anchorY = 0.5;
		resizeMode = 'crop';
	}

	function onScaleXChange(newVal: number) {
		scaleX = newVal;
		if (scaleLinked) scaleY = newVal;
	}

	function onScaleYChange(newVal: number) {
		scaleY = newVal;
		if (scaleLinked) scaleX = newVal;
	}

	function onPivotClick(event: MouseEvent) {
		const el = event.currentTarget as HTMLElement;
		const rect = el.getBoundingClientRect();
		anchorX = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
		anchorY = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
	}

	let pivotThumbWidth = $derived.by(() => {
		if (!input || input.width <= 0 || input.height <= 0) return PIVOT_THUMB_MAX;
		const aspect = input.width / input.height;
		if (aspect >= 1) return PIVOT_THUMB_MAX;
		return Math.max(24, Math.round(PIVOT_THUMB_MAX * aspect));
	});

	let pivotThumbHeight = $derived.by(() => {
		if (!input || input.width <= 0 || input.height <= 0) return PIVOT_THUMB_MAX;
		const aspect = input.width / input.height;
		if (aspect <= 1) return PIVOT_THUMB_MAX;
		return Math.max(24, Math.round(PIVOT_THUMB_MAX / aspect));
	});

	$effect(() => {
		if (!pivotCanvas || !input) return;
		const ctx = pivotCanvas.getContext('2d');
		if (!ctx) return;

		const tw = pivotThumbWidth;
		const th = pivotThumbHeight;

		pivotCanvas.width = tw;
		pivotCanvas.height = th;

		const imgData = new ImageData(new Uint8ClampedArray(input.data), input.width, input.height);
		const tmpCanvas = new OffscreenCanvas(input.width, input.height);
		const tmpCtx = tmpCanvas.getContext('2d')!;
		tmpCtx.putImageData(imgData, 0, 0);

		ctx.drawImage(tmpCanvas, 0, 0, tw, th);
	});

	function transformPoint(
		x: number,
		y: number,
		pivotX: number,
		pivotY: number,
		cosTheta: number,
		sinTheta: number,
		sx: number,
		sy: number,
		tx: number,
		ty: number
	) {
		const dx = (x - pivotX) * sx;
		const dy = (y - pivotY) * sy;
		return {
			x: dx * cosTheta - dy * sinTheta + pivotX + tx,
			y: dx * sinTheta + dy * cosTheta + pivotY + ty
		};
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

		const sw = input.width;
		const sh = input.height;
		const src = input.data;

		const theta = (rotation * Math.PI) / 180;
		const cosTheta = Math.cos(theta);
		const sinTheta = Math.sin(theta);
		const safeScaleX = Math.max(0.05, scaleX);
		const safeScaleY = Math.max(0.05, scaleY);
		const pivotX = sw * anchorX;
		const pivotY = sh * anchorY;

		let originX = 0;
		let originY = 0;
		let dw = sw;
		let dh = sh;

		if (resizeMode === 'fit') {
			const corners = [
				transformPoint(0, 0, pivotX, pivotY, cosTheta, sinTheta, safeScaleX, safeScaleY, translationX, translationY),
				transformPoint(sw, 0, pivotX, pivotY, cosTheta, sinTheta, safeScaleX, safeScaleY, translationX, translationY),
				transformPoint(0, sh, pivotX, pivotY, cosTheta, sinTheta, safeScaleX, safeScaleY, translationX, translationY),
				transformPoint(sw, sh, pivotX, pivotY, cosTheta, sinTheta, safeScaleX, safeScaleY, translationX, translationY)
			];

			let minX = Infinity;
			let maxX = -Infinity;
			let minY = Infinity;
			let maxY = -Infinity;

			for (const corner of corners) {
				if (corner.x < minX) minX = corner.x;
				if (corner.x > maxX) maxX = corner.x;
				if (corner.y < minY) minY = corner.y;
				if (corner.y > maxY) maxY = corner.y;
			}

			originX = Math.min(0, minX);
			originY = Math.min(0, minY);
			dw = Math.max(1, Math.ceil(Math.max(sw, maxX) - originX));
			dh = Math.max(1, Math.ceil(Math.max(sh, maxY) - originY));
		}

		const nextOutput = new PixelBuffer(dw, dh);
		const dst = nextOutput.data;

		for (let y = 0; y < dh; y++) {
			for (let x = 0; x < dw; x++) {
				const worldX = originX + x;
				const worldY = originY + y;

				const translatedX = worldX - pivotX - translationX;
				const translatedY = worldY - pivotY - translationY;

				const rotatedX = translatedX * cosTheta + translatedY * sinTheta;
				const rotatedY = -translatedX * sinTheta + translatedY * cosTheta;

				const srcX = rotatedX / safeScaleX + pivotX;
				const srcY = rotatedY / safeScaleY + pivotY;

				const nearestX = Math.round(srcX);
				const nearestY = Math.round(srcY);
				const dstIndex = (y * dw + x) * 4;

				if (nearestX < 0 || nearestX >= sw || nearestY < 0 || nearestY >= sh) {
					dst[dstIndex + 3] = 0;
					continue;
				}

				const srcIndex = (nearestY * sw + nearestX) * 4;
				dst[dstIndex] = src[srcIndex];
				dst[dstIndex + 1] = src[srcIndex + 1];
				dst[dstIndex + 2] = src[srcIndex + 2];
				dst[dstIndex + 3] = src[srcIndex + 3];
			}
		}

		output = nextOutput;
	});
</script>

<OperatorBase title="Transformation" icon="transform" bind:enabled bind:collapsed {onReset}>
	<div class="controls">
		<RadioSelect
			options={[
				{ label: 'Crop', value: 'crop' },
				{ label: 'Fit', value: 'fit' }
			]}
			bind:value={resizeMode}
		/>

		<div class="pivot-section">
			<div class="section-label">Pivot</div>
			<div class="pivot-row">
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<div
					class="pivot-thumb-wrap"
					style:width={`${pivotThumbWidth}px`}
					style:height={`${pivotThumbHeight}px`}
					role="button"
					tabindex="0"
					aria-label="Click to set pivot point"
					onclick={onPivotClick}
				>
					<canvas bind:this={pivotCanvas} class="pivot-canvas"></canvas>
					<div
						class="pivot-crosshair-h"
						style:top={`${anchorY * 100}%`}
					></div>
					<div
						class="pivot-crosshair-v"
						style:left={`${anchorX * 100}%`}
					></div>
					<div
						class="pivot-dot-overlay"
						style:left={`${anchorX * 100}%`}
						style:top={`${anchorY * 100}%`}
					></div>
				</div>
				<div class="snap-grid">
					{#each [0, 0.5, 1] as ay}
						{#each [0, 0.5, 1] as ax}
							<button
								type="button"
								class="snap-dot"
								class:active={anchorX === ax && anchorY === ay}
								onclick={() => { anchorX = ax; anchorY = ay; }}
								aria-label="Pivot {ax * 100}% {ay * 100}%"
							></button>
						{/each}
					{/each}
				</div>
			</div>
			<div class="pivot-readout">{Math.round(anchorX * 100)}%, {Math.round(anchorY * 100)}%</div>
		</div>

		<div class="dial-row">
			<div class="dial">
				<div class="dial-marker" style:transform={`rotate(${rotation}deg)`}></div>
				<div class="pivot-dot" style:left={`${anchorX * 100}%`} style:top={`${anchorY * 100}%`}></div>
			</div>
			<div class="dial-value">{Math.round(rotation)}deg</div>
		</div>

		<Parameter
			type="range"
			label="Rotation"
			bind:value={rotation}
			min={-180}
			max={180}
			step={1}
			unit="°"
			color={Colors.yellow()}
		/>
		<Parameter
			type="range"
			label="TX"
			bind:value={translationX}
			min={-300}
			max={300}
			step={1}
			unit="px"
			color={Colors.red()}
		/>
		<Parameter
			type="range"
			label="TY"
			bind:value={translationY}
			min={-300}
			max={300}
			step={1}
			unit="px"
			color={Colors.green()}
		/>

		<div class="scale-row">
			<div class="scale-sliders">
				<Parameter
					type="range"
					label="SX"
					bind:value={
						() => scaleX,
						(v) => onScaleXChange(v as number)
					}
					min={0.05}
					max={3}
					step={0.01}
					color={Colors.blue()}
				/>
				<Parameter
					type="range"
					label="SY"
					bind:value={
						() => scaleY,
						(v) => onScaleYChange(v as number)
					}
					min={0.05}
					max={3}
					step={0.01}
					color={Colors.purple()}
				/>
			</div>
			<button
				type="button"
				class="link-btn"
				class:linked={scaleLinked}
				onclick={() => {
					scaleLinked = !scaleLinked;
					if (scaleLinked) scaleY = scaleX;
				}}
				title={scaleLinked ? 'Unlink X/Y scale' : 'Link X/Y scale'}
				aria-pressed={scaleLinked}
			>
				<span class="material-icons-round">{scaleLinked ? 'link' : 'link_off'}</span>
			</button>
		</div>
	</div>
</OperatorBase>

<style>
	.controls {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.controls :global(.segmented-control) {
		font-size: 0.7rem;
	}

	.controls :global(.segmented-control .label-text) {
		padding: 5px 8px;
	}

	.controls :global(.param-container) {
		padding: 4px 6px;
		border-radius: 8px;
		border-left-width: 4px;
		gap: 2px;
	}

	.controls :global(.param-container .header) {
		font-size: 0.7rem;
	}

	.controls :global(.param-container .value-readout) {
		font-size: 0.62rem;
		padding: 1px 6px;
		border-radius: 999px;
		border-width: 1px;
	}

	.controls :global(.param-container .slider) {
		height: 14px;
	}

	.pivot-section {
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: 6px 8px;
		border-radius: 8px;
		background: #161b22;
		border: 1px solid #343d4a;
	}

	.section-label {
		font: 700 0.6rem 'Inter', sans-serif;
		color: #94a3b8;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.pivot-thumb-wrap {
		position: relative;
		border-radius: 4px;
		overflow: hidden;
		border: 1px solid #475569;
		background: #000;
		cursor: crosshair;
	}

	.pivot-canvas {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: contain;
		image-rendering: pixelated;
	}

	.pivot-crosshair-h {
		position: absolute;
		left: 0;
		right: 0;
		height: 1px;
		background: rgba(250, 204, 21, 0.7);
		pointer-events: none;
	}

	.pivot-crosshair-v {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 1px;
		background: rgba(250, 204, 21, 0.7);
		pointer-events: none;
	}

	.pivot-dot-overlay {
		position: absolute;
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: #facc15;
		border: 1px solid #000;
		transform: translate(-50%, -50%);
		pointer-events: none;
		box-shadow: 0 0 3px rgba(0, 0, 0, 0.6);
	}

	.pivot-row {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.snap-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 3px;
	}

	.snap-dot {
		width: 14px;
		height: 14px;
		border-radius: 3px;
		border: 1px solid #475569;
		background: #1f2937;
		cursor: pointer;
		padding: 0;
		transition: background 0.12s ease, border-color 0.12s ease;
	}

	.snap-dot:hover {
		border-color: #60a5fa;
		background: #263348;
	}

	.snap-dot.active {
		background: #3b82f6;
		border-color: #93c5fd;
	}

	.pivot-readout {
		font: 600 0.6rem monospace;
		color: #94a3b8;
		text-align: center;
	}

	.dial-row {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 4px 0 2px;
	}

	.dial {
		position: relative;
		width: 38px;
		height: 38px;
		border-radius: 999px;
		border: 2px solid #475569;
		background: radial-gradient(circle at center, #111827 0%, #0f172a 100%);
		overflow: hidden;
	}

	.dial-marker {
		position: absolute;
		left: calc(50% - 1px);
		top: 3px;
		width: 2px;
		height: calc(50% - 3px);
		background: #facc15;
		transform-origin: bottom center;
	}

	.pivot-dot {
		position: absolute;
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: #f8fafc;
		transform: translate(-50%, -50%);
		box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.9);
	}

	.dial-value {
		min-width: 42px;
		text-align: right;
		font-family: monospace;
		font-size: 0.8rem;
		color: #facc15;
	}

	.scale-row {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.scale-sliders {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 6px;
		min-width: 0;
	}

	.link-btn {
		width: 26px;
		height: 26px;
		border-radius: 6px;
		border: 1px solid #475569;
		background: #161b22;
		color: #64748b;
		cursor: pointer;
		display: grid;
		place-items: center;
		padding: 0;
		flex-shrink: 0;
		transition:
			background 0.15s ease,
			border-color 0.15s ease,
			color 0.15s ease;
	}

	.link-btn:hover {
		border-color: #60a5fa;
		color: #e2e8f0;
	}

	.link-btn.linked {
		background: rgba(59, 130, 246, 0.18);
		border-color: #3b82f6;
		color: #93c5fd;
	}

	.link-btn .material-icons-round {
		font-size: 15px;
	}
</style>
