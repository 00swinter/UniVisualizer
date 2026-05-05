
<script>
	let {
		title = '',
		items = $bindable([]),
		xDomain = [-10, 10],
		yDomain = [-5, 5],
		width = 600,
		height = 300,
		padding = [25, 25, 25, 25], // top, right, bottom, left
		domainLabelPadding = [5, 5, 5, 5], //top, right, bottom, left
		flipY = false,
		showGrid = true,
		showLabel = true,
		showDomainLabel = true,
		xGridStep = 1,
		yGridStep = 1,
		xLabelStep = 2,
		yLabelStep = 2,
		backgroundImage = null,
		backgroundOpacity = 0.2
	} = $props();

	let draggingIndex = $state(null);
	let svgElement;

	// --- MATH HELPERS ---
	function map(val, inMin, inMax, outMin, outMax) {
		return ((val - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
	}

	function mapInverse(pxVal, inMin, inMax, outMin, outMax) {
		return ((pxVal - outMin) * (inMax - inMin)) / (outMax - outMin) + inMin;
	}

	// Generates ticks based on a fixed step size
	function getTicks(min, max, step) {
		if (step <= 0) return [];
		const start = Math.ceil(min / step) * step;
		let ticks = [];
		for (let val = start; val <= max + step / 10000; val += step) {
			ticks.push(parseFloat(val.toFixed(10)));
		}
		return ticks;
	}

	// --- DERIVED ---

	let yRangeStart = $derived(flipY ? 0 : height);
	let yRangeEnd = $derived(flipY ? height : 0);

	// 1. Grid Ticks (for lines)
	let xGridTicks = $derived(getTicks(xDomain[0], xDomain[1], xGridStep));
	let yGridTicks = $derived(getTicks(yDomain[0], yDomain[1], yGridStep));

	// 2. Label Ticks (for text)
	let xLabelTicks = $derived(getTicks(xDomain[0], xDomain[1], xLabelStep));
	let yLabelTicks = $derived(getTicks(yDomain[0], yDomain[1], yLabelStep));

	let xAxisPos = $derived(map(0, yDomain[0], yDomain[1], yRangeStart, yRangeEnd));
	let yAxisPos = $derived(map(0, xDomain[0], xDomain[1], 0, width));

	// Determine values for the edges based on flipY
	let topVal = $derived(flipY ? yDomain[0] : yDomain[1]);
	let bottomVal = $derived(flipY ? yDomain[1] : yDomain[0]);
	let leftVal = $derived(xDomain[0]);
	let rightVal = $derived(xDomain[1]);

	let renderItems = $derived(
		items
			.map((item, index) => {
				if (!item) return null;
				if (item.disabled) return null;
				const color = item.color || 'white';
				const processed = { ...item, originalIndex: index, color };

				if (item.type === 'function') {
					let pathString = '';
					let areaPathString = '';
					const zeroY = map(0, yDomain[0], yDomain[1], yRangeStart, yRangeEnd);

					let lastPy = null;
					let lastPx = null;
					let isPathActive = false;

					for (let px = 0; px <= width; px += 2) {
						const x = map(px, 0, width, xDomain[0], xDomain[1]);
						const y = item.fn(x);
						const py = map(y, yDomain[0], yDomain[1], yRangeStart, yRangeEnd);

						if (isFinite(py)) {
							let isAsymptote = false;
							if (lastPy !== null) {
								const dy = Math.abs(py - lastPy);
								if (dy > height * 2) isAsymptote = true;
							}

							if (pathString === '' || isAsymptote) {
								if (item.fill && isPathActive && lastPx !== null) {
									areaPathString += ` L ${lastPx} ${zeroY} Z`;
								}
								pathString += ` M ${px} ${py}`;
								if (item.fill) {
									areaPathString += ` M ${px} ${zeroY} L ${px} ${py}`;
								}
								isPathActive = true;
							} else {
								pathString += ` L ${px} ${py}`;
								if (item.fill) {
									areaPathString += ` L ${px} ${py}`;
								}
							}
							lastPy = py;
							lastPx = px;
						}
					}

					if (item.fill && isPathActive && lastPx !== null) {
						areaPathString += ` L ${lastPx} ${zeroY} Z`;
					}

					processed.d = pathString;
					processed.areaD = areaPathString;
				} else if (item.type === 'parametric') {
					let pathString = '';
					const [tMin, tMax] = item.tRange || [0, 2 * Math.PI];
					const steps = item.steps;

					for (let i = 0; i <= item.steps; i++) {
						const t = map(i, 0, steps, tMin, tMax);
						const rawX = item.xFn(t);
						const rawY = item.yFn(t);
						const px = map(rawX, xDomain[0], xDomain[1], 0, width);
						const py = map(rawY, yDomain[0], yDomain[1], yRangeStart, yRangeEnd);
						pathString += (i === 0 ? 'M' : 'L') + ` ${px} ${py}`;
					}
					processed.d = pathString;
				} else if (item.type === 'point') {
					processed.px = map(item.x, xDomain[0], xDomain[1], 0, width);
					processed.py = map(item.y, yDomain[0], yDomain[1], yRangeStart, yRangeEnd);
				} else if (item.type === 'angle') {
					const cx = item.center.x;
					const cy = item.center.y;
					let val = item.currentAngleValue;
					if (item.flip) val = -val;

					const startAngle = item.zeroAngle;
					const endAngle = startAngle + val;

					const pxC = map(cx, xDomain[0], xDomain[1], 0, width);
					const pyC = map(cy, yDomain[0], yDomain[1], yRangeStart, yRangeEnd);
					const rMag = item.radius;
					const rx = Math.abs(map(rMag, 0, xDomain[1] - xDomain[0], 0, width));
					const ry = Math.abs(map(rMag, 0, yDomain[1] - yDomain[0], 0, height));

					const startX = cx + rMag * Math.cos(startAngle);
					const startY = cy + rMag * Math.sin(startAngle);
					const endX = cx + rMag * Math.cos(endAngle);
					const endY = cy + rMag * Math.sin(endAngle);

					const pxStart = map(startX, xDomain[0], xDomain[1], 0, width);
					const pyStart = map(startY, yDomain[0], yDomain[1], yRangeStart, yRangeEnd);
					const pxEnd = map(endX, xDomain[0], xDomain[1], 0, width);
					const pyEnd = map(endY, yDomain[0], yDomain[1], yRangeStart, yRangeEnd);

					const largeArcFlag = Math.abs(val) % (2 * Math.PI) > Math.PI ? 1 : 0;
					let sweepFlag = val > 0 ? 0 : 1;
					if (yRangeStart < yRangeEnd) sweepFlag = val > 0 ? 1 : 0;

					processed.d = [
						`M ${pxC} ${pyC}`,
						`L ${pxStart} ${pyStart}`,
						`A ${rx} ${ry} 0 ${largeArcFlag} ${sweepFlag} ${pxEnd} ${pyEnd}`,
						`Z`
					].join(' ');

					processed.fillColor = item.fillColor;

					const fullCircleCount = Math.floor(Math.abs(val) / (2 * Math.PI));
					if (fullCircleCount > 0) {
						processed.fullCircleD = [
							`M ${pxC + rx} ${pyC}`,
							`A ${rx} ${ry} 0 1 0 ${pxC - rx} ${pyC}`,
							`A ${rx} ${ry} 0 1 0 ${pxC + rx} ${pyC}`,
							`Z`
						].join(' ');
					}
					processed.fullCircleCount = fullCircleCount;

					if (item.showAnglelabel) {
						const rawDisp = item.angleInDegree
							? item.currentAngleValue * (180 / Math.PI)
							: item.currentAngleValue;
						const suffix = item.angleInDegree ? '°' : ' π';
						processed.labelText = rawDisp.toFixed(1) + suffix;

						const midAngle = startAngle + val / 2;
						const labelDist = rMag * 0.6;
						const lx = cx + labelDist * Math.cos(midAngle);
						const ly = cy + labelDist * Math.sin(midAngle);
						processed.labelPx = map(lx, xDomain[0], xDomain[1], 0, width);
						processed.labelPy = map(ly, yDomain[0], yDomain[1], yRangeStart, yRangeEnd);
					}
				} else if (item.type === 'line') {
					processed.px1 = map(item.start.x, xDomain[0], xDomain[1], 0, width);
					processed.py1 = map(item.start.y, yDomain[0], yDomain[1], yRangeStart, yRangeEnd);
					processed.px2 = map(item.end.x, xDomain[0], xDomain[1], 0, width);
					processed.py2 = map(item.end.y, yDomain[0], yDomain[1], yRangeStart, yRangeEnd);
				} else if (item.type === 'rect') {
					const x1 = item.topLeft.x;
					const y1 = item.topLeft.y;
					const x2 = x1 + item.width;
					const y2 = y1 - item.height;
					const px1 = map(x1, xDomain[0], xDomain[1], 0, width);
					const py1 = map(y1, yDomain[0], yDomain[1], yRangeStart, yRangeEnd);
					const px2 = map(x2, xDomain[0], xDomain[1], 0, width);
					const py2 = map(y2, yDomain[0], yDomain[1], yRangeStart, yRangeEnd);
					processed.px = Math.min(px1, px2);
					processed.py = Math.min(py1, py2);
					processed.pWidth = Math.abs(px1 - px2);
					processed.pHeight = Math.abs(py1 - py2);
				}
				return processed;
			})
			.filter((item) => !!item)
			.sort((a, b) => {
				if (a.originalIndex === draggingIndex) return 1;
				if (b.originalIndex === draggingIndex) return -1;
				if (a.type === 'point' && b.type !== 'point') return 1;
				if (a.type !== 'point' && b.type === 'point') return -1;
				const aDrag = a.isDraggable !== false;
				const bDrag = b.isDraggable !== false;
				if (aDrag && !bDrag) return 1;
				if (!aDrag && bDrag) return -1;
				return a.originalIndex - b.originalIndex;
			})
	);

	// --- DRAG HANDLERS ---
	function getEventPos(event) {
		if (event.touches && event.touches.length > 0) {
			return { x: event.touches[0].clientX, y: event.touches[0].clientY };
		}
		return { x: event.clientX, y: event.clientY };
	}

	function startDrag(index, event) {
		const item = items[index];
		if (!item.isDraggable) return;
		event.preventDefault();
		draggingIndex = index;
	}

	function onWindowMove(event) {
		if (draggingIndex === null || !svgElement) return;
		if (event.type === 'touchmove') {
			/* passive */
		}

		const { x: clientX, y: clientY } = getEventPos(event);
		const svgRect = svgElement.getBoundingClientRect();
		let mouseX = clientX - svgRect.left;
		let mouseY = clientY - svgRect.top;

		mouseX = Math.max(0, Math.min(width, mouseX));
		mouseY = Math.max(0, Math.min(height, mouseY));

		let proposedX = mapInverse(mouseX, xDomain[0], xDomain[1], 0, width);
		let proposedY = mapInverse(mouseY, yDomain[0], yDomain[1], yRangeStart, yRangeEnd);

		const activeItem = items[draggingIndex];
		if (activeItem.constraint) {
			const result = activeItem.constraint(proposedX, proposedY);
			items[draggingIndex].x = result.x !== undefined ? result.x : proposedX;
			items[draggingIndex].y = result.y !== undefined ? result.y : proposedY;
		} else {
			items[draggingIndex].x = proposedX;
			items[draggingIndex].y = proposedY;
		}
	}

	function stopDrag() {
		draggingIndex = null;
	}
</script>

<svelte:window
	onmouseup={stopDrag}
	onmousemove={onWindowMove}
	ontouchend={stopDrag}
	ontouchcancel={stopDrag}
	ontouchmove={onWindowMove}
/>

<div class="plot-container" style="width: {width + padding[1] + padding[3]}px; height: {height + padding[0] + padding[2]}px; padding: {padding[0]}px {padding[1]}px {padding[2]}px {padding[3]}px;">
	{#if title}
		<div class="plot-title">{title}</div>
	{/if}

	<div class="axis-labels">
		<div class="axis-label y-axis" style="left: {padding[3] + yAxisPos}px; top: {domainLabelPadding[0]}px;">
			{topVal}
		</div>

		<div class="axis-label y-axis" style="left: {padding[3] + yAxisPos}px; bottom: {domainLabelPadding[2]}px;">
			{bottomVal}
		</div>

		<div class="axis-label x-axis" style="top: {padding[0] + xAxisPos}px; left: {domainLabelPadding[3]}px;">
			{leftVal}
		</div>

		<div class="axis-label x-axis" style="top: {padding[0] + xAxisPos}px; right: {domainLabelPadding[1]}px;">
			{rightVal}
		</div>
	</div>

	<svg bind:this={svgElement} {width} {height} viewBox="0 0 {width} {height}" role="application">
		<defs>
			<marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
				<polygon points="0 0, 10 3.5, 0 7" fill="context-stroke" />
			</marker>
		</defs>

		{#if backgroundImage}
			<image
				href={backgroundImage}
				x="0"
				y="0"
				{width}
				{height}
				preserveAspectRatio="none"
				opacity={backgroundOpacity}
				style="pointer-events: none;"
			/>
		{/if}

		{#if showGrid}
			<g class="grid">
				{#each xGridTicks as tick}
					{@const px = map(tick, xDomain[0], xDomain[1], 0, width)}
					<line x1={px} y1="0" x2={px} y2={height} />
				{/each}
				{#each yGridTicks as tick}
					{@const py = map(tick, yDomain[0], yDomain[1], yRangeStart, yRangeEnd)}
					<line x1="0" y1={py} x2={width} y2={py} />
				{/each}
			</g>
		{/if}

		<line x1="0" y1={xAxisPos} x2={width} y2={xAxisPos} class="axis main-axis" />
		<line x1={yAxisPos} y1="0" x2={yAxisPos} y2={height} class="axis main-axis" />

		{#each renderItems as item}
			{#if !item.disabled}
				{#if item.type === 'function'}
					{#if item.fill}
						<path
							d={item.areaD}
							fill={item.fillColor}
							stroke="none"
							style="pointer-events: none;"
						/>
					{/if}
					<path
						d={item.d}
						stroke={item.color}
						stroke-width={item.width}
						fill="none"
						stroke-linecap="round"
						stroke-linejoin="round"
						style="filter: drop-shadow(0 0 {item.glowRadius}px {item.color});"
					/>
				{:else if item.type === 'parametric' || item.type === 'circle'}
					<path
						d={item.d}
						stroke={item.color}
						stroke-width={item.width || 2}
						fill="none"
						stroke-linecap="round"
						stroke-linejoin="round"
						style="filter: drop-shadow(0 0 4px {item.color}); pointer-events: none;"
					/>
					{#if item.fill}
						<path
							d={item.areaD}
							stroke={item.fillColor}
							stroke-width={item.width || 2}
							fill="true"
							stroke-linecap="round"
							stroke-linejoin="round"
							style="filter: drop-shadow(0 0 4px {item.color}); pointer-events: none;"
						/>
					{/if}
				{:else if item.type === 'point'}
					<g
						role={item.isDraggable ? 'slider' : 'graphics-symbol'}
						aria-label={item.label || 'Point'}
						style="
                            pointer-events: {item.isDraggable ? 'all' : 'none'}; 
                            touch-action: none;
                            cursor: {item.isDraggable
							? draggingIndex === item.originalIndex
								? 'grabbing'
								: 'grab'
							: 'default'};
                            transition: opacity 0.2s;
                        "
						onmousedown={(e) => startDrag(item.originalIndex, e)}
						ontouchstart={(e) => startDrag(item.originalIndex, e)}
						onpointerenter={() => item.onHover && item.onHover(true)}
						onpointerleave={() => item.onHover && item.onHover(false)}
					>
						{#if item.isDraggable}
							<circle cx={item.px} cy={item.py} r={20} fill="transparent" />
							<circle
								class="hover-ring"
								cx={item.px}
								cy={item.py}
								r={15}
								fill={item.color}
								opacity="0"
							/>
						{/if}
						<circle
							cx={item.px}
							cy={item.py}
							r={6}
							fill={item.isDraggable ? 'black' : item.color}
							stroke={item.color}
							stroke-width={3}
							opacity={1}
							style="pointer-events: none;"
						/>
						{#if item.label}
							<text
								x={item.px + 12}
								y={item.py - 12}
								fill={item.color}
								font-size="20"
								font-weight="bold"
								style="pointer-events: none; opacity: {item.isDraggable ? 1 : 0.6}"
							>
								{item.label}
							</text>
						{/if}
					</g>
				{:else if item.type === 'angle'}
					<path
						d={item.d}
						fill={item.fillColor}
						stroke={item.color}
						stroke-width={item.width}
						stroke-linejoin="round"
						style="pointer-events: none;"
					/>
					{#each Array(item.fullCircleCount) as _, i}
						<path
							d={item.fullCircleD}
							fill={item.fillColor}
							stroke={item.color}
							stroke-width={item.width}
							stroke-linejoin="round"
							style="pointer-events: none;"
						/>
					{/each}
					{#if item.labelText}
						<text
							x={item.labelPx}
							y={item.labelPy}
							fill="white"
							font-size="15"
							font-weight="bolder"
							text-anchor="middle"
							dominant-baseline="middle"
							style="pointer-events: none; text-shadow: 0px 1px 3px rgba(0,0,0,0.8);"
						>
							{item.labelText}
						</text>
					{/if}
				{:else if item.type === 'line'}
					<line
						x1={item.px1}
						y1={item.py1}
						x2={item.px2}
						y2={item.py2}
						stroke={item.color}
						stroke-width={item.width}
						stroke-linecap="round"
						stroke-dasharray={item.style === 'dashed'
							? '15, 10'
							: item.style === 'dotted'
								? '3, 5'
								: 'none'}
						marker-end={item.style === 'vector' ? 'url(#arrowhead)' : 'none'}
						style="pointer-events: none;"
					/>
				{:else if item.type === 'rect'}
					<g style="pointer-events: none;">
						<rect
							x={item.px}
							y={item.py}
							width={item.pWidth}
							height={item.pHeight}
							fill={item.color}
							stroke={item.borderColor}
							stroke-width={item.borderWidth}
						/>
						{#if item.label}
							<text
								x={item.px + item.pWidth / 2}
								y={item.py + item.pHeight / 2}
								fill={item.borderColor}
								font-size="16"
								font-weight="bold"
								text-anchor="middle"
								dominant-baseline="middle"
							>
								{item.label}
							</text>
						{/if}
					</g>
				{/if}
			{/if}
		{/each}

		{#if showLabel}
			<g class="labels">
				{#each xLabelTicks as tick}
					{@const px = map(tick, xDomain[0], xDomain[1], 0, width)}
					{@const rawY = xAxisPos + 15}
					{@const labelY = Math.max(20, Math.min(height - 10, rawY))}
					{#if px > 10 && px < width - 10}
						<text
							x={px}
							y={labelY}
							text-anchor="middle"
							dominant-baseline={labelY > height - 30 ? 'auto' : 'hanging'}>{tick}</text
						>
					{/if}
				{/each}
				{#each yLabelTicks as tick}
					{@const py = map(tick, yDomain[0], yDomain[1], yRangeStart, yRangeEnd)}
					{@const rawX = yAxisPos - 10}
					{@const labelX = Math.max(10, Math.min(width - 10, rawX))}
					{#if py > 20 && py < height - 20}
						<text x={labelX} y={py + 4} text-anchor={labelX < 20 ? 'start' : 'end'}>{tick}</text>
					{/if}
				{/each}
			</g>
		{/if}
	</svg>
</div>

<style>
	.plot-container {
		background: #1a1a1a;
		border-radius: 10px;
		overflow: hidden;
		font-family: 'Courier New', monospace;
		user-select: none;
		position: relative;
		padding: 15px; /* Important for alignment */
		border: 4px solid rgb(46, 46, 46);
		touch-action: none;
		
	}

	.plot-title {
		position: absolute;
		top: -2px;
		left: 50%;
		transform: translateX(-50%);
		background-color: rgb(46, 46, 46);
		color: rgba(255, 255, 255, 0.8);
		padding: 1px 10px;
		font-size: 14px;
		font-weight: bold;
		border-bottom-left-radius: 8px;
		border-bottom-right-radius: 8px;
		pointer-events: none;
		z-index: 10;
		letter-spacing: 0.5px;
	}

	/* --- NEW STYLES FOR AXIS LABELS --- */
	.axis-label {
		position: absolute;
		color: rgba(255, 255, 255, 0.5); /* Red color matching the request image */
		font-weight: bold;
		font-size: 14px;
		pointer-events: none;
		z-index: 5;
	}

	.axis-label.y-axis {
		transform: translate(-50%, 0); /* Center horizontally */
	}

	.axis-label.x-axis {
		transform: translate(0, -50%); /* Center vertically */
	}

	.main-axis {
		stroke: rgba(255, 255, 255, 0.5);
		stroke-width: 2.5;
	}
	.grid line {
		stroke: rgba(255, 255, 255, 0.12);
		stroke-width: 1;
	}
	.labels text {
		font-weight: bold;
		fill: rgba(255, 255, 255, 0.5);
		font-size: 20px;
		pointer-events: none;
	}
	marker polygon {
		fill: inherit;
		stroke: none;
	}

	g:hover .hover-ring {
		opacity: 0.3;
	}
</style>
