<script>
    import { PixelBuffer } from '$lib/classes/PixelBuffer';
    
    let { input, output = $bindable() } = $props();
    
    let angle = $state(0);
    let anchorX = $state(0.5);
    let anchorY = $state(0.5);
    
    let resizeMode = $state('crop'); // 'fit', 'crop'

    const anchors = [
        {x:0, y:0}, {x:0.5, y:0}, {x:1, y:0},
        {x:0, y:0.5}, {x:0.5, y:0.5}, {x:1, y:0.5},
        {x:0, y:1}, {x:0.5, y:1}, {x:1, y:1}
    ];

    $effect(() => {
        if (!input) {
            output = null;
            return;
        }
        
        const src = input.data;
        const sw = input.width;
        const sh = input.height;
        
        const cx = sw * anchorX;
        const cy = sh * anchorY;

        const rad = (angle * Math.PI) / 180;
        const c = Math.cos(rad);
        const s = Math.sin(rad);

        let dw, dh;
        let startX, startY;

        if (resizeMode === 'fit') {
            const corners = [
                {x: 0 - cx, y: 0 - cy},
                {x: sw - cx, y: 0 - cy},
                {x: 0 - cx, y: sh - cy},
                {x: sw - cx, y: sh - cy}
            ];
            
            let minX = Infinity, maxX = -Infinity;
            let minY = Infinity, maxY = -Infinity;
            
            corners.forEach(p => {
                const rx = p.x * c - p.y * s;
                const ry = p.x * s + p.y * c;
                if(rx < minX) minX = rx;
                if(rx > maxX) maxX = rx;
                if(ry < minY) minY = ry;
                if(ry > maxY) maxY = ry;
            });
            
            dw = Math.ceil(maxX - minX);
            dh = Math.ceil(maxY - minY);
            
            startX = minX;
            startY = minY;

        } else {
            dw = sw;
            dh = sh;

            startX = -cx;
            startY = -cy;
        }
        
        const dst = new Uint8ClampedArray(dw * dh * 4);

        for (let y = 0; y < dh; y++) {
            for (let x = 0; x < dw; x++) {
                
                const targetX = startX + x;
                const targetY = startY + y;

                const sx = targetX * c + targetY * s + cx;
                const sy = -targetX * s + targetY * c + cy;

                const isx = Math.round(sx);
                const isy = Math.round(sy);

                const dstIdx = (y * dw + x) * 4;

                if (isx >= 0 && isx < sw && isy >= 0 && isy < sh) {
                    const srcIdx = (isy * sw + isx) * 4;
                    dst[dstIdx]     = src[srcIdx];
                    dst[dstIdx + 1] = src[srcIdx + 1];
                    dst[dstIdx + 2] = src[srcIdx + 2];
                    dst[dstIdx + 3] = src[srcIdx + 3];
                } else {
                    dst[dstIdx + 3] = 0;
                }
            }
        }
        
        output = new PixelBuffer(dw, dh, dst);
    });
</script>

<div class="operator-card">
    <div class="header">
        <div class="title-group">
            <span class="icon">cw</span>
            <span class="title">Rotate</span>
        </div>
        <div class="header-controls">
            <button 
                class="mode-btn" 
                onclick={() => resizeMode = resizeMode === 'fit' ? 'crop' : 'fit'}
                title={resizeMode === 'fit' ? "Auto-Expand Canvas" : "Keep Original Size"}
            >
                {resizeMode === 'fit' ? 'Fit' : 'Crop'}
            </button>
            
            <button class="reset-btn" onclick={() => angle = 0} title="Reset Angle">
                ↺
            </button>
        </div>
    </div>

    <div class="vis-row">
        <div class="anchor-grid">
            {#each anchors as a}
                <button 
                    class="anchor-dot" 
                    class:selected={anchorX === a.x && anchorY === a.y}
                    onclick={() => { anchorX = a.x; anchorY = a.y; }}
                    title="Set Pivot Point"
                ></button>
            {/each}
        </div>

        <div class="dial-container">
            <div class="dial">
                <div class="dial-marker" style="transform: rotate({angle}deg)"></div>
                <div class="pivot-dot" style="left: {anchorX*100}%; top: {anchorY*100}%"></div>
            </div>
            <div class="angle-value">{angle}°</div>
        </div>
    </div>

    <div class="controls">
        <input 
            type="range" 
            min="0" 
            max="360" 
            step="1" 
            bind:value={angle} 
        />
        <div class="quick-actions">
            <button onclick={() => angle = 90}>90°</button>
            <button onclick={() => angle = 180}>180°</button>
            <button onclick={() => angle = 45}>45°</button>
        </div>
    </div>
</div>

<style>
    .operator-card {
        background: #2a2a2a;
        border: 1px solid #444;
        border-radius: 8px;
        padding: 12px;
        color: #e0e0e0;
        width: 275px;
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
    .header-controls {
        display: flex;
        gap: 8px;
    }

    .icon { font-size: 0.9rem; font-weight:bold; color: #eab308; border: 1px solid #eab308; border-radius: 4px; padding: 1px 3px;}
    .title { font-weight: bold; font-size: 0.9rem; }

    .mode-btn {
        background: #111;
        border: 1px solid #444;
        color: #888;
        font-size: 0.7rem;
        padding: 2px 6px;
        border-radius: 4px;
        cursor: pointer;
        text-transform: uppercase;
    }
    .mode-btn:hover { color: #fff; border-color: #666; }

    .reset-btn {
        background: transparent;
        border: 1px solid #444;
        color: #888;
        width: 20px;
        height: 20px;
        border-radius: 4px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .reset-btn:hover { background: #333; color: #fff; }

    .vis-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 10px;
        margin-bottom: 15px;
    }

    .anchor-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 2px;
        width: 24px;
        height: 24px;
    }
    .anchor-dot {
        width: 100%;
        height: 100%;
        background: #444;
        border: none;
        padding: 0;
        border-radius: 1px;
        cursor: pointer;
    }
    .anchor-dot:hover { background: #666; }
    .anchor-dot.selected { background: #eab308; box-shadow: 0 0 4px #eab308; z-index: 2;}

    .dial-container {
        display: flex;
        align-items: center;
        gap: 10px;
    }
    .dial {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: 2px solid #555;
        position: relative;
        background: #111;
        overflow: hidden;
    }
    .dial-marker {
        position: absolute;
        top: 0; left: 50%;
        width: 2px;
        height: 50%;
        background: #eab308;
        transform-origin: bottom center;
        left: calc(50% - 1px);
        z-index: 1;
    }
    .pivot-dot {
        position: absolute;
        width: 4px; 
        height: 4px;
        background: #fff;
        border-radius: 50%;
        transform: translate(-50%, -50%);
        z-index: 2;
        box-shadow: 0 0 2px #000;
    }
    .angle-value {
        font-family: monospace;
        font-size: 1.1rem;
        color: #eab308;
        min-width: 45px;
        text-align: right;
    }

    .controls {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }
    input[type=range] {
        width: 100%;
        accent-color: #eab308;
        cursor: pointer;
    }
    .quick-actions {
        display: flex;
        gap: 5px;
    }
    .quick-actions button {
        flex: 1;
        background: #333;
        border: 1px solid #444;
        color: #ccc;
        font-size: 0.75rem;
        padding: 4px;
        border-radius: 4px;
        cursor: pointer;
    }
    .quick-actions button:hover {
        background: #444;
        color: #fff;
    }
</style>