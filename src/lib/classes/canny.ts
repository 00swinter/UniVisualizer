export type CannyStage = "magnitude" | "direction" | "thinned" | "threshold" | "edges";

const AMBER_R = 255;
const AMBER_G = 171;
const AMBER_B = 0;

/**
 * Canny edge detector from a smoothed RGBA image.
 * Gradient, thinning, double threshold, and hysteresis run internally.
 * `low` and `high` are cutoffs on the gradient magnitude after the strongest
 * response in the image has been scaled to 255. If low is above high, they swap.
 */
export function runCanny(
    src: Uint8ClampedArray,
    width: number,
    height: number,
    stage: CannyStage,
    low: number,
    high: number
): Uint8ClampedArray {
    const dst = new Uint8ClampedArray(width * height * 4);
    const n = width * height;
    if (n === 0) return dst;

    const gray = new Float32Array(n);
    for (let i = 0, p = 0; i < n; i++, p += 4) {
        gray[i] = 0.299 * src[p] + 0.587 * src[p + 1] + 0.114 * src[p + 2];
    }

    const mag = new Float32Array(n);
    const angle = new Float32Array(n);
    let maxMag = 0;

    const sample = (x: number, y: number): number => {
        if (x < 0) x = 0;
        else if (x >= width) x = width - 1;
        if (y < 0) y = 0;
        else if (y >= height) y = height - 1;
        return gray[y * width + x];
    };

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = y * width + x;
            const a00 = sample(x - 1, y - 1);
            const a10 = sample(x, y - 1);
            const a20 = sample(x + 1, y - 1);
            const a01 = sample(x - 1, y);
            const a21 = sample(x + 1, y);
            const a02 = sample(x - 1, y + 1);
            const a12 = sample(x, y + 1);
            const a22 = sample(x + 1, y + 1);

            const gx = -a00 + a20 - 2 * a01 + 2 * a21 - a02 + a22;
            const gy = -a00 - 2 * a10 - a20 + a02 + 2 * a12 + a22;
            const m = Math.hypot(gx, gy);
            mag[i] = m;
            angle[i] = Math.atan2(gy, gx);
            if (m > maxMag) maxMag = m;
        }
    }

    const scale = maxMag > 0 ? 255 / maxMag : 0;
    const weakCut = Math.min(low, high);
    const strongCut = Math.max(low, high);

    const writeAlpha = (p: number) => {
        dst[p + 3] = src[p + 3];
    };

    if (stage === "magnitude" || stage === "direction") {
        for (let i = 0, p = 0; i < n; i++, p += 4) {
            const norm = mag[i] * scale;
            if (stage === "magnitude") {
                dst[p] = norm;
                dst[p + 1] = norm;
                dst[p + 2] = norm;
            } else {
                const [r, g, b] = directionColor(angle[i], norm / 255);
                dst[p] = r;
                dst[p + 1] = g;
                dst[p + 2] = b;
            }
            writeAlpha(p);
        }
        return dst;
    }

    const thin = new Float32Array(n);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = y * width + x;
            const m = mag[i];
            let deg = (angle[i] * 180) / Math.PI;
            if (deg < 0) deg += 180;

            let dx = 1;
            let dy = 0;
            if (deg >= 22.5 && deg < 67.5) {
                dx = 1;
                dy = 1;
            } else if (deg >= 67.5 && deg < 112.5) {
                dx = 0;
                dy = 1;
            } else if (deg >= 112.5 && deg < 157.5) {
                dx = -1;
                dy = 1;
            }

            const x1 = x + dx;
            const y1 = y + dy;
            const x2 = x - dx;
            const y2 = y - dy;
            const n1 = x1 < 0 || y1 < 0 || x1 >= width || y1 >= height ? 0 : mag[y1 * width + x1];
            const n2 = x2 < 0 || y2 < 0 || x2 >= width || y2 >= height ? 0 : mag[y2 * width + x2];
            thin[i] = m >= n1 && m >= n2 ? m : 0;
        }
    }

    if (stage === "thinned") {
        for (let i = 0, p = 0; i < n; i++, p += 4) {
            const norm = thin[i] * scale;
            dst[p] = norm;
            dst[p + 1] = norm;
            dst[p + 2] = norm;
            writeAlpha(p);
        }
        return dst;
    }

    const STRONG = 2;
    const WEAK = 1;
    const label = new Uint8Array(n);
    const stack: number[] = [];

    for (let i = 0; i < n; i++) {
        const v = thin[i] * scale;
        if (v >= strongCut) {
            label[i] = STRONG;
            stack.push(i);
        } else if (v >= weakCut) {
            label[i] = WEAK;
        }
    }

    if (stage === "threshold") {
        for (let i = 0, p = 0; i < n; i++, p += 4) {
            if (label[i] === STRONG) {
                dst[p] = 255;
                dst[p + 1] = 255;
                dst[p + 2] = 255;
            } else if (label[i] === WEAK) {
                dst[p] = AMBER_R;
                dst[p + 1] = AMBER_G;
                dst[p + 2] = AMBER_B;
            }
            writeAlpha(p);
        }
        return dst;
    }

    while (stack.length > 0) {
        const i = stack.pop() as number;
        const x = i % width;
        const y = (i - x) / width;
        for (let dy = -1; dy <= 1; dy++) {
            const ny = y + dy;
            if (ny < 0 || ny >= height) continue;
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = x + dx;
                if (nx < 0 || nx >= width) continue;
                const j = ny * width + nx;
                if (label[j] === WEAK) {
                    label[j] = STRONG;
                    stack.push(j);
                }
            }
        }
    }

    for (let i = 0, p = 0; i < n; i++, p += 4) {
        if (label[i] === STRONG) {
            dst[p] = 255;
            dst[p + 1] = 255;
            dst[p + 2] = 255;
        }
        writeAlpha(p);
    }

    return dst;
}

/** Hue follows the gradient angle. Brightness follows the normalized magnitude. */
function directionColor(angle: number, value: number): [number, number, number] {
    let h = angle / (2 * Math.PI);
    if (h < 0) h += 1;
    const sector = Math.floor(h * 6) % 6;
    const f = h * 6 - Math.floor(h * 6);
    const q = value * (1 - f);
    const t = value * f;
    switch (sector) {
        case 0:
            return [value * 255, t * 255, 0];
        case 1:
            return [q * 255, value * 255, 0];
        case 2:
            return [0, value * 255, t * 255];
        case 3:
            return [0, q * 255, value * 255];
        case 4:
            return [t * 255, 0, value * 255];
        default:
            return [value * 255, 0, q * 255];
    }
}
