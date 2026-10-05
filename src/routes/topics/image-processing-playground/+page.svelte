<script lang="ts">
  import { flip } from "svelte/animate";
  import { tick } from "svelte";
  import type { Component } from "svelte";
  import type { PixelBuffer } from "$lib/classes/PixelBuffer";
  import PixelBufferLoader from "$lib/components/ImageProcessing/general/PixelBufferLoader.svelte";
  import GradientViewer from "$lib/components/ImageProcessing/general/GradientViewer.svelte";
  import Histogram from "$lib/components/ImageProcessing/general/Histogram.svelte";

  import Grayscale_Operator from "$lib/components/ImageProcessing/ImageProcessingOperators/Grayscale_Operator.svelte";
  import Convolution_Operator from "$lib/components/ImageProcessing/ImageProcessingOperators/Convolution_Operator.svelte";
  import Contrast_Operator from "$lib/components/ImageProcessing/ImageProcessingOperators/Contrast_Operator.svelte";
  import HistogramEqualisation_Operator from "$lib/components/ImageProcessing/ImageProcessingOperators/HistogramEqualisation_Operator.svelte";
  import HistogramNormalisation_Operator from "$lib/components/ImageProcessing/ImageProcessingOperators/HistogramNormalisation_Operator.svelte";
  import Threshold_Operator from "$lib/components/ImageProcessing/ImageProcessingOperators/Threshold_Operator.svelte";
  import Canny_Operator from "$lib/components/ImageProcessing/ImageProcessingOperators/Canny_Operator.svelte";
  import Hough_Operator from "$lib/components/ImageProcessing/ImageProcessingOperators/Hough_Operator.svelte";
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
    {
      type: "histogram_normalisation",
      label: "Histogram Normalisation",
      component: HistogramNormalisation_Operator,
    },
    {
      type: "histogram_equalisation",
      label: "Histogram Equalisation",
      component: HistogramEqualisation_Operator,
    },
    { type: "threshold", label: "Threshold", component: Threshold_Operator },
    { type: "canny", label: "Canny", component: Canny_Operator },
    { type: "hough", label: "Hough Transform", component: Hough_Operator },
    { type: "morphology", label: "Morphology", component: Morphology_Operator },
    {
      type: "transformation",
      label: "Transformation",
      component: Transformation_Operator,
    },
  ];

  let originalImage: PixelBuffer | null = $state(null);
  let pipeline: PipelineStep[] = $state([]);
  let dragId = $state<string | null>(null);
  let dragOffsetY = $state(0);
  let dragActive = $state(false);
  let dragSettling = $state(false);
  let showAddOperatorPopup = $state(false);
  let pendingInsertIndex: number | null = $state(null);
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
    const seen: number[] = [];
    return bins.filter((b) => {
      if (seen.includes(b.bin)) return false;
      seen.push(b.bin);
      return true;
    });
  }

  /** Matches GradientViewer media-box border + padding so hist tops align with the image. */
  const IMAGE_INSET = 11;
  const ORIGINAL_PREVIEW_ID = "__original__";
  /** Picture width floor used by GradientViewer. */
  const MIN_IMAGE_WIDTH = 160;
  /** Keep the histogram readable while the image claims the rest of the row. */
  const MIN_HIST_WIDTH = 200;

  /**
   * Shared picture width (px). Null keeps each image on its automatic size.
   * A sideways drag sets this; height follows the image aspect ratio.
   */
  let previewImageWidth = $state<number | null>(null);
  let imageResizing = $state(false);
  let imageResizeCleanup: (() => void) | null = null;

  function resizeLimits(flow: HTMLElement) {
    const frame = flow.querySelector<HTMLElement>(".image-frame");
    const imageNode = flow.querySelector<HTMLElement>(".image-node");
    const operator = flow.querySelector<HTMLElement>(".op-node");
    if (!frame || !imageNode || !operator) return null;

    const frameWidth = frame.getBoundingClientRect().width;
    const chrome = imageNode.getBoundingClientRect().width - frameWidth;
    const gap = Number.parseFloat(getComputedStyle(flow).columnGap) || 0;
    const available =
      flow.clientWidth -
      operator.getBoundingClientRect().width -
      gap * 2 -
      chrome -
      MIN_HIST_WIDTH;

    return {
      frameWidth,
      maxWidth: Math.max(MIN_IMAGE_WIDTH, available),
    };
  }

  function clampImageWidth(width: number, maxWidth: number) {
    return Math.round(Math.max(MIN_IMAGE_WIDTH, Math.min(maxWidth, width)));
  }

  function startImageResize(event: PointerEvent) {
    if (event.button !== 0 || imageResizing) return;
    const handle = event.currentTarget as HTMLElement;
    const flow = handle.closest<HTMLElement>(".flow");
    if (!flow) return;
    const limits = resizeLimits(flow);
    if (!limits) return;

    event.preventDefault();
    event.stopPropagation();

    const pointerId = event.pointerId;
    const startX = event.clientX;
    const { frameWidth, maxWidth } = limits;

    const onMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      if (moveEvent.cancelable) moveEvent.preventDefault();
      previewImageWidth = clampImageWidth(
        frameWidth + (moveEvent.clientX - startX),
        maxWidth,
      );
    };

    const detach = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      imageResizing = false;
      document.body.classList.remove("is-image-resize");
      if (imageResizeCleanup === detach) imageResizeCleanup = null;
    };

    const onUp = (upEvent: PointerEvent) => {
      if (upEvent.pointerId !== pointerId) return;
      detach();
    };

    imageResizeCleanup?.();
    imageResizing = true;
    document.body.classList.add("is-image-resize");
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    imageResizeCleanup = detach;
  }

  function onImageResizeKeydown(event: KeyboardEvent) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    const handle = event.currentTarget as HTMLElement;
    const flow = handle.closest<HTMLElement>(".flow");
    if (!flow) return;
    const limits = resizeLimits(flow);
    if (!limits) return;
    event.preventDefault();
    const delta = event.key === "ArrowRight" ? 24 : -24;
    previewImageWidth = clampImageWidth(limits.frameWidth + delta, limits.maxWidth);
  }

  function openAddOperatorPopup(insertIndex: number | null = null) {
    pendingInsertIndex = insertIndex;
    showAddOperatorPopup = true;
  }

  function closeAddOperatorPopup() {
    showAddOperatorPopup = false;
    pendingInsertIndex = null;
  }

  function addStep(type: string) {
    const opDef = operatorRegistry.find((op) => op.type === type);

    const newStep: PipelineStep = {
      id: crypto.randomUUID(),
      type: type,
      label: opDef ? opDef.label : "Unknown Step",
      output: null,
      collapsed: false,
    };

    if (pendingInsertIndex === null) {
      pipeline = [...pipeline, newStep];
    } else {
      const newPipeline = [...pipeline];
      newPipeline.splice(pendingInsertIndex, 0, newStep);
      pipeline = newPipeline;
    }

    closeAddOperatorPopup();
  }

  function removeStep(index: number) {
    const removed = pipeline[index];
    pipeline = pipeline.filter((_, i) => i !== index);
    if (removed) {
      const { [removed.id]: _, ...rest } = stepImageHeights;
      stepImageHeights = rest;
    }
  }

  let grabOffsetY = 0;
  let lastPointerY = 0;
  let scrollLoop = 0;
  let settleTimer = 0;
  let settleRaf = 0;
  let detachDragListeners: (() => void) | null = null;
  let removeClickSuppressor: (() => void) | null = null;

  function layoutBox(el: HTMLElement) {
    const rect = el.getBoundingClientRect();
    const transform = getComputedStyle(el).transform;
    const translateY =
      !transform || transform === "none" ? 0 : new DOMMatrix(transform).m42;
    const top = rect.top - translateY;
    return { top, height: rect.height, bottom: top + rect.height };
  }

  function reorderStep(from: number, to: number) {
    if (from === to || from < 0 || to < 0 || to >= pipeline.length) return;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const next = pipeline.slice();
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    pipeline = next;
    void tick().then(() => {
      window.scrollTo({ left: scrollX, top: scrollY });
    });
  }

  function onReorderKeydown(event: KeyboardEvent, index: number) {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      reorderStep(index, index - 1);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      reorderStep(index, index + 1);
    }
  }

  function stepRow(id: string): HTMLElement | null {
    return document.querySelector<HTMLElement>(`[data-step-id="${id}"]`);
  }

  function stopScrollLoop() {
    if (scrollLoop) cancelAnimationFrame(scrollLoop);
    scrollLoop = 0;
  }

  function clearSettle() {
    if (settleTimer) window.clearTimeout(settleTimer);
    if (settleRaf) cancelAnimationFrame(settleRaf);
    settleTimer = 0;
    settleRaf = 0;
  }

  function applyDrag(clientY: number) {
    if (!dragId || !dragActive) return;
    const from = pipeline.findIndex((step) => step.id === dragId);
    if (from < 0) return;

    const boxes = pipeline.map((step) => {
      const el = stepRow(step.id);
      return el ? layoutBox(el) : null;
    });
    const fromBox = boxes[from];
    if (!fromBox) return;

    let target = from;
    for (let i = 0; i < boxes.length; i++) {
      const box = boxes[i];
      if (!box || i === from) continue;
      const mid = box.top + box.height / 2;
      if (i < from && clientY < mid) {
        target = i;
        break;
      }
      if (i > from && clientY > mid) target = i;
    }

    let top = fromBox.top;
    if (target !== from) {
      const targetBox = boxes[target];
      if (targetBox) {
        top =
          target < from ? targetBox.top : targetBox.bottom - fromBox.height;
      }
      const next = pipeline.slice();
      const [item] = next.splice(from, 1);
      next.splice(target, 0, item);
      pipeline = next;
    }

    dragOffsetY = clientY - grabOffsetY - top;
  }

  function ensureScrollLoop() {
    if (scrollLoop) return;
    const loop = () => {
      if (!dragActive) {
        scrollLoop = 0;
        return;
      }
      const edge = 72;
      const maxSpeed = 18;
      let speed = 0;
      if (lastPointerY < edge) {
        speed = -Math.ceil(((edge - lastPointerY) / edge) * maxSpeed);
      } else if (lastPointerY > window.innerHeight - edge) {
        speed = Math.ceil(
          ((lastPointerY - (window.innerHeight - edge)) / edge) * maxSpeed,
        );
      }
      if (speed !== 0) {
        window.scrollBy(0, speed);
        applyDrag(lastPointerY);
      }
      scrollLoop = requestAnimationFrame(loop);
    };
    scrollLoop = requestAnimationFrame(loop);
  }

  function finishOperatorDrag() {
    stopScrollLoop();
    document.body.classList.remove("is-operator-drag");
    if (dragActive) applyDrag(lastPointerY);
    if (!dragActive) return;
    dragActive = false;
    dragSettling = true;
    settleRaf = requestAnimationFrame(() => {
      settleRaf = requestAnimationFrame(() => {
        settleRaf = 0;
        dragOffsetY = 0;
        settleTimer = window.setTimeout(() => {
          dragSettling = false;
          dragId = null;
          settleTimer = 0;
        }, 190);
      });
    });
  }

  function reorderHandle(node: HTMLElement, stepId: string) {
    let id = stepId;
    const onPointerDown = (event: PointerEvent) => {
      startOperatorDrag(event, id);
    };
    node.addEventListener("pointerdown", onPointerDown);
    return {
      update(nextId: string) {
        id = nextId;
      },
      destroy() {
        node.removeEventListener("pointerdown", onPointerDown);
      },
    };
  }

  function startOperatorDrag(event: PointerEvent, id: string) {
    if (event.button !== 0 || dragActive) return;
    const handle = event.currentTarget as HTMLElement;
    const row = handle.closest<HTMLElement>(".step-item");
    if (!row) return;

    if (dragSettling) {
      clearSettle();
      dragSettling = false;
      dragOffsetY = 0;
      dragId = null;
    }

    const pointerId = event.pointerId;
    const pointerOffset = event.clientY - row.getBoundingClientRect().top;
    const startX = event.clientX;
    const startY = event.clientY;
    let activated = false;
    let suppressClick = false;

    const onMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      if (!activated) {
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;
        if (dx * dx + dy * dy < 64) return;
        activated = true;
        suppressClick = true;
        grabOffsetY = pointerOffset;
        dragId = id;
        dragOffsetY =
          moveEvent.clientY - pointerOffset - row.getBoundingClientRect().top;
        dragActive = true;
        document.body.classList.add("is-operator-drag");
        ensureScrollLoop();
      }
      if (moveEvent.cancelable) moveEvent.preventDefault();
      lastPointerY = moveEvent.clientY;
      applyDrag(moveEvent.clientY);
    };

    const onClickCapture = (clickEvent: MouseEvent) => {
      if (!suppressClick) return;
      clickEvent.preventDefault();
      clickEvent.stopPropagation();
    };

    const detach = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      if (detachDragListeners === detach) detachDragListeners = null;
    };

    const onUp = (upEvent: PointerEvent) => {
      if (upEvent.pointerId !== pointerId) return;
      detach();
      if (upEvent.type === "pointercancel") {
        suppressClick = false;
        removeClickSuppressor?.();
      }
      if (activated) finishOperatorDrag();
    };

    detachDragListeners?.();
    removeClickSuppressor?.();
    window.addEventListener("click", onClickCapture, { capture: true, once: true });
    removeClickSuppressor = () => {
      window.removeEventListener("click", onClickCapture, true);
      removeClickSuppressor = null;
    };
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    detachDragListeners = detach;
  }

  $effect(() => {
    return () => {
      detachDragListeners?.();
      removeClickSuppressor?.();
      imageResizeCleanup?.();
      stopScrollLoop();
      clearSettle();
      document.body.classList.remove("is-operator-drag");
      document.body.classList.remove("is-image-resize");
    };
  });

  $effect(() => {
    const viewport = windowWidth;
    if (previewImageWidth == null || imageResizing) return;
    const frameId = requestAnimationFrame(() => {
      if (viewport !== windowWidth || previewImageWidth == null) return;
      const flow = document.querySelector<HTMLElement>(".page-layout .flow");
      if (!flow) return;
      const limits = resizeLimits(flow);
      if (!limits) return;
      const overflow = limits.frameWidth - limits.maxWidth;
      if (overflow > 2) {
        previewImageWidth = clampImageWidth(
          limits.frameWidth - overflow,
          limits.maxWidth,
        );
      }
    });
    return () => cancelAnimationFrame(frameId);
  });

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

{#snippet imageResizeHandle(height: number)}
  <button
    type="button"
    class="image-resize-handle"
    style:height={height > 0 ? `${height}px` : undefined}
    aria-label="Resize image"
    title="Drag sideways to resize the image"
    onpointerdown={startImageResize}
    onkeydown={onImageResizeKeydown}
  >
    <span class="resize-line" aria-hidden="true"></span>
    <span class="resize-grip" aria-hidden="true">
      <span></span>
      <span></span>
      <span></span>
    </span>
  </button>
{/snippet}

<div class="page-layout">
  <PixelBufferLoader bind:buffer={originalImage} hidden={!!expandedPreviewId} />

  <div class="chain">
    <div class="step-row">
      <div class="flow">
        <div class="node op-node">
          <div class="operator-shell">
            <div
              class="step-meta step-meta-side"
              style:height={originalImageHeight
                ? `${originalImageHeight}px`
                : null}
            >
              <div class="step-controls">
                <button class="icon-btn delete" disabled title="Delete step">
                  <span class="material-icons-round">delete</span>
                </button>
                <button
                  class="icon-btn expand"
                  onclick={() =>
                    openExpandedPreview(ORIGINAL_PREVIEW_ID, "combined")}
                  title="Expand preview"
                >
                  <span class="material-icons-round">open_in_full</span>
                </button>
              </div>
            </div>

            <div class="op-bar static">
              <span class="material-icons-round">image</span>
              <span class="op-title">Original Image</span>
            </div>
          </div>
        </div>

        <div class="node image-node" class:size-locked={previewImageWidth != null}>
          <GradientViewer
            buffer={originalImage}
            imageWidth={previewImageWidth ?? undefined}
            bind:imageHeight={originalImageHeight}
            bind:hoveredColumnIndex={origGradCol}
            bind:hoveredColumnValues={origGradValues}
            bind:hoveredImagePixel={origImagePixel}
            externalHighlightColumn={origHistBin}
            externalHighlightChannels={origHistChannels}
            onExpand={() => openExpandedPreview(ORIGINAL_PREVIEW_ID, "image")}
          />
          {#if originalImage}
            {@render imageResizeHandle(originalImageHeight)}
          {/if}
        </div>

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
      <div
        class="step-item"
        class:is-dragging={dragActive && dragId === step.id}
        class:is-settling={dragSettling && dragId === step.id}
        data-step-id={step.id}
        animate:flip={{ duration: dragId === step.id ? 0 : 280 }}
      >
        <div
          class="step-drag-surface"
          style:transform={dragId === step.id
            ? `translate3d(0, ${dragOffsetY}px, 0)`
            : undefined}
        >
        <div class="step-row">
          <div class="flow">
            <div class="node op-node">
              <div class="operator-shell">
                <div
                  class="step-meta step-meta-side drag-handle"
                  style:height={stepImageHeights[step.id]
                    ? `${stepImageHeights[step.id]}px`
                    : null}
                  title="Drag to reorder"
                  use:reorderHandle={step.id}
                >
                  <button
                    class="icon-btn insert"
                    type="button"
                    onclick={() => openAddOperatorPopup(i)}
                    title="Insert operation before"
                  >
                    <span class="insert-icon" aria-hidden="true">
                      <span class="material-icons-round">keyboard_arrow_up</span
                      >
                      <span class="material-icons-round">add</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    class="drag-grip-btn"
                    aria-label={`Drag to reorder ${step.label}`}
                    aria-grabbed={dragActive && dragId === step.id}
                    title="Drag to reorder"
                    onkeydown={(event) => onReorderKeydown(event, i)}
                  >
                    <span class="material-icons-round" aria-hidden="true"
                      >drag_indicator</span
                    >
                  </button>
                  <div class="rail-pair">
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
                  <span class="drag-grip" aria-hidden="true">
                    <span class="material-icons-round">drag_indicator</span>
                  </span>
                  <button
                    class="icon-btn insert"
                    type="button"
                    onclick={() => openAddOperatorPopup(i + 1)}
                    title="Insert operation after"
                  >
                    <span class="insert-icon" aria-hidden="true">
                      <span class="material-icons-round">add</span>
                      <span class="material-icons-round"
                        >keyboard_arrow_down</span
                      >
                    </span>
                  </button>
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

            <div class="node image-node" class:size-locked={previewImageWidth != null}>
              <GradientViewer
                buffer={step.output}
                imageWidth={previewImageWidth ?? undefined}
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
              {#if step.output}
                {@render imageResizeHandle(stepImageHeights[step.id] ?? 0)}
              {/if}
            </div>

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
      </div>
    {/each}

    <div class="add-section">
      <div class="add-card">
        <button
          class="add-btn"
          type="button"
          onclick={() => openAddOperatorPopup()}
        >
          + Add Operator
        </button>
      </div>
    </div>
  </div>

  {#if showAddOperatorPopup}
    <div
      class="add-op-backdrop"
      onclick={closeAddOperatorPopup}
      role="presentation"
    ></div>

    <div
      class="add-op-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-op-title"
    >
      <button
        class="add-op-close"
        type="button"
        onclick={closeAddOperatorPopup}
        aria-label="Close"
      >
        <span class="material-icons-round">close</span>
      </button>

      <h3 id="add-op-title" class="add-op-title">Add Operator</h3>
      <p class="add-op-subtitle">Choose an operation to add to the pipeline</p>

      <div class="add-op-grid">
        {#each operatorRegistry as op (op.type)}
          <button
            class="add-op-choice"
            type="button"
            onclick={() => addStep(op.type)}
          >
            {op.label}
          </button>
        {/each}
      </div>
    </div>
  {/if}

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

  .chain {
    --step-meta-width: 84px;
    --operator-col-width: 340px;
    --operator-sidebar-width: 44px;
    --operator-max-width: calc(
      var(--operator-col-width) - var(--operator-sidebar-width) - 12px
    );
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
    border-radius: 16px;
  }

  .step-item.is-dragging,
  .step-item.is-settling {
    position: relative;
    z-index: 20;
  }

  .step-item.is-dragging {
    background: rgba(59, 130, 246, 0.06);
    box-shadow: inset 0 0 0 1px rgba(96, 165, 250, 0.28);
  }

  .step-item.is-dragging .step-drag-surface {
    filter: drop-shadow(0 18px 28px rgba(0, 0, 0, 0.42));
    pointer-events: none;
  }

  .step-item.is-settling .step-drag-surface {
    transition: transform 180ms ease;
  }

  .drag-handle {
    cursor: grab;
    touch-action: none;
    user-select: none;
    box-sizing: border-box;
    align-self: stretch;
    height: auto;
    min-height: 100%;
  }

  .drag-handle:hover {
    border-color: rgba(96, 165, 250, 0.4);
  }

  .drag-handle .icon-btn {
    cursor: pointer;
    touch-action: manipulation;
  }

  .drag-grip,
  .drag-grip-btn {
    width: 28px;
    height: 22px;
    margin: 0;
    padding: 0;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: #7d8ba0;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: grab;
    flex-shrink: 0;
  }

  .drag-handle:hover .drag-grip,
  .drag-handle:hover .drag-grip-btn,
  .drag-grip-btn:hover {
    color: #dbeafe;
  }

  .drag-grip-btn:focus-visible {
    outline: 2px solid rgba(96, 165, 250, 0.85);
    outline-offset: 1px;
  }

  .drag-grip .material-icons-round,
  .drag-grip-btn .material-icons-round {
    font-size: 18px;
    line-height: 1;
  }

  :global(body.is-operator-drag),
  :global(body.is-operator-drag *) {
    cursor: grabbing !important;
    user-select: none !important;
  }

  :global(body.is-image-resize),
  :global(body.is-image-resize *) {
    cursor: ew-resize !important;
    user-select: none !important;
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
    padding: 10px 0;
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

  .step-meta-side.drag-handle {
    justify-content: space-between;
    gap: 8px;
  }

  .rail-pair {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    flex-shrink: 0;
  }

  .step-controls {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 2px;
    flex: 1 1 auto;
    align-self: stretch;
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

  .icon-btn.delete {
    color: #ef4444;
    border-color: rgba(239, 68, 68, 0.45);
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

  .icon-btn.insert:hover {
    background: linear-gradient(
      180deg,
      rgba(168, 85, 247, 0.28),
      rgba(126, 34, 206, 0.2)
    );
    border-color: rgba(192, 132, 252, 0.45);
  }

  .insert-icon {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    line-height: 1;
    gap: 0;
  }

  .insert-icon .material-icons-round {
    font-size: 12px;
    line-height: 0.85;
  }

  .flow {
    display: grid;
    grid-template-columns:
      var(--operator-col-width)
      max-content
      minmax(200px, 1fr);
    align-items: flex-start;
    gap: 12px;
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
    z-index: 2;
  }

  .image-node.size-locked {
    max-width: none;
  }

  .image-resize-handle {
    position: absolute;
    z-index: 5;
    top: 11px;
    right: -15px;
    width: 18px;
    min-height: 80px;
    margin: 0;
    padding: 0;
    border: none;
    background: transparent;
    cursor: ew-resize;
    touch-action: none;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .image-resize-handle:focus-visible {
    outline: none;
  }

  .resize-line {
    position: absolute;
    top: 8px;
    bottom: 8px;
    left: 50%;
    width: 2px;
    transform: translateX(-50%);
    border-radius: 999px;
    background: rgba(148, 163, 184, 0.35);
    pointer-events: none;
  }

  .resize-grip {
    position: relative;
    z-index: 1;
    width: 14px;
    height: 28px;
    border-radius: 8px;
    background: linear-gradient(
      180deg,
      rgba(38, 48, 66, 0.98),
      rgba(20, 27, 39, 0.98)
    );
    border: 1px solid rgba(255, 255, 255, 0.16);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.05),
      0 6px 14px rgba(0, 0, 0, 0.35);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    pointer-events: none;
  }

  .resize-grip span {
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: #94a3b8;
  }

  .image-resize-handle:hover .resize-line,
  .image-resize-handle:focus-visible .resize-line,
  :global(body.is-image-resize) .resize-line {
    background: rgba(96, 165, 250, 0.85);
  }

  .image-resize-handle:hover .resize-grip,
  .image-resize-handle:focus-visible .resize-grip,
  :global(body.is-image-resize) .resize-grip {
    border-color: rgba(96, 165, 250, 0.85);
    background: linear-gradient(
      180deg,
      rgba(59, 130, 246, 0.4),
      rgba(30, 58, 138, 0.55)
    );
  }

  .image-resize-handle:hover .resize-grip span,
  .image-resize-handle:focus-visible .resize-grip span,
  :global(body.is-image-resize) .resize-grip span {
    background: #eff6ff;
  }

  .hist-node {
    min-width: 200px;
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
    display: flex;
    justify-content: flex-start;
    padding-top: 8px;
    padding-left: calc(var(--operator-col-width) + 12px);
  }

  .add-card {
    background: rgba(17, 17, 17, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 10px 16px;
    border-radius: 999px;
    display: flex;
    align-items: center;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
  }

  .add-btn {
    background: #3b82f6;
    color: white;
    border: none;
    padding: 8px 20px;
    border-radius: 999px;
    cursor: pointer;
    font-weight: bold;
    font-family: inherit;
    font-size: 0.9rem;
  }
  .add-btn:hover {
    background: #2563eb;
  }

  .add-op-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(4, 8, 16, 0.7);
    backdrop-filter: blur(3px);
    z-index: 50;
  }

  .add-op-modal {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: min(520px, calc(100vw - 32px));
    padding: 24px 28px 28px;
    border-radius: 16px;
    background: rgba(16, 22, 32, 0.98);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 30px 80px rgba(0, 0, 0, 0.45);
    z-index: 51;
    box-sizing: border-box;
  }

  .add-op-close {
    position: absolute;
    top: 12px;
    right: 12px;
    width: 32px;
    height: 32px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 999px;
    background: rgba(30, 41, 59, 0.95);
    color: #e2e8f0;
    display: grid;
    place-items: center;
    cursor: pointer;
    padding: 0;
  }

  .add-op-close:hover {
    background: rgba(59, 130, 246, 0.24);
    border-color: rgba(96, 165, 250, 0.45);
  }

  .add-op-close .material-icons-round {
    font-size: 18px;
  }

  .add-op-title {
    margin: 0 0 6px;
    font-size: 1.15rem;
    font-weight: 600;
    color: #e0e0e0;
  }

  .add-op-subtitle {
    margin: 0 0 20px;
    font-size: 0.85rem;
    color: #888;
  }

  .add-op-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  .add-op-choice {
    padding: 12px 16px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    background: linear-gradient(
      180deg,
      rgba(38, 48, 66, 0.96),
      rgba(24, 31, 44, 0.96)
    );
    color: #e0e0e0;
    font-family: inherit;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    text-align: left;
    transition:
      background 0.15s,
      border-color 0.15s,
      transform 0.1s;
  }

  .add-op-choice:hover {
    background: rgba(59, 130, 246, 0.18);
    border-color: rgba(96, 165, 250, 0.45);
    transform: translateY(-1px);
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
