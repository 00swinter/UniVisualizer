<script lang="ts">
    import MathPlot2D from "$lib/components/MathPlot2D.svelte";
    import * as MD from "$lib/classes/MathPlot2D.svelte";
    import * as Colors from "$lib/classes/Colors";

    const xMin = -10;
    const xMax = 10;
    const yMin = -10;
    const yMax = 10;

    const p1 = new MD.Point(1.2, 0.5);
    p1.isDraggable = true;
    p1.color = Colors.red;

    const p2 = new MD.Point(-0.5, 1.2);
    p2.isDraggable = true;

    const minLen = 1;
    const maxLen = 4;

    function clampVector(x, y) {
        let len = Math.sqrt(x * x + y * y);
        if (len === 0) return { x: minLen, y: 0, len: minLen };
        if (len < minLen) return { x: x * (minLen / len), y: y * (minLen / len), len: minLen };
        if (len > maxLen) return { x: x * (maxLen / len), y: y * (maxLen / len), len: maxLen };
        return { x, y, len };
    }

    p1.constraint = (x, y) => {
        const clamped1 = clampVector(x, y);

        let len2 = Math.sqrt(p2.x * p2.x + p2.y * p2.y);
        if (len2 < minLen) len2 = minLen;
        if (len2 > maxLen) len2 = maxLen;

        const ratio = len2 / clamped1.len;
        p2.x = -clamped1.y * ratio;
        p2.y = clamped1.x * ratio;

        return { x: clamped1.x, y: clamped1.y };
    };

    p2.constraint = (x, y) => {
        const clamped2 = clampVector(x, y);

        let len1 = Math.sqrt(p1.x * p1.x + p1.y * p1.y);
        if (len1 < minLen) len1 = minLen;
        if (len1 > maxLen) len1 = maxLen;

        const ratio = len1 / clamped2.len;
        p1.x = clamped2.y * ratio;
        p1.y = -clamped2.x * ratio;

        return { x: clamped2.x, y: clamped2.y };
    };

    const line1 = new MD.Line({ x: 0, y: 0 }, p1);
    const line2 = new MD.Line({ x: 0, y: 0 }, p2);

    let latticePoints = $derived.by(() => {
        let pts = [];
        const limit = 30;

        for (let a = -limit; a <= limit; a++) {
            for (let b = -limit; b <= limit; b++) {
                const x = a * p1.x + b * p2.x;
                const y = a * p1.y + b * p2.y;

                if (x >= xMin && x <= xMax && y >= yMin && y <= yMax) {
                    if ((x != p1.x && y != p1.y) || (x != p2.x && y != p2.y)) {
                        const pt = new MD.Point(x, y);
                        pt.color = "rgba(255, 255, 255, 0.3)";
                        pt.isDraggable = false;
                        pts.push(pt);
                    }
                }
            }
        }
        return pts;
    });

    let itemsGood = $derived([line1, line2, p1, p2, ...latticePoints]);

    let badBasis = $derived.by(() => {
        const bx1 = 2 * p1.x + 1 * p2.x;
        const by1 = 2 * p1.y + 1 * p2.y;
        const bp1 = new MD.Point(bx1, by1);
        bp1.color = Colors.orange;
        bp1.isDraggable = false;

        const bx2 = 3 * p1.x + 2 * p2.x;
        const by2 = 3 * p1.y + 2 * p2.y;
        const bp2 = new MD.Point(bx2, by2);
        bp2.color = Colors.orange;
        bp2.isDraggable = false;

        const bline1 = new MD.Line({ x: 0, y: 0 }, bp1);
        bline1.color = Colors.orange;
        const bline2 = new MD.Line({ x: 0, y: 0 }, bp2);
        bline2.color = Colors.orange;

        return [bline1, bline2, bp1, bp2];
    });

    let itemsBad = $derived([...badBasis, ...latticePoints]);
</script>

<div class="page">
    <h1>Lattis Encryption</h1>

    <div class="plots">
        <MathPlot2D
            title="Gute Basis"
            bind:items={itemsGood}
            xDomain={[xMin, xMax]}
            yDomain={[yMin, yMax]}
            width={500}
            height={500}
            flipY={false}
            showGrid={true}
            xGridStep={1}
            yGridStep={1}
            xLabelStep={2}
            yLabelStep={2}
        />

        <MathPlot2D
            title="Schlechte Basis"
            bind:items={itemsBad}
            xDomain={[xMin, xMax]}
            yDomain={[yMin, yMax]}
            width={500}
            height={500}
            flipY={false}
            showGrid={true}
            xGridStep={1}
            yGridStep={1}
            xLabelStep={2}
            yLabelStep={2}
        />
    </div>
</div>

<style>
    .page {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
        flex: 1;
    }

    .plots {
        display: flex;
        gap: 2rem;
        flex-wrap: wrap;
        justify-content: center;
    }

    h1, h2, h3 {
        color: var(--color-text-heading-strong);
        margin: 0;
    }

    h2 {
        margin-top: 1rem;
    }

    h3 {
        font-size: 1.1rem;
    }
</style>