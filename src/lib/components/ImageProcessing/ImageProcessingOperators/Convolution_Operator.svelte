<script lang="ts">
	import OperatorBase from './OperatorBase.svelte';
	import { PixelBuffer } from '$lib/classes/PixelBuffer';
	import OptionSelect from '../../OptionSelect.svelte';
	import InfoContainer from '$lib/components/Info_Container.svelte';

	interface Props {
		input: PixelBuffer | null;
		output?: PixelBuffer | null;
		enabled?: boolean;
	}

	type PresetId =
		| 'identity'
		| 'box_blur'
		| 'gaussian_blur'
		| 'sharpen'
		| 'laplace'
		| 'laplace_diag'
		| 'sobel_x'
		| 'sobel_y'
		| 'emboss'
		| 'custom';

	const KERNEL_SIZE = 3;
	const HALF = 1;

	const PRESETS: Record<Exclude<PresetId, 'custom'>, number[]> = {
		identity: [0, 0, 0, 0, 1, 0, 0, 0, 0],
		box_blur: [1, 1, 1, 1, 1, 1, 1, 1, 1],
		gaussian_blur: [1, 2, 1, 2, 4, 2, 1, 2, 1],
		sharpen: [0, -1, 0, -1, 5, -1, 0, -1, 0],
		laplace: [0, 1, 0, 1, -4, 1, 0, 1, 0],
		laplace_diag: [1, 1, 1, 1, -8, 1, 1, 1, 1],
		sobel_x: [-1, 0, 1, -2, 0, 2, -1, 0, 1],
		sobel_y: [-1, -2, -1, 0, 0, 0, 1, 2, 1],
		emboss: [-2, -1, 0, -1, 1, 1, 0, 1, 2]
	};

	const PRESET_OPTIONS = [
		{ id: 'identity', label: 'Identity' },
		{ id: 'box_blur', label: 'Box Blur' },
		{ id: 'gaussian_blur', label: 'Gaussian Blur' },
		{ id: 'sharpen', label: 'Sharpen' },
		{ id: 'laplace', label: 'Laplace' },
		{ id: 'laplace_diag', label: 'Laplace (8-neighbor)' },
		{ id: 'sobel_x', label: 'Sobel X' },
		{ id: 'sobel_y', label: 'Sobel Y' },
		{ id: 'emboss', label: 'Emboss' },
		{ id: 'custom', label: 'Custom' }
	];

	const REPEAT_OPTIONS = [
		{ id: '1', label: '1×' },
		{ id: '2', label: '2×' },
		{ id: '3', label: '3×' }
	];

	let { input, output = $bindable(null), enabled = $bindable(true) }: Props = $props();

	let kernel = $state([...PRESETS.identity] as number[]);
	let preset: PresetId = $state('identity');
	let repeats = $state('1');

	function applyPreset(id: PresetId) {
		if (id === 'custom') return;
		kernel = [...PRESETS[id]];
	}

	function markCustom() {
		if (preset !== 'custom') preset = 'custom';
	}

	function onReset() {
		preset = 'identity';
		repeats = '1';
		applyPreset('identity');
	}

	function onPresetSelect(id: string) {
		preset = id as PresetId;
		applyPreset(preset);
	}

	function clampByte(v: number): number {
		return v < 0 ? 0 : v > 255 ? 255 : v;
	}

	function sample(src: PixelBuffer, x: number, y: number) {
		const cx = x < 0 ? 0 : x >= src.width ? src.width - 1 : x;
		const cy = y < 0 ? 0 : y >= src.height ? src.height - 1 : y;
		return src.getPixel(cx, cy);
	}

	function convolveOnce(src: PixelBuffer, k: number[]): PixelBuffer {
		const kernelSum = k.reduce((sum, w) => sum + w, 0);
		const normalize = Math.abs(kernelSum) > 1e-6;
		const next = new PixelBuffer(src.width, src.height);

		for (let y = 0; y < src.height; y++) {
			for (let x = 0; x < src.width; x++) {
				// Premultiplied RGB + alpha so transparent borders soften correctly
				let r = 0;
				let g = 0;
				let b = 0;
				let a = 0;

				for (let ky = 0; ky < KERNEL_SIZE; ky++) {
					for (let kx = 0; kx < KERNEL_SIZE; kx++) {
						const weight = k[ky * KERNEL_SIZE + kx];
						const px = sample(src, x + kx - HALF, y + ky - HALF);
						const alpha = px.a / 255;
						r += px.r * alpha * weight;
						g += px.g * alpha * weight;
						b += px.b * alpha * weight;
						a += px.a * weight;
					}
				}

				if (normalize) {
					r /= kernelSum;
					g /= kernelSum;
					b /= kernelSum;
					a /= kernelSum;
				} else {
					// Zero-sum kernels (Sobel/Laplace): abs so edges stay visible
					r = Math.abs(r);
					g = Math.abs(g);
					b = Math.abs(b);
					a = Math.abs(a);
				}

				const outA = clampByte(a);
				if (outA > 0) {
					const inv = 255 / outA;
					r *= inv;
					g *= inv;
					b *= inv;
				} else {
					r = 0;
					g = 0;
					b = 0;
				}

				next.setPixel(x, y, clampByte(r), clampByte(g), clampByte(b), outA);
			}
		}

		return next;
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

		const k = kernel;
		const times = Number(repeats) || 1;
		let current: PixelBuffer = input;

		for (let i = 0; i < times; i++) {
			current = convolveOnce(current, k);
		}

		output = current;
	});
</script>

<OperatorBase title="Custom Kernel" icon="grid_on" bind:enabled {onReset}>
	<div class="kernel-ui">
		<OptionSelect label="Repeat" bind:value={repeats} options={REPEAT_OPTIONS} />

		<div class="kernel-grid">
			{#each kernel as _, index (index)}
				<div class="cell-wrapper">
					<input
						type="number"
						step="0.1"
						bind:value={kernel[index]}
						oninput={markCustom}
					/>
				</div>
			{/each}
		</div>

		<OptionSelect
			label="Preset"
			bind:value={() => preset, onPresetSelect}
			options={PRESET_OPTIONS}
		/>
	</div>

	<InfoContainer title="Instructions">
		<p>
			Pick a <strong>preset</strong> or edit the 3×3 kernel weights directly. The default is an
			identity kernel (all zeros with <strong>1</strong> in the center). Use <strong>Repeat</strong>
			to apply the same kernel multiple times in a row.
		</p>
	</InfoContainer>
</OperatorBase>

<style>
	.kernel-ui {
		display: flex;
		flex-direction: column;
		gap: 12px;
		background: #1a1a1a;
		padding: 16px;
		border-radius: 8px;
	}

	.kernel-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 4px;
		justify-content: center;
	}

	.cell-wrapper {
		position: relative;
		background: #222;
		border: 2px solid transparent;
		border-radius: 4px;
		transition: all 0.2s;
	}

	.cell-wrapper input {
		width: 50px;
		height: 40px;
		background: transparent;
		border: none;
		color: white;
		text-align: center;
		font-family: monospace;
	}

	input::-webkit-outer-spin-button,
	input::-webkit-inner-spin-button {
		appearance: none;
		margin: 0;
	}
</style>
