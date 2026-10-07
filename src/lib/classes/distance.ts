export type DistanceMetric = "euclidean" | "city" | "chessboard";
export type DistanceRange = "stretch" | "scale";

export interface DistanceResult {
    data: Uint8ClampedArray;
    /** Farthest object pixel from the background, in pixels. 0 when there is no object. */
    maxDistance: number;
}

/**
 * Distance of each object pixel to the nearest background pixel.
 * Background stays black. Object pixels are those at or above `cutoff`
 * in Rec. 601 luminance, or below it when `invert` is set.
 * Euclidean is straight-line distance. City block steps in the four
 * straight directions. Chessboard steps in all eight, diagonal included.
 * Stretch maps the farthest pixel to white. Scale adds `gain` gray levels
 * per pixel of distance and stops at white.
 */
export function runDistance(
    src: Uint8ClampedArray,
    width: number,
    height: number,
    metric: DistanceMetric,
    cutoff: number,
    invert: boolean,
    range: DistanceRange,
    gain: number
): DistanceResult {
    const n = width * height;
    if (n <= 0 || width <= 0 || height <= 0) {
        return { data: new Uint8ClampedArray(Math.max(0, src.length)), maxDistance: 0 };
    }

    const dist = objectDistances(src, width, height, metric, cutoff, invert);
    let maxDistance = 0;
    for (let i = 0; i < n; i++) {
        const d = dist[i];
        if (d > maxDistance) maxDistance = d;
    }

    const scale =
        range === "stretch" ? (maxDistance > 0 ? 255 / maxDistance : 0) : Math.max(0, gain);
    const data = new Uint8ClampedArray(n * 4);
    for (let i = 0, p = 0; i < n; i++, p += 4) {
        const d = dist[i];
        const gray = d > 0 ? Math.round(d * scale) : 0;
        data[p] = gray;
        data[p + 1] = gray;
        data[p + 2] = gray;
        data[p + 3] = src[p + 3];
    }

    return { data, maxDistance };
}

/** Raw distances, in pixels. Background and pixels with no background in the picture are 0. */
function objectDistances(
    src: Uint8ClampedArray,
    width: number,
    height: number,
    metric: DistanceMetric,
    cutoff: number,
    invert: boolean
): Float64Array {
    const mask = objectMask(src, width, height, cutoff, invert);
    if (metric === "city") return chamfer(mask, width, height, false);
    if (metric === "chessboard") return chamfer(mask, width, height, true);
    return euclidean(mask, width, height);
}

function objectMask(
    src: Uint8ClampedArray,
    width: number,
    height: number,
    cutoff: number,
    invert: boolean
): Uint8Array {
    const n = width * height;
    const mask = new Uint8Array(n);
    for (let i = 0, p = 0; i < n; i++, p += 4) {
        const luma = 0.299 * src[p] + 0.587 * src[p + 1] + 0.114 * src[p + 2];
        const object = invert ? luma < cutoff : luma >= cutoff;
        if (object) mask[i] = 1;
    }
    return mask;
}

/** Exact city-block (4-neighbor) or chessboard (8-neighbor) distance. Two scans. */
function chamfer(mask: Uint8Array, width: number, height: number, diagonal: boolean): Float64Array {
    const n = width * height;
    const dist = new Float64Array(n);
    const inf = width + height;
    for (let i = 0; i < n; i++) dist[i] = mask[i] ? inf : 0;

    for (let y = 0; y < height; y++) {
        const row = y * width;
        const prev = row - width;
        for (let x = 0; x < width; x++) {
            const i = row + x;
            let best = dist[i];
            if (x > 0) best = Math.min(best, dist[i - 1] + 1);
            if (y > 0) {
                best = Math.min(best, dist[prev + x] + 1);
                if (diagonal && x > 0) best = Math.min(best, dist[prev + x - 1] + 1);
                if (diagonal && x + 1 < width) best = Math.min(best, dist[prev + x + 1] + 1);
            }
            dist[i] = best;
        }
    }

    for (let y = height - 1; y >= 0; y--) {
        const row = y * width;
        const next = row + width;
        for (let x = width - 1; x >= 0; x--) {
            const i = row + x;
            let best = dist[i];
            if (x + 1 < width) best = Math.min(best, dist[i + 1] + 1);
            if (y + 1 < height) {
                best = Math.min(best, dist[next + x] + 1);
                if (diagonal && x > 0) best = Math.min(best, dist[next + x - 1] + 1);
                if (diagonal && x + 1 < width) best = Math.min(best, dist[next + x + 1] + 1);
            }
            dist[i] = best;
        }
    }

    for (let i = 0; i < n; i++) {
        if (dist[i] >= inf) dist[i] = 0;
    }
    return dist;
}

/**
 * Exact Euclidean distance.
 * Each column stores the squared distance to the nearest background in that column.
 * Each row then takes the lower envelope of those parabolas.
 */
function euclidean(mask: Uint8Array, width: number, height: number): Float64Array {
    const n = width * height;
    const grid = new Float64Array(n);
    const inf = width * width + height * height + 1;

    for (let x = 0; x < width; x++) {
        let above = height + 1;
        for (let y = 0; y < height; y++) {
            const i = y * width + x;
            above = mask[i] === 0 ? 0 : above + 1;
            grid[i] = above;
        }
        let below = height + 1;
        for (let y = height - 1; y >= 0; y--) {
            const i = y * width + x;
            below = mask[i] === 0 ? 0 : below + 1;
            if (below < grid[i]) grid[i] = below;
        }
        for (let y = 0; y < height; y++) {
            const i = y * width + x;
            const g = grid[i];
            grid[i] = g > height ? inf : g * g;
        }
    }

    const span = Math.max(width, height);
    const f = new Float64Array(span);
    const d = new Float64Array(span);
    const v = new Int32Array(span);
    const z = new Float64Array(span + 1);

    for (let y = 0; y < height; y++) {
        const row = y * width;
        for (let x = 0; x < width; x++) f[x] = grid[row + x];
        squaredDistance1d(f, width, d, v, z);
        for (let x = 0; x < width; x++) grid[row + x] = d[x];
    }

    const out = new Float64Array(n);
    for (let i = 0; i < n; i++) {
        const sq = grid[i];
        out[i] = sq >= inf ? 0 : Math.sqrt(sq);
    }
    return out;
}

/** Squared 1D distance transform. `f` holds squared column distances. */
function squaredDistance1d(
    f: Float64Array,
    n: number,
    d: Float64Array,
    v: Int32Array,
    z: Float64Array
): void {
    let k = 0;
    v[0] = 0;
    z[0] = Number.NEGATIVE_INFINITY;
    z[1] = Number.POSITIVE_INFINITY;

    for (let q = 1; q < n; q++) {
        let s = parabolaIntersection(f, v[k], q);
        while (k > 0 && s <= z[k]) {
            k--;
            s = parabolaIntersection(f, v[k], q);
        }
        k++;
        v[k] = q;
        z[k] = s;
        z[k + 1] = Number.POSITIVE_INFINITY;
    }

    k = 0;
    for (let q = 0; q < n; q++) {
        while (z[k + 1] < q) k++;
        const dx = q - v[k];
        d[q] = dx * dx + f[v[k]];
    }
}

function parabolaIntersection(f: Float64Array, i: number, q: number): number {
    return (f[q] + q * q - (f[i] + i * i)) / (2 * q - 2 * i);
}
