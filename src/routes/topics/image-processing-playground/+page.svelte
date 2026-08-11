<script lang="ts">
	import type { Component } from 'svelte';
	import type { PixelBuffer } from '$lib/classes/PixelBuffer';
	import PixelBufferLoader from '$lib/components/ImageProcessing/general/PixelBufferLoader.svelte';
	import GradientViewer from '$lib/components/ImageProcessing/general/GradientViewer.svelte';
	import Histogram from '$lib/components/ImageProcessing/general/Histogram.svelte';

	import Grayscale_Operator from '$lib/components/ImageProcessing/ImageProcessingOperators/Grayscale_Operator.svelte';
	import Convolution_Operator from '$lib/components/ImageProcessing/ImageProcessingOperators/Convolution_Operator.svelte';
	import Contrast_Operator from '$lib/components/ImageProcessing/ImageProcessingOperators/Contrast_Operator.svelte';
	import Threshold_Operator from '$lib/components/ImageProcessing/ImageProcessingOperators/Threshold_Operator.svelte';
	import Morphology_Operator from '$lib/components/ImageProcessing/ImageProcessingOperators/Morphology_Operator.svelte';

	// --- 1. CONFIGURATION ---

	interface OperatorProps {
		input: PixelBuffer | null;
		output?: PixelBuffer | null;
		enabled?: boolean;
	}

	interface OperatorDef {
		type: string;
		label: string;
		component: Component<OperatorProps>;
	}

	interface PipelineStep {
		id: string;
		type: string;
		label: string;
		output: PixelBuffer | null;
	}

	// The registry defines which operators are allowed and their labels
	const operatorRegistry: OperatorDef[] = [
		{ type: 'grayscale', label: 'Grayscale', component: Grayscale_Operator },
		{ type: 'convolution', label: 'Convolution', component: Convolution_Operator },
		{ type: 'contrast', label: 'Contrast', component: Contrast_Operator },
		{ type: 'threshold', label: 'Threshold', component: Threshold_Operator },
		{ type: 'morphology', label: 'Morphology', component: Morphology_Operator }
	];

	// --- 2. STATE ---

	let originalImage: PixelBuffer | null = $state(null);

	// The dynamic pipeline. Each item needs a unique ID, type, and an output buffer container.
	let pipeline: PipelineStep[] = $state([]);

	let selectedOperatorToAdd = $state(operatorRegistry[0].type);

	// --- 3. ACTIONS ---

	function addStep(type: string, index: number | null = null) {
		// 1. Find the full definition from your registry to get the label
		const opDef = operatorRegistry.find((op) => op.type === type);

		const newStep: PipelineStep = {
			id: crypto.randomUUID(),
			type: type,
			// 2. Add the label here so step.label works in the HTML
			label: opDef ? opDef.label : 'Unknown Step',
			output: null
		};

		if (index === null) {
			pipeline = [...pipeline, newStep];
		} else {
			const newPipeline = [...pipeline];
			newPipeline.splice(index, 0, newStep);
			pipeline = newPipeline;
		}
	}

	function removeStep(index: number) {
		pipeline = pipeline.filter((_, i) => i !== index);
	}

	function moveStep(index: number, direction: number) {
		if (direction === -1 && index === 0) return;
		if (direction === 1 && index === pipeline.length - 1) return;

		const newPipeline = [...pipeline];
		const temp = newPipeline[index];
		newPipeline[index] = newPipeline[index + direction];
		newPipeline[index + direction] = temp;
		pipeline = newPipeline;
	}

	// Helper to get input buffer based on index
	// If index 0, input is originalImage. Otherwise, input is previous step's output.
	function getInputBuffer(index: number): PixelBuffer | null {
		if (index === 0) return originalImage;
		return pipeline[index - 1].output;
	}

	// Helper to find component class from registry
	function getComponentType(typeStr: string): Component<OperatorProps> | undefined {
		return operatorRegistry.find((op) => op.type === typeStr)?.component;
	}
</script>

<div class="page-layout">
	<div class="loader-row">
		<PixelBufferLoader bind:buffer={originalImage} />
	</div>

	<div class="chain">
		<div class="pipeline-line"></div>

		<div class="step-card">
			<div class="step-badge">1</div>

			<div class="sidebar-col">
				<div class="spacer">
					<span class="label-faint" style="font-size: 30px;">Original Image</span>
				</div>
				<Histogram input={originalImage} />
			</div>

			<div class="main-col">
				<GradientViewer buffer={originalImage} />
			</div>
		</div>

		{#each pipeline as step, i (step.id)}
			<div class="step-card">
				<div class="step-badge">
					{i + 2}
				</div>

				<div class="step-controls">
					<button class="icon-btn" onclick={() => moveStep(i, -1)} disabled={i === 0}>↑</button>
					<button
						class="icon-btn"
						onclick={() => moveStep(i, 1)}
						disabled={i === pipeline.length - 1}>↓</button
					>
					<button class="icon-btn delete" onclick={() => removeStep(i)}>×</button>
				</div>

				<div class="sidebar-col">
					<div class="operator-wrapper">
						{#if getComponentType(step.type)}
							{@const OperatorComponent = getComponentType(step.type)}
							<OperatorComponent input={getInputBuffer(i)} bind:output={step.output} />
						{/if}
					</div>
					<Histogram input={step.output} />
				</div>

				<div class="main-col">
					<GradientViewer buffer={step.output} />
				</div>
			</div>
		{/each}

		<div class="add-section">
			<div class="add-card">
				<span class="label-faint">Next Operation:</span>
				<select bind:value={selectedOperatorToAdd} class="op-select">
					{#each operatorRegistry as op}
						<option value={op.type}>{op.label}</option>
					{/each}
				</select>
				<button class="add-btn" onclick={() => addStep(selectedOperatorToAdd)}> + Add Step </button>
			</div>
		</div>
	</div>
</div>

<style>
	/* --- NEW STYLES FOR DYNAMICS (Added to your existing CSS) --- */

	/* Small controls near the badge */
	.step-controls {
		position: absolute;
		top: -12px;
		left: 55px; /* Right of badge */
		display: flex;
		gap: 5px;
		z-index: 5;
	}

	.icon-btn {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		border: 1px solid #444;
		background: #222;
		color: #888;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 12px;
		transition: all 0.2s;
	}

	.icon-btn:hover:not(:disabled) {
		background: #444;
		color: white;
	}

	.icon-btn:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.icon-btn.delete:hover {
		background: #ef4444;
		border-color: #ef4444;
	}

	/* Add Section at bottom */
	.add-section {
		display: flex;
		justify-content: center;
		padding-top: 10px;
		z-index: 1;
	}

	.add-card {
		background: #111;
		border: 1px dashed #444;
		padding: 15px 25px;
		border-radius: 30px;
		display: flex;
		gap: 15px;
		align-items: center;
	}

	.op-select {
		background: #222;
		color: #eee;
		border: 1px solid #333;
		padding: 5px 10px;
		border-radius: 4px;
	}

	.add-btn {
		background: #3b82f6;
		color: white;
		border: none;
		padding: 6px 16px;
		border-radius: 4px;
		cursor: pointer;
		font-weight: bold;
	}
	.add-btn:hover {
		background: #2563eb;
	}

	/* --- ORIGINAL CSS BELOW (UNCHANGED) --- */

	/* --- GLOBAL LAYOUT --- */
	.page-layout {
		max-width: 1500px;
		margin: 0 auto;
		padding: 24px;
		background-color: #0d0d0d; /* Very dark background */
		min-height: 100vh;
		font-family: sans-serif;
		color: #e0e0e0;
	}

	.loader-row {
		display: flex;
		justify-content: center;
		align-items: center;
		margin-bottom: 24px;
		padding-bottom: 16px;
		border-bottom: 1px solid #333;
	}

	.header-label {
		font-size: 1.2rem;
		font-weight: bold;
		color: #888;
		letter-spacing: 1px;
		text-transform: uppercase;
	}

	/* --- CHAIN CONTAINER --- */
	.chain {
		position: relative; /* Context for the line */
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	/* The Vertical Dashed Line */
	.pipeline-line {
		position: absolute;
		left: 50%;
		top: 0;
		bottom: 0;
		width: 2px;
		background: repeating-linear-gradient(
			to bottom,
			#333,
			#333 10px,
			transparent 10px,
			transparent 20px
		);
		transform: translateX(-50%);
		z-index: 0;
	}

	/* --- STEP CARD (The Container) --- */
	.step-card {
		position: relative;
		display: flex;
		flex-direction: row;
		gap: 14px;

		background: #1a1a1a;
		border: 1px solid #333;
		border-radius: 12px;
		padding: 14px;

		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
		z-index: 1; /* Sit above the line */
	}

	/* Number Badge on the left */
	.step-badge {
		position: absolute;
		top: -12px;
		left: 20px;
		background: #3b82f6;
		color: white;
		font-weight: bold;
		width: 24px;
		height: 24px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.8rem;
		box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
	}

	/* --- LEFT COLUMN (Operator + Histogram) --- */
	.sidebar-col {
		display: flex;
		flex-direction: column;
		justify-content: flex-start;
		align-items: stretch; /* Stretch to fill width */
		gap: 10px;

		/* Fixed width ensures alignment across steps */
		width: 360px;
		min-width: 360px;

		background: #161616;
		border-radius: 8px;
		border: 1px solid #2a2a2a;
		padding: 12px;
	}

	.operator-wrapper {
		padding-bottom: 10px;
		border-bottom: 1px dashed #333;
	}

	.spacer {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.label-faint {
		color: #444;
		font-size: 0.8rem;
		text-transform: uppercase;
	}

	/* --- RIGHT COLUMN (Image) --- */
	.main-col {
		flex: 1; /* Take remaining space */
		display: flex;
		justify-content: center;
		align-items: flex-start;
		background: #111;
		border-radius: 8px;
		border: 1px solid #2a2a2a;
		padding: 8px;
		min-height: 0;
	}
</style>
