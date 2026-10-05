export type HoughStage = "votes" | "space" | "peaks" | "lines";

export interface HoughResult {
    data: Uint8ClampedArray;
    /** Edge pixels that cast a vote. */
    voters: number;
    /** Peaks kept as lines. */
    lines: number;
}

const LINE_COLORS: readonly [number, number, number][] = [
    [255, 171, 0],
    [0, 229, 255],
    [255, 64, 129],
    [57, 255, 20],
    [124, 77, 255],
    [255, 110, 64],
];

/**
 * Line Hough transform.
 * A bright pixel votes for every line through it. A line is an angle θ and a
 * signed distance ρ, with ρ = x cos θ + y sin θ in image pixels (y downward).
 * θ runs from 0° up to, but not including, 180°. Peaks in that vote table are
 * the detected lines.
 * `edgeThreshold` is the brightness a pixel needs in order to vote.
 * `angleStepDeg` is the gap between angle columns.
 * `minStrength` is a percent of the busiest cell; quieter cells are dropped.
 * `maxLines` caps how many peaks are kept, strongest first.
 */
export function runHough(
    src: Uint8ClampedArray,
    width: number,
    height: number,
    stage: HoughStage,
    edgeThreshold: number,
    angleStepDeg: number,
    minStrength: number,
    maxLines: number
): HoughResult {
    const dst = new Uint8ClampedArray(width * height * 4);
    const n = width * height;
    if (n === 0 || width <= 0 || height <= 0) {
        return { data: dst, voters: 0, lines: 0 };
    }

    const cutoff = Math.max(0, Math.min(255, edgeThreshold));

    if (stage === "votes") {
        let voters = 0;
        for (let i = 0, p = 0; i < n; i++, p += 4) {
            const on = luminance(src, p) >= cutoff;
            if (on) voters++;
            const v = on ? 255 : 0;
            dst[p] = v;
            dst[p + 1] = v;
            dst[p + 2] = v;
            dst[p + 3] = src[p + 3];
        }
        return { data: dst, voters, lines: 0 };
    }

    const step = Math.min(10, Math.max(1, angleStepDeg));
    const thetaStep = (step * Math.PI) / 180;
    const thetaBins = Math.max(1, Math.round(Math.PI / thetaStep));
    const cosT = new Float32Array(thetaBins);
    const sinT = new Float32Array(thetaBins);
    for (let t = 0; t < thetaBins; t++) {
        const theta = t * thetaStep;
        cosT[t] = Math.cos(theta);
        sinT[t] = Math.sin(theta);
    }

    const rhoMax = Math.hypot(width - 1, height - 1);
    const rhoOffset = Math.ceil(rhoMax);
    const rhoBins = rhoOffset * 2 + 1;
    const acc = new Uint32Array(thetaBins * rhoBins);

    let voters = 0;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const p = (y * width + x) * 4;
            if (luminance(src, p) < cutoff) continue;
            voters++;
            for (let t = 0; t < thetaBins; t++) {
                let r = Math.round(x * cosT[t] + y * sinT[t]) + rhoOffset;
                if (r < 0) r = 0;
                else if (r >= rhoBins) r = rhoBins - 1;
                acc[t * rhoBins + r]++;
            }
        }
    }

    let maxVotes = 0;
    for (let i = 0; i < acc.length; i++) {
        if (acc[i] > maxVotes) maxVotes = acc[i];
    }

    const peaks = findPeaks(
        acc,
        thetaBins,
        rhoBins,
        rhoOffset,
        thetaStep,
        step,
        maxVotes,
        minStrength,
        maxLines
    );

    if (stage === "lines") {
        paintLines(dst, src, width, height, peaks, cosT, sinT);
    } else {
        paintSpace(dst, src, width, height, acc, thetaBins, rhoBins, maxVotes);
        if (stage === "peaks") markPeaks(dst, width, height, peaks, thetaBins, rhoBins);
    }

    return { data: dst, voters, lines: peaks.length };
}

interface Peak {
    t: number;
    r: number;
    theta: number;
    rho: number;
}

function luminance(src: Uint8ClampedArray, p: number): number {
    return 0.299 * src[p] + 0.587 * src[p + 1] + 0.114 * src[p + 2];
}

function findPeaks(
    acc: Uint32Array,
    thetaBins: number,
    rhoBins: number,
    rhoOffset: number,
    thetaStep: number,
    angleStepDeg: number,
    maxVotes: number,
    minStrength: number,
    maxLines: number
): Peak[] {
    if (maxVotes < 2) return [];

    const minVotes = Math.max(2, Math.ceil((maxVotes * minStrength) / 100));
    const tRadius = Math.max(1, Math.round(8 / angleStepDeg));
    const rRadius = 12;
    const limit = Math.max(1, Math.round(maxLines));

    const candidates: { t: number; r: number; votes: number }[] = [];
    for (let t = 0; t < thetaBins; t++) {
        const base = t * rhoBins;
        for (let r = 0; r < rhoBins; r++) {
            const votes = acc[base + r];
            if (votes < minVotes) continue;
            if (!isLocalMax(acc, thetaBins, rhoBins, t, r, votes, tRadius, rRadius)) continue;
            candidates.push({ t, r, votes });
        }
    }

    candidates.sort((a, b) => b.votes - a.votes);

    const peaks: Peak[] = [];
    for (const c of candidates) {
        if (peaks.length >= limit) break;
        const theta = c.t * thetaStep;
        const rho = c.r - rhoOffset;
        let crowded = false;
        for (const kept of peaks) {
            if (peaksAreClose(kept.theta, kept.rho, theta, rho, tRadius, rRadius, thetaStep)) {
                crowded = true;
                break;
            }
        }
        if (crowded) continue;
        peaks.push({ t: c.t, r: c.r, theta, rho });
    }
    return peaks;
}

/** True when two peaks are the same line, including across the 0°/180° cut. */
function peaksAreClose(
    thetaA: number,
    rhoA: number,
    thetaB: number,
    rhoB: number,
    tRadius: number,
    rRadius: number,
    thetaStep: number
): boolean {
    let dTheta = thetaA - thetaB;
    let rho = rhoB;
    const halfPi = Math.PI / 2;
    if (dTheta > halfPi) {
        dTheta -= Math.PI;
        rho = -rho;
    } else if (dTheta < -halfPi) {
        dTheta += Math.PI;
        rho = -rho;
    }
    return Math.abs(dTheta) / thetaStep <= tRadius && Math.abs(rhoA - rho) <= rRadius;
}

function isLocalMax(
    acc: Uint32Array,
    thetaBins: number,
    rhoBins: number,
    t: number,
    r: number,
    votes: number,
    tRadius: number,
    rRadius: number
): boolean {
    const t0 = Math.max(0, t - tRadius);
    const t1 = Math.min(thetaBins - 1, t + tRadius);
    const r0 = Math.max(0, r - rRadius);
    const r1 = Math.min(rhoBins - 1, r + rRadius);
    for (let tt = t0; tt <= t1; tt++) {
        const base = tt * rhoBins;
        for (let rr = r0; rr <= r1; rr++) {
            if (tt === t && rr === r) continue;
            if (acc[base + rr] > votes) return false;
        }
    }
    return true;
}

function paintSpace(
    dst: Uint8ClampedArray,
    src: Uint8ClampedArray,
    width: number,
    height: number,
    acc: Uint32Array,
    thetaBins: number,
    rhoBins: number,
    maxVotes: number
): void {
    const scale = maxVotes > 0 ? 255 / maxVotes : 0;
    for (let y = 0; y < height; y++) {
        const r = Math.min(rhoBins - 1, Math.floor(((y + 0.5) / height) * rhoBins));
        for (let x = 0; x < width; x++) {
            const t = Math.min(thetaBins - 1, Math.floor(((x + 0.5) / width) * thetaBins));
            const v = acc[t * rhoBins + r] * scale;
            const p = (y * width + x) * 4;
            dst[p] = v;
            dst[p + 1] = v;
            dst[p + 2] = v;
            dst[p + 3] = src[p + 3];
        }
    }
}

function markPeaks(
    dst: Uint8ClampedArray,
    width: number,
    height: number,
    peaks: Peak[],
    thetaBins: number,
    rhoBins: number
): void {
    for (let i = peaks.length - 1; i >= 0; i--) {
        const peak = peaks[i];
        const [cr, cg, cb] = LINE_COLORS[i % LINE_COLORS.length];
        const cx = binCenter(peak.t, thetaBins, width);
        const cy = binCenter(peak.r, rhoBins, height);
        for (let dy = -4; dy <= 4; dy++) {
            for (let dx = -4; dx <= 4; dx++) {
                if (dx !== 0 && dy !== 0) continue;
                stamp(dst, width, height, cx + dx, cy + dy, cr, cg, cb);
            }
        }
    }
}

function paintLines(
    dst: Uint8ClampedArray,
    src: Uint8ClampedArray,
    width: number,
    height: number,
    peaks: Peak[],
    cosT: Float32Array,
    sinT: Float32Array
): void {
    const n = width * height;
    for (let i = 0, p = 0; i < n; i++, p += 4) {
        dst[p] = src[p] * 0.4;
        dst[p + 1] = src[p + 1] * 0.4;
        dst[p + 2] = src[p + 2] * 0.4;
        dst[p + 3] = src[p + 3];
    }

    for (let i = peaks.length - 1; i >= 0; i--) {
        const peak = peaks[i];
        const [cr, cg, cb] = LINE_COLORS[i % LINE_COLORS.length];
        const cos = cosT[peak.t];
        const sin = sinT[peak.t];
        if (Math.abs(sin) >= Math.abs(cos)) {
            if (sin === 0) continue;
            for (let x = 0; x < width; x++) {
                const y = Math.round((peak.rho - x * cos) / sin);
                stamp(dst, width, height, x, y, cr, cg, cb);
            }
        } else if (cos !== 0) {
            for (let y = 0; y < height; y++) {
                const x = Math.round((peak.rho - y * sin) / cos);
                stamp(dst, width, height, x, y, cr, cg, cb);
            }
        }
    }
}

function binCenter(bin: number, bins: number, size: number): number {
    const x = Math.floor(((bin + 0.5) / bins) * size);
    if (x < 0) return 0;
    if (x >= size) return size - 1;
    return x;
}

function stamp(
    dst: Uint8ClampedArray,
    width: number,
    height: number,
    x: number,
    y: number,
    r: number,
    g: number,
    b: number
): void {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const p = (y * width + x) * 4;
    dst[p] = r;
    dst[p + 1] = g;
    dst[p + 2] = b;
    dst[p + 3] = 255;
}
