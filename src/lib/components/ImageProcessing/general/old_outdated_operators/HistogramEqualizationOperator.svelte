<script>
	import { PixelBuffer } from '$lib/classes/PixelBuffer';
	import MathPlot2D from '../MathPlot2D.svelte';
	import * as MD from '../../classes/MathPlot2D.svelte';
	import { Colors } from '$lib/classes/Colors';

	let { input, output = $bindable() } = $props();

	let cdfCurve = $state([]);

	$effect(() => {
		if (!input) {
			output = null;
			return;
		}

		const w = input.width;
		const h = input.height;
		const src = input.data;
		const totalPixels = w * h;

		//histogram
		const histR = new Uint32Array(256);
		const histG = new Uint32Array(256);
		const histB = new Uint32Array(256);

		for (let i = 0; i < src.length; i += 4) {
			histR[src[i]]++;
			histG[src[i + 1]]++;
			histB[src[i + 2]]++;
		}

		const cdfR = new Uint32Array(256);
		const cdfG = new Uint32Array(256);
		const cdfB = new Uint32Array(256);

		let sumR = 0,
			sumG = 0,
			sumB = 0;

		// 1. Finde den Start-Index (erster Grauwert, der Pixel enthält) für ALLE Kanäle
		let minR = 0;
		while (minR < 255 && histR[minR] === 0) minR++;
		let minG = 0;
		while (minG < 255 && histG[minG] === 0) minG++;
		let minB = 0;
		while (minB < 255 && histB[minB] === 0) minB++;

		// Kumulation (bleibt gleich)
		for (let i = 0; i < 256; i++) {
			sumR += histR[i];
			sumG += histG[i];
			sumB += histB[i];

			cdfR[i] = sumR;
			cdfG[i] = sumG;
			cdfB[i] = sumB;
		}

		// 2. Hole die cdfMin Werte (Anzahl der Pixel beim niedrigsten Grauwert)
		// Wir nutzen die oben gefundenen Indizes
		const cdfMinR = cdfR[minR];
		const cdfMinG = cdfG[minG];
		const cdfMinB = cdfB[minB];

		const lutR = new Uint8Array(256);
		const lutG = new Uint8Array(256);
		const lutB = new Uint8Array(256);

		// lookUpTables filling mit "Advanced Formula"
		for (let i = 0; i < 256; i++) {
			// Formel: (cdf(v) - cdfMin) / (Total - cdfMin) * 255

			// ROT
			if (cdfR[i] <= cdfMinR) {
				lutR[i] = 0;
			} else {
				lutR[i] = Math.round(((cdfR[i] - cdfMinR) / (totalPixels - cdfMinR)) * 255);
			}

			// GRÜN
			if (cdfG[i] <= cdfMinG) {
				lutG[i] = 0;
			} else {
				lutG[i] = Math.round(((cdfG[i] - cdfMinG) / (totalPixels - cdfMinG)) * 255);
			}

			// BLAU
			if (cdfB[i] <= cdfMinB) {
				lutB[i] = 0;
			} else {
				lutB[i] = Math.round(((cdfB[i] - cdfMinB) / (totalPixels - cdfMinB)) * 255);
			}
		}

		//func rendering
		const cdfCurveRed = new MD.Func((x) => {
			const idx = Math.max(0, Math.min(255, Math.floor(x)));
			return lutR[idx];
		});
		cdfCurveRed.width = 5;
		cdfCurveRed.color = Colors.red_maroon();

		const cdfCurveGreen = new MD.Func((x) => {
			const idx = Math.max(0, Math.min(255, Math.floor(x)));
			return lutG[idx];
		});
		cdfCurveGreen.width = 5;
		cdfCurveGreen.color = Colors.green();

		const cdfCurveBlue = new MD.Func((x) => {
			const idx = Math.max(0, Math.min(255, Math.floor(x)));
			return lutB[idx];
		});
		cdfCurveBlue.width = 5;
		cdfCurveBlue.color = Colors.blue_navy();

		cdfCurve = [cdfCurveRed, cdfCurveGreen, cdfCurveBlue];

		//resolve LUT
		const dst = new Uint8ClampedArray(src.length);
		for (let i = 0; i < src.length; i += 4) {
			dst[i] = lutR[src[i]];
			dst[i + 1] = lutG[src[i + 1]];
			dst[i + 2] = lutB[src[i + 2]];
			dst[i + 3] = src[i + 3];
		}

		output = new PixelBuffer(w, h, dst);
	});
	let plotItems = $derived(cdfCurve);
</script>

<div class="operator-card">
	<div class="header">
		<div class="title-group">
			<span class="icon">⚖️</span>
			<span class="title">Equalization</span>
		</div>
		<div class="badge">Auto</div>
	</div>

	<MathPlot2D
		title="CDF Transform"
		bind:items={plotItems}
		xDomain={[0, 255]}
		yDomain={[0, 255]}
		width={238}
		height={238}
		flipY={false}
		showGrid={true}
		xGridStep={50}
		yGridStep={50}
		xLabelStep={100}
		yLabelStep={100}
	/>

	<div class="info-text">Maps intensity distribution to flatten the histogram.</div>
</div>

<style>
	.operator-card {
		background: #2a2a2a;
		border: 1px solid #444;
		border-radius: 8px;
		padding: 12px;
		color: #e0e0e0;
		width: 300px;
		font-family: sans-serif;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
	}

	.header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 12px;
		border-bottom: 1px solid #444;
		padding-bottom: 8px;
	}

	.title-group {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.icon {
		font-size: 1.2rem;
	}
	.title {
		font-weight: bold;
		font-size: 0.9rem;
	}

	.badge {
		background: #333;
		color: #888;
		font-size: 0.7rem;
		padding: 2px 6px;
		border-radius: 4px;
		border: 1px solid #444;
	}

	.info-text {
		margin-top: 8px;
		font-size: 0.75rem;
		color: #777;
		text-align: center;
		font-style: italic;
	}
</style>
