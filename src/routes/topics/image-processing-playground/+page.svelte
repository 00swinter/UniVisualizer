<script lang="ts">
  import { flip } from "svelte/animate";
  import type { Component } from "svelte";
  import type { PixelBuffer } from "$lib/classes/PixelBuffer";
  import PixelBufferLoader from "$lib/components/ImageProcessing/general/PixelBufferLoader.svelte";
  import GradientViewer from "$lib/components/ImageProcessing/general/GradientViewer.svelte";
  import Histogram from "$lib/components/ImageProcessing/general/Histogram.svelte";

  import Grayscale_Operator from "$lib/components/ImageProcessing/ImageProcessingOperators/Grayscale_Operator.svelte";
  import Convolution_Operator from "$lib/components/ImageProcessing/ImageProcessingOperators/Convolution_Operator.svelte";
  import Contrast_Operator from "$lib/components/ImageProcessing/ImageProcessingOperators/Contrast_Operator.svelte";
  import Threshold_Operator from "$lib/components/ImageProcessing/ImageProcessingOperators/Threshold_Operator.svelte";
  import Morphology_Operator from "$lib/components/ImageProcessing/ImageProcessingOperators/Morphology_Operator.svelte";
  import Transformation_Operator from "$lib/components/ImageProcessing/ImageProcessingOperators/Transformation_Operator.svelte";

  interface OperatorProps {
    input: PixelBuffer | null;
    output?: PixelBuffer | null;
    enabled?: boolean;
    collapsed?: boolean;
    matchHeight?: number;
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
    collapsed: boolean;
  }

  type ExpandedViewMode = "combined" | "image" | "histogram";

  const operatorRegistry: OperatorDef[] = [
    { type: "grayscale", label: "Grayscale", component: Grayscale_Operator },
    {
      type: "convolution",
      label: "Convolution",
      component: Convolution_Operator,
    },
    { type: "contrast", label: "Contrast", component: Contrast_Operator },
    { type: "threshold", label: "Threshold", component: Threshold_Operator },
    { type: "morphology", label: "Morphology", component: Morphology_Operator },
    {
      type: "transformation",
      label: "Transformation",
      component: Transformation_Operator,
    },
  ];

  let originalImage: PixelBuffer | null = $state(null);
  let pipeline: PipelineStep[] = $state([]);
  let selectedOperatorToAdd = $state(operatorRegistry[0].type);
  let expandedPreviewId: string | null = $state(null);
  let expandedViewMode = $state<ExpandedViewMode>("combined");
  let windowWidth = $state(1440);
  let windowHeight = $state(900);

  /** Image frame heights from GradientViewer, used to size sibling histograms. */
  let originalImageHeight = $state(0);
  let stepImageHeights: Record<string, number> = $state({});

  /** Cross-component hover state for original image. */
  let origHistBin = $state<number | null>(null);
  let origGradCol = $state<number | null>(null);
  let origGradValues = $state<{
    r: number;
    g: number;
    b: number;
    a: number;
  } | null>(null);
  let origImagePixel = $state<{
    x: number;
    y: number;
    r: number;
    g: number;
    b: number;
    a: number;
  } | null>(null);
  let origHistChannels = $state({ r: true, g: true, b: true, a: false });
  /** Cross-component hover state per pipeline step. */
  let stepHistBins: Record<string, number | null> = $state({});
  let stepGradCols: Record<string, number | null> = $state({});
  let stepGradValues: Record<
    string,
    { r: number; g: number; b: number; a: number } | null
  > = $state({});
  let stepImagePixels: Record<
    string,
    { x: number; y: number; r: number; g: number; b: number; a: number } | null
  > = $state({});
  let stepHistChannels: Record<
    string,
    { r: boolean; g: boolean; b: boolean; a: boolean }
  > = $state({});
  let expandedHistBin = $state<number | null>(null);
  let expandedGradCol = $state<number | null>(null);
  let expandedGradValues = $state<{
    r: number;
    g: number;
    b: number;
    a: number;
  } | null>(null);
  let expandedImagePixel = $state<{
    x: number;
    y: number;
    r: number;
    g: number;
    b: number;
    a: number;
  } | null>(null);
  let expandedHistChannels = $state({ r: true, g: true, b: true, a: false });

  function histHighlightBins(
    gradVals: { r: number; g: number; b: number; a: number } | null,
    imgPixel: { r: number; g: number; b: number; a: number } | null,
  ): { bin: number; color: string }[] {
    const vals = gradVals ?? imgPixel;
    if (!vals) return [];
    const bins: { bin: number; color: string }[] = [
      { bin: vals.r, color: "#ef4444" },
      { bin: vals.g, color: "#22c55e" },
      { bin: vals.b, color: "#3b82f6" },
    ];
    const seen = new Set<number>();
    return bins.filter((b) => {
      if (seen.has(b.bin)) return false;
      seen.add(b.bin);
      return true;
    });
  }

  /** Matches GradientViewer media-box border + padding so hist tops align with the image. */
  const IMAGE_INSET = 11;
  const ORIGINAL_PREVIEW_ID = "__original__";

  function addStep(type: string, index: number | null = null) {
    const opDef = operatorRegistry.find((op) => op.type === type);

    const newStep: PipelineStep = {
      id: crypto.randomUUID(),
      type: type,
      label: opDef ? opDef.label : "Unknown Step",
      output: null,
      collapsed: false,
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
    const removed = pipeline[index];
    pipeline = pipeline.filter((_, i) => i !== index);
    if (removed) {
      const { [removed.id]: _, ...rest } = stepImageHeights;
      stepImageHeights = rest;
    }
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

  function getComponentType(
    typeStr: string,
  ): Component<OperatorProps> | undefined {
    return operatorRegistry.find((op) => op.type === typeStr)?.component;
  }

  function openExpandedPreview(
    targetId: string,
    mode: ExpandedViewMode = "combined",
  ) {
    expandedPreviewId = targetId;
    expandedViewMode = mode;
    expandedHistBin = null;
    expandedGradCol = null;
    expandedGradValues = null;
    expandedImagePixel = null;
    expandedHistChannels = { r: true, g: true, b: true, a: false };
  }

  function closeExpandedStep() {
    expandedPreviewId = null;
    expandedViewMode = "combined";
    expandedHistBin = null;
    expandedGradCol = null;
    expandedGradValues = null;
    expandedImagePixel = null;
  }

  let expandedStep = $derived.by(() => {
    if (!expandedPreviewId || expandedPreviewId === ORIGINAL_PREVIEW_ID)
      return null;
    return pipeline.find((step) => step.id === expandedPreviewId) ?? null;
  });
  let expandedPreviewLabel = $derived(
    expandedPreviewId === ORIGINAL_PREVIEW_ID
      ? "Original Image"
      : (expandedStep?.label ?? ""),
  );
  let expandedPreviewBuffer = $derived(
    expandedPreviewId === ORIGINAL_PREVIEW_ID
      ? originalImage
      : (expandedStep?.output ?? null),
  );

  let popupCompact = $derived(windowWidth < 1150);
  let popupImageOnly = $derived(expandedViewMode === "image");
  let popupHistogramOnly = $derived(expandedViewMode === "histogram");
  let popupViewerFitWidth = $derived.by(() => {
    if (popupCompact) return Math.max(320, windowWidth - 32);
    if (popupImageOnly) return Math.max(320, windowWidth - 32);
    return Math.max(320, Math.floor(windowWidth - 32));
  });
  let popupViewerFitHeight = $derived.by(() => {
    if (popupImageOnly) return Math.max(240, windowHeight - 26);
    if (popupCompact) return Math.max(240, windowHeight - 34);
    return Math.max(240, windowHeight - 32);
  });
  let popupImageMaxHeight = $derived.by(() => {
    if (popupImageOnly) return Math.max(280, Math.floor(windowHeight - 52));
    if (popupCompact)
      return Math.max(210, Math.floor((windowHeight - 92) * 0.48));
    return Math.max(260, Math.floor(windowHeight - 62));
  });
  let popupImageWidth = $derived.by(() => {
    const aspectRatio =
      expandedPreviewBuffer && expandedPreviewBuffer.height > 0
        ? expandedPreviewBuffer.width / expandedPreviewBuffer.height
        : 1;
    const heightLimitedWidth = Math.floor(popupImageMaxHeight * aspectRatio);

    if (popupCompact) {
      return Math.max(
        280,
        Math.min(Math.floor(windowWidth - 120), heightLimitedWidth),
      );
    }

    if (popupImageOnly) {
      return Math.max(
        320,
        Math.min(Math.floor(windowWidth - 132), heightLimitedWidth),
      );
    }

    return Math.max(
      320,
      Math.min(
        Math.min(Math.floor(windowWidth * 0.46), Math.floor(windowWidth - 500)),
        heightLimitedWidth,
      ),
    );
  });
  let popupHistogramHeight = $derived.by(() => {
    if (popupHistogramOnly) return Math.max(280, Math.floor(windowHeight - 96));
    if (popupCompact)
      return Math.max(210, Math.floor((windowHeight - 92) * 0.42));
    return Math.max(260, Math.floor(windowHeight - 62));
  });
</script>

<svelte:window bind:innerWidth={windowWidth} bind:innerHeight={windowHeight} />

<div class="page-layout">
  <div class="loader-row">
    <PixelBufferLoader bind:buffer={originalImage} />
  </div>

  <div class="chain">
    <div class="step-row">
      <div class="flow">
        <div class="node op-node">
          <div class="step-meta step-meta-inline">
            <span class="step-badge">1</span>
          </div>

          <div class="op-bar static">
            <span class="material-icons-round">image</span>
            <span class="op-title">Original Image</span>
          </div>
        </div>

        <div class="connector" aria-hidden="true"></div>

        <div class="node image-node">
          <GradientViewer
            buffer={originalImage}
            bind:imageHeight={originalImageHeight}
            bind:hoveredColumnIndex={origGradCol}
            bind:hoveredColumnValues={origGradValues}
            bind:hoveredImagePixel={origImagePixel}
            externalHighlightColumn={origHistBin}
            externalHighlightChannels={origHistChannels}
            onExpand={() => openExpandedPreview(ORIGINAL_PREVIEW_ID, "image")}
          />
        </div>

        <div class="connector" aria-hidden="true"></div>

        <div class="node hist-node">
          <Histogram
            input={originalImage}
            matchHeight={originalImageHeight}
            offsetTop={IMAGE_INSET}
            bind:hoveredBin={origHistBin}
            bind:activeChannels={origHistChannels}
            externalHighlightBins={histHighlightBins(
              origGradValues,
              origImagePixel,
            )}
            onExpand={() =>
              openExpandedPreview(ORIGINAL_PREVIEW_ID, "histogram")}
          />
        </div>
      </div>
    </div>

    {#each pipeline as step, i (step.id)}
      <div class="step-item" animate:flip={{ duration: 1500 }}>
        <div class="step-link" aria-hidden="true"></div>

        <div class="step-row">
          <div class="flow">
            <div class="node op-node">
              <div class="operator-shell">
                <div
                  class="step-meta step-meta-side"
                  style:height={stepImageHeights[step.id]
                    ? `${stepImageHeights[step.id]}px`
                    : null}
                >
                  <span class="step-badge">{i + 2}</span>
                  <div class="step-controls">
                    <button
                      class="icon-btn"
                      onclick={() => moveStep(i, -1)}
                      disabled={i === 0}
                      title="Move up"
                    >
                      <span class="material-icons-round">keyboard_arrow_up</span
                      >
                    </button>
                    <button
                      class="icon-btn"
                      onclick={() => moveStep(i, 1)}
                      disabled={i === pipeline.length - 1}
                      title="Move down"
                    >
                      <span class="material-icons-round"
                        >keyboard_arrow_down</span
                      >
                    </button>
                    <button
                      class="icon-btn delete"
                      onclick={() => removeStep(i)}
                      title="Delete step"
                    >
                      <span class="material-icons-round">delete</span>
                    </button>
                    <button
                      class="icon-btn expand"
                      onclick={() => openExpandedPreview(step.id, "combined")}
                      title="Expand preview"
                    >
                      <span class="material-icons-round">open_in_full</span>
                    </button>
                  </div>
                </div>

                {#if getComponentType(step.type)}
                  {@const OperatorComponent = getComponentType(step.type)}
                  <OperatorComponent
                    input={getInputBuffer(i)}
                    bind:output={step.output}
                    bind:collapsed={step.collapsed}
                    matchHeight={stepImageHeights[step.id] ?? 0}
                  />
                {/if}
              </div>
            </div>

            <div class="connector" aria-hidden="true"></div>

            <div class="node image-node">
              <GradientViewer
                buffer={step.output}
                onExpand={() => openExpandedPreview(step.id, "image")}
                bind:imageHeight={
                  () => stepImageHeights[step.id] ?? 0,
                  (h) => {
                    stepImageHeights[step.id] = h;
                  }
                }
                bind:hoveredColumnIndex={
                  () => stepGradCols[step.id] ?? null,
                  (v) => {
                    stepGradCols[step.id] = v;
                  }
                }
                bind:hoveredColumnValues={
                  () => stepGradValues[step.id] ?? null,
                  (v) => {
                    stepGradValues[step.id] = v;
                  }
                }
                bind:hoveredImagePixel={
                  () => stepImagePixels[step.id] ?? null,
                  (v) => {
                    stepImagePixels[step.id] = v;
                  }
                }
                externalHighlightColumn={stepHistBins[step.id] ?? null}
                externalHighlightChannels={stepHistChannels[step.id] ?? {
                  r: true,
                  g: true,
                  b: true,
                  a: false,
                }}
              />
            </div>

            <div class="connector" aria-hidden="true"></div>

            <div class="node hist-node">
              <Histogram
                input={step.output}
                matchHeight={stepImageHeights[step.id] ?? 0}
                offsetTop={IMAGE_INSET}
                bind:hoveredBin={
                  () => stepHistBins[step.id] ?? null,
                  (v) => {
                    stepHistBins[step.id] = v;
                  }
                }
                bind:activeChannels={
                  () =>
                    stepHistChannels[step.id] ?? {
                      r: true,
                      g: true,
                      b: true,
                      a: false,
                    },
                  (v) => {
                    stepHistChannels[step.id] = v;
                  }
                }
                externalHighlightBins={histHighlightBins(
                  stepGradValues[step.id] ?? null,
                  stepImagePixels[step.id] ?? null,
                )}
                onExpand={() => openExpandedPreview(step.id, "histogram")}
              />
            </div>
          </div>
        </div>
      </div>
    {/each}

    <div class="add-section">
      <div class="step-link short add-link" aria-hidden="true"></div>
      <div class="add-card">
        <span class="label-faint">Next Operation:</span>
        <select bind:value={selectedOperatorToAdd} class="op-select">
          {#each operatorRegistry as op (op.type)}
            <option value={op.type}>{op.label}</option>
          {/each}
        </select>
        <button class="add-btn" onclick={() => addStep(selectedOperatorToAdd)}>
          + Add Step
        </button>
      </div>
    </div>
  </div>

  {#if expandedPreviewId}
    <div
      class="expand-backdrop"
      onclick={closeExpandedStep}
      role="presentation"
    ></div>

    <div
      class="expand-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="expanded-step-title"
    >
      <h3 id="expanded-step-title" class="sr-only">
        {expandedPreviewLabel} Preview
      </h3>
      <button
        class="expand-close"
        type="button"
        onclick={closeExpandedStep}
        aria-label="Close expanded preview"
      >
        <span class="material-icons-round">close</span>
      </button>

      {#if popupImageOnly}
        <div class="expand-body image-only">
          <div class="expand-image full-span">
            <GradientViewer
              buffer={expandedPreviewBuffer}
              imageWidth={popupImageWidth}
              maxImageHeight={popupImageMaxHeight}
              fitWidth={popupViewerFitWidth}
              fitHeight={popupViewerFitHeight}
              bind:hoveredColumnIndex={expandedGradCol}
              bind:hoveredColumnValues={expandedGradValues}
              bind:hoveredImagePixel={expandedImagePixel}
              externalHighlightColumn={expandedHistBin}
              externalHighlightChannels={expandedHistChannels}
            />
          </div>
        </div>
      {:else if popupHistogramOnly}
        <div class="expand-body histogram-only">
          <div class="expand-hist full-span">
            <Histogram
              input={expandedPreviewBuffer}
              width="100%"
              matchHeight={popupHistogramHeight}
              bind:hoveredBin={expandedHistBin}
              bind:activeChannels={expandedHistChannels}
              externalHighlightBins={histHighlightBins(
                expandedGradValues,
                expandedImagePixel,
              )}
            />
          </div>
        </div>
      {:else}
        <div class="expand-body">
          <div class="expand-image">
            <GradientViewer
              buffer={expandedPreviewBuffer}
              imageWidth={popupImageWidth}
              maxImageHeight={popupImageMaxHeight}
              fitWidth={popupViewerFitWidth}
              fitHeight={popupViewerFitHeight}
              bind:hoveredColumnIndex={expandedGradCol}
              bind:hoveredColumnValues={expandedGradValues}
              bind:hoveredImagePixel={expandedImagePixel}
              externalHighlightColumn={expandedHistBin}
              externalHighlightChannels={expandedHistChannels}
            />
          </div>

          <div class="expand-hist">
            <Histogram
              input={expandedPreviewBuffer}
              width="100%"
              matchHeight={popupHistogramHeight}
              bind:hoveredBin={expandedHistBin}
              bind:activeChannels={expandedHistChannels}
              externalHighlightBins={histHighlightBins(
                expandedGradValues,
                expandedImagePixel,
              )}
            />
          </div>
        </div>
      {/if}
    </div>
  {/if}
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
    --step-rail-x: 11px;
    --step-meta-width: 84px;
    --operator-col-width: 340px;
    --operator-sidebar-width: 44px;
    --operator-max-width: calc(
      var(--operator-col-width) - var(--operator-sidebar-width) - 12px
    );
    --connector-width: 28px;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 0;
  }

  .step-row {
    position: relative;
    display: flex;
    flex-direction: column;
  }

  .step-item {
    display: flex;
    flex-direction: column;
    will-change: transform;
  }

  .step-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    padding-left: 2px;
    min-height: 24px;
  }

  .step-meta-side {
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    gap: 14px;
    padding: 8px 0;
    min-width: 44px;
    border-radius: 14px;
    background: linear-gradient(
      180deg,
      rgba(20, 27, 39, 0.96),
      rgba(14, 19, 29, 0.92)
    );
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.04),
      0 10px 24px rgba(0, 0, 0, 0.28);
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
    flex-direction: column;
    gap: 8px;
    align-items: center;
  }

  .icon-btn {
    width: 32px;
    height: 32px;
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: linear-gradient(
      180deg,
      rgba(38, 48, 66, 0.96),
      rgba(24, 31, 44, 0.96)
    );
    color: #b7c2d3;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    transition:
      transform 0.16s ease,
      background 0.16s ease,
      border-color 0.16s ease,
      color 0.16s ease,
      box-shadow 0.16s ease;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.04),
      0 4px 12px rgba(0, 0, 0, 0.22);
  }

  .icon-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    background: linear-gradient(
      180deg,
      rgba(59, 130, 246, 0.28),
      rgba(37, 99, 235, 0.2)
    );
    border-color: rgba(96, 165, 250, 0.45);
    color: white;
  }

  .icon-btn:disabled {
    opacity: 0.32;
    cursor: not-allowed;
    box-shadow: none;
  }

  .icon-btn.delete:hover {
    background: linear-gradient(
      180deg,
      rgba(239, 68, 68, 0.9),
      rgba(185, 28, 28, 0.9)
    );
    border-color: rgba(248, 113, 113, 0.9);
    color: white;
  }

  .icon-btn.expand:hover {
    background: linear-gradient(
      180deg,
      rgba(34, 197, 94, 0.28),
      rgba(22, 163, 74, 0.2)
    );
    border-color: rgba(74, 222, 128, 0.45);
  }

  .flow {
    display: grid;
    grid-template-columns:
      var(--operator-col-width)
      var(--connector-width)
      max-content
      var(--connector-width)
      minmax(200px, 1fr);
    align-items: flex-start;
    gap: 0;
    width: 100%;
  }

  .node {
    position: relative;
    z-index: 1;
  }

  .op-node {
    width: var(--operator-col-width);
    max-width: var(--operator-col-width);
    min-width: 0;
    position: relative;
  }

  .operator-shell {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    width: 100%;
    min-width: 0;
  }

  .operator-shell :global(.operator_container) {
    flex: 1 1 auto;
    min-width: 0;
    max-width: var(--operator-max-width);
  }

  .icon-btn .material-icons-round {
    font-size: 18px;
    line-height: 1;
  }

  .image-node {
    flex: 0 0 auto;
    width: fit-content;
    max-width: min(640px, 45vw);
  }

  .hist-node {
    min-width: 200px;
  }

  /* Horizontal connectors between floating boxes */
  .connector {
    width: var(--connector-width);
    min-width: var(--connector-width);
    align-self: stretch;
    position: relative;
    pointer-events: none;
  }

  .connector::before {
    content: "";
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
    height: 8px;
    margin: 0 0 0 var(--step-rail-x);
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
    height: 6px;
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
    width: 100%;
    box-sizing: border-box;
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
    position: relative;
    display: flex;
    justify-content: flex-start;
    padding-top: 4px;
    padding-left: calc(
      var(--operator-col-width) + var(--connector-width) + 12px
    );
  }

  .add-card {
    position: relative;
    background: rgba(17, 17, 17, 0.7);
    border: 1px dashed rgba(255, 255, 255, 0.18);
    padding: 12px 20px;
    border-radius: 999px;
    display: flex;
    gap: 15px;
    align-items: center;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
  }

  .add-card::before {
    content: "";
    position: absolute;
    top: 50%;
    right: 100%;
    width: 36px;
    height: 2px;
    transform: translateY(-50%);
    background: repeating-linear-gradient(
      to right,
      rgba(59, 130, 246, 0.55),
      rgba(59, 130, 246, 0.55) 6px,
      transparent 6px,
      transparent 11px
    );
  }

  .add-link {
    position: absolute;
    left: var(--step-rail-x);
    top: 0;
    margin: 0;
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

  .expand-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(4, 8, 16, 0.7);
    backdrop-filter: blur(3px);
    z-index: 50;
  }

  .expand-modal {
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100vh;
    padding: 12px 16px 14px;
    border-radius: 0;
    background: rgba(16, 22, 32, 0.98);
    border: none;
    box-shadow: 0 30px 80px rgba(0, 0, 0, 0.45);
    z-index: 51;
    display: flex;
    flex-direction: column;
    gap: 10px;
    box-sizing: border-box;
    overflow: hidden;
  }

  .expand-close {
    position: absolute;
    top: 10px;
    right: 14px;
    z-index: 2;
    width: 36px;
    height: 36px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 999px;
    background: rgba(30, 41, 59, 0.95);
    color: #e2e8f0;
    display: grid;
    place-items: center;
    cursor: pointer;
    padding: 0;
  }

  .expand-close:hover {
    background: rgba(59, 130, 246, 0.24);
    border-color: rgba(96, 165, 250, 0.45);
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .expand-body {
    display: grid;
    grid-template-columns: max-content clamp(280px, 32vw, 420px);
    align-items: start;
    justify-content: center;
    gap: 16px;
    height: calc(100vh - 26px);
    min-height: 0;
    overflow: hidden;
    width: fit-content;
    max-width: 100%;
    margin: 0 auto;
  }

  .expand-image,
  .expand-hist {
    min-width: 0;
  }

  .expand-image {
    display: flex;
    justify-content: center;
    align-items: flex-start;
  }

  .expand-hist {
    align-self: stretch;
  }

  .expand-body.image-only,
  .expand-body.histogram-only {
    grid-template-columns: minmax(0, 1fr);
  }

  .expand-body.image-only {
    justify-items: center;
  }

  .expand-body.histogram-only {
    justify-items: stretch;
    width: 100%;
    max-width: 100%;
    padding-top: 44px;
    box-sizing: border-box;
  }

  .full-span {
    width: 100%;
    max-width: 100%;
  }

  @media (max-width: 1100px) {
    .expand-body {
      grid-template-columns: 1fr;
      grid-template-rows: auto minmax(0, 1fr);
    }
  }
</style>
