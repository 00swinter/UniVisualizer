<script>
    import { PixelBuffer } from '$lib/classes/PixelBuffer';

    let { input, output = $bindable() } = $props();



    $effect(()=>{

        const w = input.width;
		const h = input.height;
        const src = input.data;

        //histogram
        const histR = new Uint32Array(256);
        const histG = new Uint32Array(256);
        const histB = new Uint32Array(256);

        for (let i = 0; i < src.length; i += 4) {
            histR[src[i]]++;
            histG[src[i + 1]]++;
            histB[src[i + 2]]++;
        }

        let minR = 0;
		while (minR < 255 && histR[minR] === 0) minR++;
		let minG = 0;
		while (minG < 255 && histG[minG] === 0) minG++;
		let minB = 0;
		while (minB < 255 && histB[minB] === 0) minB++;


        let maxR = 255;
        while (maxR > 0  && histR[maxR] === 0) maxR--;
        let maxG = 255;
        while (maxG > 0  && histG[maxG] === 0) maxG--;
        let maxB = 255;
        while (maxB > 0  && histB[maxB] === 0) maxB--;

        const lutR = new Uint8Array(256);
        const lutG = new Uint8Array(256);
        const lutB = new Uint8Array(256);

        //lookUpTables filling
        for (let i = 0; i < 256; i++) {
            lutR[i] = Math.round(((i - minR) / (maxR - minR)) * 255);
            lutG[i] = Math.round(((i - minG) / (maxG - minG)) * 255);
            lutB[i] = Math.round(((i - minB) / (maxB - minB)) * 255);
        }


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

</script>


<div>
    HISTOGRAM NORMALISATION
</div>