export class PixelBuffer {
    constructor(width, height, data) {
        this.width = width;
        this.height = height;
        this.length = width * height;
        this.data = data || new Uint8ClampedArray(width * height * 4);
    }
    
    /*
    static createBlank(width, height, colorHex = "#000000") {
        let hex = colorHex.replace(/^#/, '');
        if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');

        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        const a = hex.length === 8 ? parseInt(hex.substring(6, 8), 16) : 255;

        const data = new Uint8ClampedArray(width * height * 4);

        if (r !== 0 || g !== 0 || b !== 0 || a !== 0) {
            for (let i = 0; i < data.length; i += 4) {
                data[i] = r;
                data[i + 1] = g;
                data[i + 2] = b;
                data[i + 3] = a;
            }
        }

        return new PixelBuffer(width, height, data);
    }
        */

    copy() {
        return new PixelBuffer(this.width, this.height, new Uint8ClampedArray(this.data));
    }

    getPixel(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return { r: 0, g: 0, b: 0, a: 0 };
        }

        // The Math: (Row * Width + Column) * 4 channels
        const i = (y * this.width + x) * 4;

        return {
            r: this.data[i],
            g: this.data[i + 1],
            b: this.data[i + 2],
            a: this.data[i + 3]
        };
    }
    setPixel(x, y, r, g, b, a = 255) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return;
        }
        const i = (y * this.width + x) * 4;
        this.data[i] = r;
        this.data[i + 1] = g;
        this.data[i + 2] = b;
        this.data[i + 3] = a;
    }

    getPixelByIndex(index){
        if (index < 0 || index >= this.width * this.height) {
            return { r: 0, g: 0, b: 0, a: 0 };
        }
        const i = index * 4;
        return {
            r: this.data[i],
            g: this.data[i + 1],
            b: this.data[i + 2],
            a: this.data[i + 3]
        };
    }
    setPixelByIndex(index, r, g, b, a = 255){
        if (index < 0 || index >= this.width * this.height) {
            return;
        }
        const i = index * 4;
        this.data[i] = r;
        this.data[i + 1] = g;
        this.data[i + 2] = b;
        this.data[i + 3] = a;
    }

    getPixelIndex(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return -1;
        }
        return (y * this.width + x) * 4;
    }
}