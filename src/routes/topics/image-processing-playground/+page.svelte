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

	const operatorRegistry: OperatorDef[] = [
		{ type: 'grayscale', label: 'Grayscale', component: Grayscale_Operator },
		{ type: 'convolution', label: 'Convolution', component: Convolution_Operator },
		{ type: 'contrast', label: 'Contrast', component: Contrast_Operator },
		{ type: 'threshold', label: 'Threshold', component: Threshold_Operator },
		{ type: 'morphology', label: 'Morphology', component: Morphology_Operator }
	];

	let originalImage: PixelBuffer | null = $state(null);
	let pipeline: PipelineStep[] = $state([]);
	let selectedOperatorToAdd = $state(operatorRegistry[0].type);

	function addStep(type: string, index: number | null = null) {
		const opDef = operatorRegistry.find((op) => op.type === type);

		const newStep: PipelineStep = {
			id: crypto.randomUUID(),
			type: type,
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

	function getInputBuffer(index: number): PixelBuffer | null {
		if (index === 0) return originalImage;
		return pipeline[index - 1].output;
	}

	function getComponentType(typeStr: string): Component<OperatorProps> | undefined {
		return operatorRegistry.find((op) => op.type === typeStr)?.component;
	}
</script>

<div class="page-layout">
	<div class="loader-row">
		<PixelBufferLoader bind:buffer={originalImage} />
	</div>

	<div class="chain">
		<div class="step-row">
			<div class="step-meta">
				<span class="step-badge">1</span>
			</div>

			<div class="flow">
				<div class="node op-node">
					<div class="op-bar static">
						<span class="material-icons-round">image</span>
						<span class="op-title">Original Image</span>
					</div>
				</div>

				<div class="connector" aria-hidden="true"></div>

				<div class="node image-node">
					<GradientViewer buffer={originalImage} />
				</div>

				<div class="connector" aria-hidden="true"></div>

				<div class="node hist-node">
					<Histogram input={originalImage} />
				</div>
			</div>
		</div>

		{#each pipeline as step, i (step.id)}
			<div class="step-link" aria-hidden="true"></div>

			<div class="step-row">
				<div class="step-meta">
					<span class="step-badge">{i + 2}</span>
					<div class="step-controls">
						<button class="icon-btn" onclick={() => moveStep(i, -1)} disabled={i === 0}>↑</button>
						<button
							class="icon-btn"
							onclick={() => moveStep(i, 1)}
							disabled={i === pipeline.length - 1}>↓</button
						>
						<button class="icon-btn delete" onclick={() => removeStep(i)}>×</button>
					</div>
				</div>

				<div class="flow">
					<div class="node op-node">
						{#if getComponentType(step.type)}
							{@const OperatorComponent = getComponentType(step.type)}
							<OperatorComponent input={getInputBuffer(i)} bind:output={step.output} />
						{/if}
					</div>

					<div class="connector" aria-hidden="true"></div>

					<div class="node image-node">
						<GradientViewer buffer={step.output} />
					</div>

					<div class="connector" aria-hidden="true"></div>

					<div class="node hist-node">
						<Histogram input={step.output} />
					</div>
				</div>
			</div>
		{/each}

		<div class="step-link short" aria-hidden="true"></div>

		<div class="add-section">
			<div class="add-card">
				<span class="label-faint">Next Operation:</span>
				<select bind:value={selectedOperatorToAdd} class="op-select">
					{#each operatorRegistry as op (op.type)}
						<option value={op.type}>{op.label}</option>
					{/each}
				</select>
				<button class="add-btn" onclick={() => addStep(selectedOperatorToAdd)}> + Add Step </button>
			</div>
		</div>
	</div>
</div>

<style>
	.page-layout {
		width: 100%;
		max-width: none;
		margin: 0;
		padding: 16px 20px 40px;
		background-color: transparent;
		min-height: 100vh;
		font-family: sans-serif;
		color: #e0e0e0;
		box-sizing: border-box;
	}

	.loader-row {
		display: flex;
		justify-content: center;
		align-items: center;
		margin-bottom: 28px;
		padding-bottom: 20px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
	}

	.chain {
		display: flex;
		flex-direction: column;
		align-items: stretch;
		gap: 0;
	}

	.step-row {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.step-meta {
		display: flex;
		align-items: center;
		gap: 8px;
		padding-left: 2px;
		min-height: 24px;
	}

	.step-badge {
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
		box-shadow: 0 0 12px rgba(59, 130, 246, 0.4);
		flex-shrink: 0;
	}

	.step-controls {
		display: flex;
		gap: 5px;
	}

	.icon-btn {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		border: 1px solid rgba(255, 255, 255, 0.12);
		background: rgba(20, 20, 24, 0.85);
		color: #888;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 12px;
		transition: all 0.2s;
	}

	.icon-btn:hover:not(:disabled) {
		background: #333;
		color: white;
	}

	.icon-btn:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.icon-btn.delete:hover {
		background: #ef4444;
		border-color: #ef4444;
		color: white;
	}

	.flow {
		display: flex;
		flex-direction: row;
		align-items: flex-start;
		gap: 0;
		width: 100%;
	}

	.node {
		position: relative;
		z-index: 1;
	}

	.op-node {
		width: fit-content;
		max-width: 340px;
		flex-shrink: 0;
	}

	.image-node {
		flex: 0 0 auto;
		width: fit-content;
		max-width: min(640px, 45vw);
	}

	.hist-node {
		flex: 1 1 auto;
		min-width: 200px;
	}

	/* Horizontal connectors between floating boxes */
	.connector {
		width: 28px;
		min-width: 28px;
		align-self: stretch;
		position: relative;
		flex-shrink: 0;
		pointer-events: none;
	}

	.connector::before {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		top: 36px;
		height: 2px;
		background: repeating-linear-gradient(
			to right,
			rgba(59, 130, 246, 0.55),
			rgba(59, 130, 246, 0.55) 6px,
			transparent 6px,
			transparent 11px
		);
	}

	/* Vertical link between pipeline steps */
	.step-link {
		width: 2px;
		height: 28px;
		margin: 4px 0 4px 11px;
		background: repeating-linear-gradient(
			to bottom,
			rgba(59, 130, 246, 0.45),
			rgba(59, 130, 246, 0.45) 5px,
			transparent 5px,
			transparent 9px
		);
		align-self: flex-start;
	}

	.step-link.short {
		height: 18px;
	}

	.op-bar {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 8px 12px;
		margin: 0;
		border: 1px solid rgba(52, 61, 74, 0.9);
		border-radius: 10px;
		background: #1e252e;
		color: #e0e0e0;
		font-family: inherit;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
	}

	.op-bar.static {
		cursor: default;
		min-width: 160px;
	}

	.op-bar .material-icons-round {
		font-size: 18px;
		color: #3b82f6;
		flex-shrink: 0;
	}

	.op-title {
		flex: 1;
		font-size: 0.85rem;
		font-weight: 600;
		white-space: nowrap;
	}

	.add-section {
		display: flex;
		justify-content: flex-start;
		padding-top: 4px;
		padding-left: 0;
	}

	.add-card {
		background: rgba(17, 17, 17, 0.7);
		border: 1px dashed rgba(255, 255, 255, 0.18);
		padding: 12px 20px;
		border-radius: 999px;
		display: flex;
		gap: 15px;
		align-items: center;
		box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
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

	.label-faint {
		color: #888;
		font-size: 0.8rem;
		text-transform: uppercase;
	}
</style>
