<script lang="ts">
	import OperatorBase from './OperatorBase.svelte';
	import { PixelBuffer } from '$lib/classes/PixelBuffer';
	import OptionSelect from '$lib/components/OptionSelect.svelte';
	import OptionCheckbox from '$lib/components/OptionCheckbox.svelte';
	import InfoContainer from '$lib/components/Info_Container.svelte';

	interface Props {
		input: PixelBuffer | null;
		output?: PixelBuffer | null;
		enabled?: boolean;
		collapsed?: boolean;
	}

	type MorphMode = 'dilation' | 'erosion' | 'opening' | 'closing';
	type PresetId = 'cross' | 'square3' | 'disc5' | 'heart' | 'amongus' | 'empty';

	const GRID_SIZE = 7;
	const CENTER = 24;
	const HALF = 3;

	// Direct 7×7 kernels (row-major). true = active structuring-element cell.
	const HEART_PRESET: boolean[] = [
		false, true, true, false, true, true, false,
		true, true, true, true, true, true, true,
		true, true, true, true, true, true, true,
		true, true, true, true, true, true, true,
		false, true, true, true, true, true, false,
		false, false, true, true, true, false, false,
		false, false, false, true, false, false, false
	];

	const AMONGUS_PRESET: boolean[] = [
		false, false, true, true, true, false, false,
		false, true, true, true, true, true, false,
		true, true, true, false, false, false, false,
		true, true, true, false, false, false, false,
		true, true, true, true, true, true, false,
		false, true, true, true, true, true, false,
		false, true, true, false, true, true, false
	];

	const MODE_OPTIONS = [
		{ id: 'dilation', label: 'Dilation (Grow)' },
		{ id: 'erosion', label: 'Erosion (Shrink)' },
		{ id: 'opening', label: 'Opening (Clean Noise)' },
		{ id: 'closing', label: 'Closing (Fill Holes)' }
	];

	const MODE_INFO: Record<MorphMode, { title: string; description: string }> = {
		dilation: {
			title: 'Dilation',
			description:
				'Takes the maximum in the neighborhood defined by the kernel. Bright regions expand; useful for growing foreground / filling small gaps when working on bright objects.'
		},
		erosion: {
			title: 'Erosion',
			description:
				'Takes the minimum in the neighborhood. Bright regions shrink; useful for peeling away thin protrusions or isolating larger structures.'
		},
		opening: {
			title: 'Opening',
			description:
				'Erosion followed by dilation with the same kernel. Removes small bright noise and thin connections while roughly preserving larger shapes.'
		},
		closing: {
			title: 'Closing',
			description:
				'Dilation followed by erosion with the same kernel. Fills small dark holes and gaps inside bright regions without greatly changing overall size.'
		}
	};

	let {
		input,
		output = $bindable(null),
		enabled = $bindable(true),
		collapsed = $bindable(true)
	}: Props = $props();

	let mode = $state<MorphMode>('dilation');
	let infoOpen = $state(false);
	let gridState = $state(makePreset('cross'));
	let flipStamp = $state(true);

	const modeInfo = $derived(MODE_INFO[mode]);

	const activeKernel = $derived.by(() => {
		const offsets: { x: number; y: number }[] = [];
		for (let i = 0; i < gridState.length; i++) {
			if (!gridState[i]) continue;
			const col = i % GRID_SIZE;
			const row = Math.floor(i / GRID_SIZE);
			const dx = col - HALF;
			const dy = row - HALF;
			offsets.push(flipStamp ? { x: -dx, y: -dy } : { x: dx, y: dy });
		}
		return offsets;
	});

	function makePreset(name: PresetId): boolean[] {
		if (name === 'heart') return [...HEART_PRESET];
		if (name === 'amongus') return [...AMONGUS_PRESET];
		if (name === 'empty') return Array(GRID_SIZE * GRID_SIZE).fill(false) as boolean[];

		const grid = Array(GRID_SIZE * GRID_SIZE).fill(false) as boolean[];

		if (name === 'cross') {
			[CENTER, CENTER - 1, CENTER + 1, CENTER - GRID_SIZE, CENTER + GRID_SIZE].forEach(
				(i) => (grid[i] = true)
			);
		} else if (name === 'square3') {
			for (let y = -1; y <= 1; y++) {
				for (let x = -1; x <= 1; x++) {
					grid[CENTER + y * GRID_SIZE + x] = true;
				}
			}
		} else {
			for (let y = -2; y <= 2; y++) {
				for (let x = -2; x <= 2; x++) {
					if (x * x + y * y <= 5) grid[CENTER + y * GRID_SIZE + x] = true;
				}
			}
		}

		return grid;
	}

	function loadPreset(name: PresetId) {
		gridState = makePreset(name);
	}

	function toggleCell(index: number) {
		const next = [...gridState];
		next[index] = !next[index];
		gridState = next;
	}

	function onReset() {
		mode = 'dilation';
		flipStamp = true;
		gridState = makePreset('cross');
	}

	function sample(src: PixelBuffer, x: number, y: number) {
		const cx = x < 0 ? 0 : x >= src.width ? src.width - 1 : x;
		const cy = y < 0 ? 0 : y >= src.height ? src.height - 1 : y;
		return src.getPixel(cx, cy);
	}

	function runPass(
		src: PixelBuffer,
		kernel: { x: number; y: number }[],
		type: 'dilation' | 'erosion'
	): PixelBuffer {
		const next = new PixelBuffer(src.width, src.height);
		const dilate = type === 'dilation';

		for (let y = 0; y < src.height; y++) {
			for (let x = 0; x < src.width; x++) {
				let rVal = dilate ? 0 : 255;
				let gVal = dilate ? 0 : 255;
				let bVal = dilate ? 0 : 255;

				for (const k of kernel) {
					const p = sample(src, x + k.x, y + k.y);
					if (dilate) {
						if (p.r > rVal) rVal = p.r;
						if (p.g > gVal) gVal = p.g;
						if (p.b > bVal) bVal = p.b;
					} else {
						if (p.r < rVal) rVal = p.r;
						if (p.g < gVal) gVal = p.g;
						if (p.b < bVal) bVal = p.b;
					}
				}

				const a = src.getPixel(x, y).a;
				next.setPixel(x, y, rVal, gVal, bVal, a);
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

		const kernel = activeKernel;
		if (kernel.length === 0) {
			output = input;
			return;
		}

		let result: PixelBuffer;
		if (mode === 'dilation') {
			result = runPass(input, kernel, 'dilation');
		} else if (mode === 'erosion') {
			result = runPass(input, kernel, 'erosion');
		} else if (mode === 'opening') {
			result = runPass(runPass(input, kernel, 'erosion'), kernel, 'dilation');
		} else {
			result = runPass(runPass(input, kernel, 'dilation'), kernel, 'erosion');
		}

		output = result;
	});
</script>

<OperatorBase title="Morphology" icon="blur_on" bind:enabled bind:collapsed {onReset}>
	<div class="controls">
		<OptionSelect label="Operation" bind:value={mode} options={MODE_OPTIONS} />

		<div class="kernel-section">
			<div class="kernel-header">
				<span class="section-label">Structuring Element</span>
				<OptionCheckbox label="Flip stamp" bind:checked={flipStamp} />
			</div>
			<div class="kernel-editor">
				<div class="grid-container">
					{#each gridState as active, i (i)}
						<button
							type="button"
							class="grid-cell"
							class:active
							class:center={i === CENTER}
							onclick={() => toggleCell(i)}
							aria-label="Toggle kernel pixel {i}"
							aria-pressed={active}
						></button>
					{/each}
				</div>

				<div class="presets">
					<button type="button" class="preset-btn" title="Cross" onclick={() => loadPreset('cross')}
						>✚</button
					>
					<button
						type="button"
						class="preset-btn"
						title="3×3 Box"
						onclick={() => loadPreset('square3')}>◼</button
					>
					<button type="button" class="preset-btn" title="Disc" onclick={() => loadPreset('disc5')}
						>●</button
					>
					<button type="button" class="preset-btn" title="Heart" onclick={() => loadPreset('heart')}
						>♥</button
					>
					<button
						type="button"
						class="preset-btn"
						title="Among Us"
						onclick={() => loadPreset('amongus')}>ඞ</button
					>
					<button type="button" class="preset-btn" title="Empty" onclick={() => loadPreset('empty')}
						>□</button
					>
				</div>
			</div>
		</div>
	</div>

	<InfoContainer title={modeInfo.title} bind:open={infoOpen}>
		<p>{modeInfo.description}</p>
		<p>
			Click cells to edit the structuring element. With Flip stamp on, the kernel is reflected in
			calculations so the imprint matches the stamp you see. Empty kernels pass the image through
			unchanged.
		</p>
	</InfoContainer>
</OperatorBase>

<style>
	.controls {
		display: flex;
		flex-direction: column;
		gap: 12px;
		margin-bottom: 10px;
	}

	.kernel-section {
		display: flex;
		flex-direction: column;
		gap: 8px;
		background: #1a1a1a;
		padding: 12px;
		border-radius: 8px;
	}

	.section-label {
		font: 700 0.65rem 'Inter', sans-serif;
		color: #94a3b8;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.kernel-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}

	.kernel-header :global(.option_group.checkbox) {
		flex-direction: row;
		gap: 6px;
	}

	.kernel-header :global(.option_group.checkbox label) {
		font-size: 0.65rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		white-space: nowrap;
	}

	.kernel-editor {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 10px;
	}

	.presets {
		display: flex;
		flex-direction: column;
		gap: 4px;
		flex-shrink: 0;
	}

	.preset-btn {
		background: #161b22;
		border: 1px solid #343d4a;
		color: #94a3b8;
		width: 28px;
		height: 28px;
		flex-shrink: 0;
		font-size: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		border-radius: 5px;
		padding: 0;
		transition:
			border-color 0.15s,
			color 0.15s,
			background-color 0.15s;
	}

	.preset-btn:hover {
		border-color: #4b5563;
		color: #f1f5f9;
		background: #222;
	}

	.grid-container {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 2px;
		background: #111;
		padding: 3px;
		border: 1px solid #343d4a;
		border-radius: 6px;
		aspect-ratio: 1;
		width: 220px;
		max-width: calc(100% - 38px);
	}

	.grid-cell {
		background: #222;
		border: none;
		cursor: pointer;
		padding: 0;
		border-radius: 2px;
		position: relative;
		aspect-ratio: 1;
		transition: background-color 0.12s;
	}

	.grid-cell:hover {
		background: #333;
	}

	.grid-cell.active {
		background: #3b82f6;
	}

	.grid-cell.center::after {
		content: '';
		position: absolute;
		top: 25%;
		left: 25%;
		width: 50%;
		height: 50%;
		background: rgba(255, 255, 255, 0.3);
		border-radius: 50%;
		pointer-events: none;
	}

	.grid-cell.active.center::after {
		background: rgba(255, 255, 255, 0.6);
	}
</style>
