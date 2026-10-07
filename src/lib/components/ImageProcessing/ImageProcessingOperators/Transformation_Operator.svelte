<script lang="ts">
	import OperatorBase from './OperatorBase.svelte';
	import { PixelBuffer } from '$lib/classes/PixelBuffer';
	import Parameter from '$lib/components/Parameter.svelte';
	import RadioSelect from '$lib/components/RadioSelect.svelte';
	import OptionSelect from '$lib/components/OptionSelect.svelte';
	import { Colors } from '$lib/classes/Colors';

	interface Props {
		input: PixelBuffer | null;
		output?: PixelBuffer | null;
		enabled?: boolean;
		collapsed?: boolean;
		matchHeight?: number;
	}

	type FrameMode = 'original' | 'fit' | 'custom';
	type SampleMode = 'nearest' | 'bilinear';
	type OutsideMode = 'clear' | 'black' | 'white' | 'edge';

	interface Bounds {
		left: number;
		top: number;
		width: number;
		height: number;
	}

	interface Frame {
		originX: number;
		originY: number;
		width: number;
		height: number;
	}

	const PIVOT_THUMB_MAX = 180;
	const CUSTOM_CAP = 2048;
	const FIT_CAP = 4096;
	const EMPTY_FRAME: Frame = { originX: 0, originY: 0, width: 0, height: 0 };

	let pivotCanvas: HTMLCanvasElement | undefined = $state();

	let {
		input,
		output = $bindable(null),
		enabled = $bindable(true),
		collapsed = $bindable(true),
		matchHeight = 0
	}: Props = $props();

	let rotation = $state(0);
	let translationX = $state(0);
	let translationY = $state(0);
	let scaleX = $state(1);
	let scaleY = $state(1);
	let scaleLinked = $state(true);
	let anchorX = $state(0.5);
	let anchorY = $state(0.5);
	let frameMode = $state<FrameMode>('original');
	let margin = $state(0);
	let customWidth = $state(0);
	let customHeight = $state(0);
	let customSizeTouched = $state(false);
	let dimsLinked = $state(false);
	let dimAspect = $state(1);
	/** null means the frame is parked on the transformed image instead of the input. */
	let placeX = $state<number | null>(0.5);
	let placeY = $state<number | null>(0.5);
	let freeOriginX = $state(0);
	let freeOriginY = $state(0);
	let flipX = $state(false);
	let flipY = $state(false);
	let shearX = $state(0);
	let shearY = $state(0);
	let sampleMode = $state<SampleMode>('nearest');
	let outsideMode = $state<OutsideMode>('clear');

	let shiftLimit = $derived(
		Math.max(400, input ? Math.max(input.width, input.height) * 2 : 400)
	);

	function onReset() {
		rotation = 0;
		translationX = 0;
		translationY = 0;
		scaleX = 1;
		scaleY = 1;
		scaleLinked = true;
		anchorX = 0.5;
		anchorY = 0.5;
		frameMode = 'original';
		margin = 0;
		customSizeTouched = false;
		dimsLinked = false;
		dimAspect = 1;
		placeX = 0.5;
		placeY = 0.5;
		freeOriginX = 0;
		freeOriginY = 0;
		flipX = false;
		flipY = false;
		shearX = 0;
		shearY = 0;
		sampleMode = 'nearest';
		outsideMode = 'clear';
	}

	function onScaleXChange(newVal: number) {
		scaleX = newVal;
		if (scaleLinked) scaleY = newVal;
	}

	function onScaleYChange(newVal: number) {
		scaleY = newVal;
		if (scaleLinked) scaleX = newVal;
	}

	function clampDim(n: number, cap = CUSTOM_CAP) {
		if (!Number.isFinite(n)) return 1;
		return Math.max(1, Math.min(cap, Math.round(n)));
	}

	function setCustomWidth(next: number) {
		if (!Number.isFinite(next)) return;
		const w = clampDim(next);
		customSizeTouched = true;
		customWidth = w;
		if (dimsLinked) customHeight = clampDim(Math.round(w / Math.max(dimAspect, 1e-4)));
	}

	function setCustomHeight(next: number) {
		if (!Number.isFinite(next)) return;
		const h = clampDim(next);
		customSizeTouched = true;
		customHeight = h;
		if (dimsLinked) customWidth = clampDim(Math.round(h * dimAspect));
	}

	function toggleDimLink() {
		dimsLinked = !dimsLinked;
		if (dimsLinked) dimAspect = Math.max(1, customWidth) / Math.max(1, customHeight);
	}

	function matchInputSize() {
		if (!input) return;
		customSizeTouched = true;
		dimsLinked = false;
		customWidth = input.width;
		customHeight = input.height;
		placeX = 0.5;
		placeY = 0.5;
	}

	function transformedBounds(
		sw: number,
		sh: number,
		pivotU: number,
		pivotV: number,
		rotationDeg: number,
		tx: number,
		ty: number,
		sx: number,
		sy: number,
		mirrorX: boolean,
		mirrorY: boolean,
		kx: number,
		ky: number
	): Bounds {
		const pivotX = sw * pivotU;
		const pivotY = sh * pivotV;
		const theta = (rotationDeg * Math.PI) / 180;
		const cos = Math.cos(theta);
		const sin = Math.sin(theta);
		const signedX = (mirrorX ? -1 : 1) * sx;
		const signedY = (mirrorY ? -1 : 1) * sy;

		let minX = Infinity;
		let maxX = -Infinity;
		let minY = Infinity;
		let maxY = -Infinity;

		for (const [x, y] of [
			[0, 0],
			[sw, 0],
			[0, sh],
			[sw, sh]
		]) {
			const dx = (x - pivotX) * signedX;
			const dy = (y - pivotY) * signedY;
			const shx = dx + kx * dy;
			const shy = ky * dx + dy;
			const wx = shx * cos - shy * sin + pivotX + tx;
			const wy = shx * sin + shy * cos + pivotY + ty;
			if (wx < minX) minX = wx;
			if (wx > maxX) maxX = wx;
			if (wy < minY) minY = wy;
			if (wy > maxY) maxY = wy;
		}

		const eps = 1e-4;
		const left = Math.floor(minX + eps);
		const top = Math.floor(minY + eps);
		const right = Math.ceil(maxX - eps);
		const bottom = Math.ceil(maxY - eps);
		return {
			left,
			top,
			width: Math.max(1, right - left),
			height: Math.max(1, bottom - top)
		};
	}

	function currentBounds(): Bounds | null {
		if (!input) return null;
		return transformedBounds(
			input.width,
			input.height,
			anchorX,
			anchorY,
			rotation,
			translationX,
			translationY,
			Math.max(0.05, scaleX),
			Math.max(0.05, scaleY),
			flipX,
			flipY,
			shearX,
			shearY
		);
	}

	function snapToResult() {
		const bounds = currentBounds();
		if (!bounds) return;
		customSizeTouched = true;
		dimsLinked = false;
		customWidth = clampDim(bounds.width);
		customHeight = clampDim(bounds.height);
		freeOriginX = bounds.left;
		freeOriginY = bounds.top;
		placeX = null;
		placeY = null;
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
		if (!input || customSizeTouched) return;
		customWidth = input.width;
		customHeight = input.height;
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

	let frame = $derived.by(() => {
		if (!input || input.width < 1 || input.height < 1) return EMPTY_FRAME;

		const sw = input.width;
		const sh = input.height;
		const bounds = transformedBounds(
			sw,
			sh,
			anchorX,
			anchorY,
			rotation,
			translationX,
			translationY,
			Math.max(0.05, scaleX),
			Math.max(0.05, scaleY),
			flipX,
			flipY,
			shearX,
			shearY
		);

		if (frameMode === 'original') {
			return { originX: 0, originY: 0, width: sw, height: sh };
		}

		if (frameMode === 'fit') {
			const pad = Math.max(0, Math.round(margin));
			const width = Math.min(FIT_CAP, Math.max(1, bounds.width + pad * 2));
			const height = Math.min(FIT_CAP, Math.max(1, bounds.height + pad * 2));
			return {
				originX: bounds.left - pad,
				originY: bounds.top - pad,
				width,
				height
			};
		}

		const width = clampDim(customWidth > 0 ? customWidth : sw);
		const height = clampDim(customHeight > 0 ? customHeight : sh);
		if (placeX === null || placeY === null) {
			return { originX: freeOriginX, originY: freeOriginY, width, height };
		}
		return {
			originX: Math.round((sw - width) * placeX),
			originY: Math.round((sh - height) * placeY),
			width,
			height
		};
	});

	let sizeChanged = $derived(
		!!input && (frame.width !== input.width || frame.height !== input.height)
	);

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
		const dw = frame.width;
		const dh = frame.height;
		if (dw < 1 || dh < 1) {
			output = null;
			return;
		}

		const theta = (rotation * Math.PI) / 180;
		const cosTheta = Math.cos(theta);
		const sinTheta = Math.sin(theta);
		const signedScaleX = (flipX ? -1 : 1) * Math.max(0.05, scaleX);
		const signedScaleY = (flipY ? -1 : 1) * Math.max(0.05, scaleY);
		const pivotX = sw * anchorX;
		const pivotY = sh * anchorY;
		const det = 1 - shearX * shearY;
		const singular = Math.abs(det) < 1e-6;
		const invDet = singular ? 0 : 1 / det;
		const originX = frame.originX;
		const originY = frame.originY;
		const sampling = sampleMode;
		const outside = outsideMode;

		const nextOutput = new PixelBuffer(dw, dh);
		const dst = nextOutput.data;
		const samples = [
			[0, 0, 0, 0],
			[0, 0, 0, 0],
			[0, 0, 0, 0],
			[0, 0, 0, 0]
		];

		const load = (bucket: number[], ix: number, iy: number) => {
			if (outside === 'edge') {
				ix = Math.max(0, Math.min(sw - 1, ix));
				iy = Math.max(0, Math.min(sh - 1, iy));
			} else if (ix < 0 || iy < 0 || ix >= sw || iy >= sh) {
				if (outside === 'white') {
					bucket[0] = 255;
					bucket[1] = 255;
					bucket[2] = 255;
					bucket[3] = 255;
					return;
				}
				if (outside === 'black') {
					bucket[0] = 0;
					bucket[1] = 0;
					bucket[2] = 0;
					bucket[3] = 255;
					return;
				}
				bucket[0] = 0;
				bucket[1] = 0;
				bucket[2] = 0;
				bucket[3] = 0;
				return;
			}
			const srcIndex = (iy * sw + ix) * 4;
			bucket[0] = src[srcIndex];
			bucket[1] = src[srcIndex + 1];
			bucket[2] = src[srcIndex + 2];
			bucket[3] = src[srcIndex + 3];
		};

		for (let y = 0; y < dh; y++) {
			for (let x = 0; x < dw; x++) {
				const dstIndex = (y * dw + x) * 4;
				if (singular) {
					load(samples[0], -1, -1);
					dst[dstIndex] = samples[0][0];
					dst[dstIndex + 1] = samples[0][1];
					dst[dstIndex + 2] = samples[0][2];
					dst[dstIndex + 3] = samples[0][3];
					continue;
				}

				const dx = originX + x - pivotX - translationX;
				const dy = originY + y - pivotY - translationY;
				const rx = dx * cosTheta + dy * sinTheta;
				const ry = -dx * sinTheta + dy * cosTheta;
				const shx = (rx - shearX * ry) * invDet;
				const shy = (-shearY * rx + ry) * invDet;
				const srcX = shx / signedScaleX + pivotX;
				const srcY = shy / signedScaleY + pivotY;

				if (sampling === 'nearest') {
					load(samples[0], Math.round(srcX), Math.round(srcY));
					dst[dstIndex] = samples[0][0];
					dst[dstIndex + 1] = samples[0][1];
					dst[dstIndex + 2] = samples[0][2];
					dst[dstIndex + 3] = samples[0][3];
					continue;
				}

				const x0 = Math.floor(srcX);
				const y0 = Math.floor(srcY);
				const fx = srcX - x0;
				const fy = srcY - y0;
				load(samples[0], x0, y0);
				load(samples[1], x0 + 1, y0);
				load(samples[2], x0, y0 + 1);
				load(samples[3], x0 + 1, y0 + 1);
				const w00 = (1 - fx) * (1 - fy);
				const w10 = fx * (1 - fy);
				const w01 = (1 - fx) * fy;
				const w11 = fx * fy;
				const a00 = samples[0][3] * w00;
				const a10 = samples[1][3] * w10;
				const a01 = samples[2][3] * w01;
				const a11 = samples[3][3] * w11;
				const alpha = a00 + a10 + a01 + a11;
				const r = samples[0][0] * a00 + samples[1][0] * a10 + samples[2][0] * a01 + samples[3][0] * a11;
				const g = samples[0][1] * a00 + samples[1][1] * a10 + samples[2][1] * a01 + samples[3][1] * a11;
				const b = samples[0][2] * a00 + samples[1][2] * a10 + samples[2][2] * a01 + samples[3][2] * a11;
				if (alpha <= 0.5) {
					dst[dstIndex] = 0;
					dst[dstIndex + 1] = 0;
					dst[dstIndex + 2] = 0;
					dst[dstIndex + 3] = 0;
					continue;
				}
				dst[dstIndex] = Math.round(r / alpha);
				dst[dstIndex + 1] = Math.round(g / alpha);
				dst[dstIndex + 2] = Math.round(b / alpha);
				dst[dstIndex + 3] = Math.round(alpha);
			}
		}

		output = nextOutput;
	});
</script>

<OperatorBase title="Transformation" icon="transform" bind:enabled bind:collapsed {matchHeight} {onReset}>
	<div class="controls">
		<div class="frame-panel">
			<div class="section-label">Output size</div>
			<RadioSelect
				options={[
					{ label: 'Original', value: 'original' },
					{ label: 'Fit', value: 'fit' },
					{ label: 'Custom', value: 'custom' }
				]}
				bind:value={frameMode}
			/>
			<ul class="mode-notes">
				<li class:active={frameMode === 'original'}>
					<strong>Original</strong> keeps the input size. Pixels that leave the frame are cut off.
				</li>
				<li class:active={frameMode === 'fit'}>
					<strong>Fit</strong> shrinks or grows the frame to the transformed image. Moving it does not leave empty space, because the frame follows. Use margin for a border.
				</li>
				<li class:active={frameMode === 'custom'}>
					<strong>Custom</strong> is a frame you size yourself. The anchor sticks it to that point on the input.
				</li>
			</ul>

			<div class="size-readout" aria-live="polite">
				<span>In {input ? `${input.width}×${input.height}` : '—'}</span>
				<span class="size-arrow">→</span>
				<span class="size-out" class:changed={sizeChanged}>Out {frame.width}×{frame.height}</span>
			</div>

			{#if frameMode === 'fit'}
				<div class="param-row">
					<Parameter
						type="range"
						label="Margin"
						bind:value={margin}
						min={0}
						max={80}
						step={1}
						unit="px"
						color={Colors.gray_slate()}
						editable
					/>
					<button type="button" class="mini-reset" onclick={() => (margin = 0)} title="Reset margin">
						<span class="material-icons-round">replay</span>
					</button>
				</div>
			{/if}

			{#if frameMode === 'custom'}
				<div class="dim-row">
					<label class="dim-field">
						<span>W</span>
						<input
							type="number"
							min="1"
							max={CUSTOM_CAP}
							step="1"
							value={customWidth}
							onchange={(e) => setCustomWidth(Number(e.currentTarget.value))}
						/>
					</label>
					<label class="dim-field">
						<span>H</span>
						<input
							type="number"
							min="1"
							max={CUSTOM_CAP}
							step="1"
							value={customHeight}
							onchange={(e) => setCustomHeight(Number(e.currentTarget.value))}
						/>
					</label>
					<button
						type="button"
						class="link-btn"
						class:linked={dimsLinked}
						onclick={toggleDimLink}
						title={dimsLinked ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
						aria-pressed={dimsLinked}
					>
						<span class="material-icons-round">{dimsLinked ? 'link' : 'link_off'}</span>
					</button>
				</div>
				<div class="match-row">
					<button type="button" class="text-btn" onclick={matchInputSize}>Match input</button>
					<button
						type="button"
						class="text-btn"
						class:current={placeX === null}
						onclick={snapToResult}
						title="Size the frame to the transformed image and park it there"
					>
						Match content
					</button>
				</div>
				<div class="anchor-row">
					<div class="snap-grid" aria-label="Frame anchor">
						{#each [0, 0.5, 1] as ay}
							{#each [0, 0.5, 1] as ax}
								<button
									type="button"
									class="snap-dot anchor-dot"
									class:active={placeX === ax && placeY === ay}
									onclick={() => {
										placeX = ax;
										placeY = ay;
									}}
									aria-label="Anchor {ax === 0 ? 'left' : ax === 1 ? 'right' : 'center'} {ay === 0 ? 'top' : ay === 1 ? 'bottom' : 'middle'}"
								></button>
							{/each}
						{/each}
					</div>
					<p class="anchor-hint">
						{#if placeX === null}
							Frame is sitting on the transformed image. Change width or height to add a border or crop it.
						{:else}
							A larger frame adds empty pixels away from the anchor. A smaller frame crops the other sides.
						{/if}
					</p>
				</div>
			{/if}

			<div class="select-grid">
				<OptionSelect
					label="Background"
					bind:value={outsideMode}
					options={[
						{ id: 'clear', label: 'Transparent' },
						{ id: 'black', label: 'Black' },
						{ id: 'white', label: 'White' },
						{ id: 'edge', label: 'Edge' }
					]}
				/>
				<OptionSelect
					label="Sampling"
					bind:value={sampleMode}
					options={[
						{ id: 'nearest', label: 'Nearest' },
						{ id: 'bilinear', label: 'Bilinear' }
					]}
				/>
			</div>
		</div>

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
					<div class="pivot-crosshair-h" style:top={`${anchorY * 100}%`}></div>
					<div class="pivot-crosshair-v" style:left={`${anchorX * 100}%`}></div>
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
								onclick={() => {
									anchorX = ax;
									anchorY = ay;
								}}
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

		<div class="param-row">
			<Parameter
				type="range"
				label="Rotation"
				bind:value={rotation}
				min={-180}
				max={180}
				step={1}
				unit="°"
				color={Colors.yellow()}
				editable
			/>
			<button type="button" class="mini-reset" onclick={() => (rotation = 0)} title="Reset rotation">
				<span class="material-icons-round">replay</span>
			</button>
		</div>
		<div class="param-row">
			<Parameter
				type="range"
				label="TX"
				bind:value={translationX}
				min={-shiftLimit}
				max={shiftLimit}
				step={1}
				unit="px"
				color={Colors.red()}
				editable
			/>
			<button type="button" class="mini-reset" onclick={() => (translationX = 0)} title="Reset TX">
				<span class="material-icons-round">replay</span>
			</button>
		</div>
		<div class="param-row">
			<Parameter
				type="range"
				label="TY"
				bind:value={translationY}
				min={-shiftLimit}
				max={shiftLimit}
				step={1}
				unit="px"
				color={Colors.green()}
				editable
			/>
			<button type="button" class="mini-reset" onclick={() => (translationY = 0)} title="Reset TY">
				<span class="material-icons-round">replay</span>
			</button>
		</div>

		<div class="scale-row">
			<div class="scale-sliders">
				<div class="param-row">
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
						editable
					/>
					<button type="button" class="mini-reset" onclick={() => onScaleXChange(1)} title="Reset SX">
						<span class="material-icons-round">replay</span>
					</button>
				</div>
				<div class="param-row">
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
						editable
					/>
					<button type="button" class="mini-reset" onclick={() => onScaleYChange(1)} title="Reset SY">
						<span class="material-icons-round">replay</span>
					</button>
				</div>
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

		<div class="flip-row">
			<button
				type="button"
				class="text-btn"
				class:active={flipX}
				aria-pressed={flipX}
				onclick={() => (flipX = !flipX)}
			>
				Flip H
			</button>
			<button
				type="button"
				class="text-btn"
				class:active={flipY}
				aria-pressed={flipY}
				onclick={() => (flipY = !flipY)}
			>
				Flip V
			</button>
		</div>

		<div class="param-row">
			<Parameter
				type="range"
				label="Shear X"
				bind:value={shearX}
				min={-1}
				max={1}
				step={0.01}
				color={Colors.orange()}
				editable
			/>
			<button type="button" class="mini-reset" onclick={() => (shearX = 0)} title="Reset shear X">
				<span class="material-icons-round">replay</span>
			</button>
		</div>
		<div class="param-row">
			<Parameter
				type="range"
				label="Shear Y"
				bind:value={shearY}
				min={-1}
				max={1}
				step={0.01}
				color={Colors.cyan_teal()}
				editable
			/>
			<button type="button" class="mini-reset" onclick={() => (shearY = 0)} title="Reset shear Y">
				<span class="material-icons-round">replay</span>
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

	.frame-panel,
	.pivot-section {
		display: flex;
		flex-direction: column;
		gap: 6px;
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

	.mode-notes {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 3px;
	}

	.mode-notes li {
		font: 500 0.62rem/1.35 'Inter', sans-serif;
		color: #64748b;
	}

	.mode-notes li.active {
		color: #e2e8f0;
	}

	.mode-notes strong {
		font-weight: 700;
	}

	.size-readout {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 6px;
		padding: 4px 8px;
		border-radius: 6px;
		background: #0f172a;
		border: 1px solid #343d4a;
		font: 600 0.68rem/1 monospace;
		color: #94a3b8;
	}

	.size-arrow {
		color: #475569;
	}

	.size-out.changed {
		color: #facc15;
	}

	.dim-row,
	.match-row,
	.flip-row,
	.anchor-row {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.dim-field {
		flex: 1;
		min-width: 0;
		display: flex;
		align-items: center;
		gap: 4px;
		font: 700 0.62rem 'Inter', sans-serif;
		color: #94a3b8;
	}

	.dim-field input {
		width: 100%;
		min-width: 0;
		box-sizing: border-box;
		background: #0f172a;
		border: 1px solid #343d4a;
		color: #f1f5f9;
		border-radius: 6px;
		font: 600 0.75rem monospace;
		padding: 4px 6px;
	}

	.dim-field input:focus {
		outline: none;
		border-color: #3b82f6;
	}

	.anchor-hint {
		margin: 0;
		flex: 1;
		font: 500 0.62rem/1.35 'Inter', sans-serif;
		color: #94a3b8;
	}

	.select-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 6px;
	}

	.select-grid :global(.option_group) {
		margin-bottom: 0;
		gap: 3px;
	}

	.select-grid :global(.option_group label) {
		font-size: 0.6rem;
	}

	.select-grid :global(.custom_select) {
		padding: 4px 24px 4px 6px;
		font-size: 0.72rem;
	}

	.text-btn {
		flex: 1;
		height: 24px;
		border-radius: 6px;
		border: 1px solid #343d4a;
		background: #0f172a;
		color: #cbd5e1;
		font: 600 0.62rem 'Inter', sans-serif;
		cursor: pointer;
		padding: 0 6px;
	}

	.text-btn:hover {
		border-color: #60a5fa;
		color: #f8fafc;
	}

	.text-btn.active {
		background: rgba(59, 130, 246, 0.18);
		border-color: #3b82f6;
		color: #93c5fd;
	}

	.text-btn.current {
		background: rgba(250, 204, 21, 0.16);
		border-color: #eab308;
		color: #fde68a;
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
		flex-shrink: 0;
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

	.anchor-dot.active {
		background: #eab308;
		border-color: #fde68a;
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

	.param-row {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.param-row :global(.param-container) {
		flex: 1;
		min-width: 0;
	}

	.mini-reset {
		width: 22px;
		height: 22px;
		border-radius: 5px;
		border: 1px solid #343d4a;
		background: #161b22;
		color: #64748b;
		cursor: pointer;
		display: grid;
		place-items: center;
		padding: 0;
		flex-shrink: 0;
		transition: color 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
	}

	.mini-reset:hover {
		border-color: #ef4444;
		color: #f87171;
	}

	.mini-reset:active {
		transform: scale(0.85) rotate(-30deg);
		color: #ef4444;
	}

	.mini-reset .material-icons-round {
		font-size: 13px;
	}
</style>
