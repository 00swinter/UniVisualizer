<script lang="ts">
	import OperatorBase from './OperatorBase.svelte';
	import { PixelBuffer } from '$lib/classes/PixelBuffer';
	import OptionSelect from '../../OptionSelect.svelte';
	import OptionCheckbox from '../../OptionCheckbox.svelte';
	import InfoContainer from '$lib/components/Info_Container.svelte';

	interface Props {
		input: PixelBuffer | null;
		output?: PixelBuffer | null;
		enabled?: boolean;
		collapsed?: boolean;
		matchHeight?: number;
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

	const PRESET_INFO: Record<PresetId, { title: string; description: string }> = {
		identity: {
			title: 'Identity',
			description:
				'Leaves the image unchanged. The center weight is 1 and every neighbor is 0, so each output pixel copies its input.'
		},
		box_blur: {
			title: 'Box Blur',
			description:
				'Averages all 9 neighbors equally. Softens detail and noise with a uniform, box-shaped smoothing effect.'
		},
		gaussian_blur: {
			title: 'Gaussian Blur',
			description:
				'A softer blur that weights the center more than the edges (approximation of a Gaussian). Smooths the image while keeping a bit more structure than a box blur.'
		},
		sharpen: {
			title: 'Sharpen',
			description:
				'Boosts the center pixel and subtracts its neighbors. Increases local contrast so edges and fine detail look crisper.'
		},
		laplace: {
			title: 'Laplace',
			description:
				'A 4-neighbor Laplacian edge detector. Highlights sudden intensity changes; flat regions become dark and edges stand out.'
		},
		laplace_diag: {
			title: 'Laplace (8-neighbor)',
			description:
				'Like Laplace, but includes diagonals too. More sensitive to edges in every direction around each pixel.'
		},
		sobel_x: {
			title: 'Sobel X',
			description:
				'Detects vertical edges by measuring horizontal gradients (left vs right). Strong responses where brightness changes sideways.'
		},
		sobel_y: {
			title: 'Sobel Y',
			description:
				'Detects horizontal edges by measuring vertical gradients (top vs bottom). Strong responses where brightness changes up/down.'
		},
		emboss: {
			title: 'Emboss',
			description:
				'Creates a relief / stamped look by contrasting opposite corners of the neighborhood, as if lit from one direction.'
		},
		custom: {
			title: 'Custom',
			description:
				'You are editing the kernel manually. Change any weight to design your own filter; pick a preset again to reload a known kernel.'
		}
	};

	const REPEAT_OPTIONS = [
		{ id: '1', label: '1×' },
		{ id: '2', label: '2×' },
		{ id: '3', label: '3×' }
	];

	let {
		input,
		output = $bindable(null),
		enabled = $bindable(true),
		collapsed = $bindable(true),
		matchHeight = 0
	}: Props = $props();

	let kernel = $state([...PRESETS.identity] as number[]);
	let preset: PresetId = $state('identity');
	let repeats = $state('1');
	let mutateAlpha = $state(false);
	let infoOpen = $state(false);

	const presetInfo = $derived(PRESET_INFO[preset]);

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
		mutateAlpha = false;
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

	function convolveOnce(src: PixelBuffer, k: number[], shouldMutateAlpha: boolean): PixelBuffer {
		const kernelSum = k.reduce((sum, w) => sum + w, 0);
		const normalize = Math.abs(kernelSum) > 1e-6;
		const next = new PixelBuffer(src.width, src.height);

		for (let y = 0; y < src.height; y++) {
			for (let x = 0; x < src.width; x++) {
				let r = 0;
				let g = 0;
				let b = 0;
				let a = 0;

				for (let ky = 0; ky < KERNEL_SIZE; ky++) {
					for (let kx = 0; kx < KERNEL_SIZE; kx++) {
						const weight = k[ky * KERNEL_SIZE + kx];
						const px = sample(src, x + kx - HALF, y + ky - HALF);
						// Straight RGB — alpha must not influence color when mutate-alpha is off
						r += px.r * weight;
						g += px.g * weight;
						b += px.b * weight;
						if (shouldMutateAlpha) a += px.a * weight;
					}
				}

				if (normalize) {
					r /= kernelSum;
					g /= kernelSum;
					b /= kernelSum;
					if (shouldMutateAlpha) a /= kernelSum;
				} else {
					// Zero-sum kernels (Sobel/Laplace): abs so edges stay visible
					r = Math.abs(r);
					g = Math.abs(g);
					b = Math.abs(b);
					if (shouldMutateAlpha) a = Math.abs(a);
				}

				const outA = shouldMutateAlpha ? clampByte(a) : src.getPixel(x, y).a;
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
		const shouldMutateAlpha = mutateAlpha;
		let current: PixelBuffer = input;

		for (let i = 0; i < times; i++) {
			current = convolveOnce(current, k, shouldMutateAlpha);
		}

		output = current;
	});
</script>

<OperatorBase title="Convolution" icon="grid_on" bind:enabled bind:collapsed {matchHeight} {onReset}>
	<div class="kernel-ui">
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

		<div class="controls-row">
			<OptionSelect
				label="Preset"
				bind:value={() => preset, onPresetSelect}
				options={PRESET_OPTIONS}
			/>
			<OptionSelect label="Repeat" bind:value={repeats} options={REPEAT_OPTIONS} />
			<OptionCheckbox label="Affect alpha" bind:checked={mutateAlpha} />
		</div>
	</div>

	<InfoContainer title={presetInfo.title} bind:open={infoOpen}>
		<p>{presetInfo.description}</p>
		<p>
			Use <strong>Repeat</strong> to apply the kernel multiple times.
			<strong>Affect alpha</strong> only changes whether alpha is convolved; RGB is always
			filtered the same way.
		</p>
	</InfoContainer>
</OperatorBase>

<style>
	.kernel-ui {
		display: flex;
		flex-direction: column;
		gap: 12px;
		background: #1a1a1a;
		padding: 12px;
		border-radius: 8px;
		min-width: 0;
		box-sizing: border-box;
	}

	.kernel-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 4px;
		justify-content: center;
	}

	.controls-row {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		align-items: flex-end;
	}

	.controls-row :global(.option_group) {
		flex: 1 1 120px;
		min-width: 0;
		margin-bottom: 0;
	}

	.controls-row :global(.option_group.checkbox) {
		flex: 0 0 auto;
	}

	.cell-wrapper {
		position: relative;
		background: #222;
		border: 2px solid transparent;
		border-radius: 4px;
		transition: all 0.2s;
		min-width: 0;
	}

	.cell-wrapper input {
		width: 100%;
		min-width: 0;
		height: 40px;
		background: transparent;
		border: none;
		color: white;
		text-align: center;
		font-family: monospace;
		font-size: 1rem;
	}

	input::-webkit-outer-spin-button,
	input::-webkit-inner-spin-button {
		appearance: none;
		margin: 0;
	}
</style>
