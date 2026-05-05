// Internal helper to create the color function
const c = (hex) => {
    return (alpha) => {
        // 1. If no alpha passed (or 1), return the original Hex for performance
        if (alpha === undefined || alpha === 1) return hex;

        // 2. Clean up hex
        let cleanHex = hex.replace('#', '');

        // 3. Handle shorthand "#ABC" -> "#AABBCC"
        if (cleanHex.length === 3) {
            cleanHex = cleanHex.split('').map(char => char + char).join('');
        }

        // 4. Parse RGB
        const r = parseInt(cleanHex.substring(0, 2), 16);
        const g = parseInt(cleanHex.substring(2, 4), 16);
        const b = parseInt(cleanHex.substring(4, 6), 16);

        // 5. Return RGBA
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };
};

export class Colors {
    // Usage: 
    // color = Colors.red()      -> Solid "#c00e0e"
    // color = Colors.red(0.5)   -> Transparent "rgba(192, 14, 14, 0.5)"

    // =========================================
    // REDS
    // =========================================
    static red = c("#c00e0e");
    static red_dark = c("#692121");
    static red_crimson = c("#FF1744");
    static red_crimson_dark = c("#B71C1C");
    static red_tomato = c("#FF6347");
    static red_tomato_dark = c("#BF360C");
    static red_maroon = c("#D32F2F");
    static red_maroon_dark = c("#8B0000");

    // =========================================
    // PINKS
    // =========================================
    static pink = c("#FF4081");
    static pink_dark = c("#C51162");
    static pink_rose = c("#F50057");
    static pink_rose_dark = c("#880E4F");

    // =========================================
    // ORANGES
    // =========================================
    static orange = c("#FF6E40");
    static orange_dark = c("#D84315");
    static orange_coral = c("#FF7F50");
    static orange_coral_dark = c("#BF360C");
    static orange_pumpkin = c("#FF9800");
    static orange_pumpkin_dark = c("#E65100");

    // =========================================
    // YELLOWS & GOLDS
    // =========================================
    static yellow = c("#FFD740");
    static yellow_dark = c("#FF8F00");
    static yellow_gold = c("#FFC107");
    static yellow_gold_dark = c("#FF6F00");
    static yellow_amber = c("#FFAB00");
    static yellow_amber_dark = c("#FF6F00");

    // =========================================
    // GREENS
    // =========================================
    static green = c("#08941d");
    static green_dark = c("#055b0b");
    static green_neon = c("#39FF14");  // Pure Neon
    static green_neon_dark = c("#0F4C05");
    static green_tech = c("#00FF41");  // Phosphor Green
    static green_tech_dark = c("#003B00");
    static green_acid = c("#CCFF00");  // High-Vis Yellow-Green
    static green_acid_dark = c("#485A00");
    static green_jade = c("#00BFA5");  // Deep Teal-Green
    static green_jade_dark = c("#004D40");
    static green_matcha = c("#98FB98");  // Soft Pale Green
    static green_matcha_dark = c("#2E7D32");
    static green_fern = c("#43A047");  // Standard Pleasant Green
    static green_fern_dark = c("#1B5E20");

    // =========================================
    // CYANS
    // =========================================
    static cyan = c("#00E5FF");
    static cyan_dark = c("#0097A7");
    static cyan_teal = c("#1DE9B6");
    static cyan_teal_dark = c("#00695C");
    static cyan_aqua = c("#00B0FF");
    static cyan_aqua_dark = c("#01579B");

    // =========================================
    // BLUES
    // =========================================
    static blue = c("#2979FF");
    static blue_dark = c("#0D47A1");
    static blue_sky = c("#40C4FF");
    static blue_sky_dark = c("#0277BD");
    static blue_indigo = c("#3D5AFE");
    static blue_indigo_dark = c("#1A237E");
    static blue_navy = c("#304FFE");
    static blue_navy_dark = c("#000051");
    static blue_royal = c("#651FFF");
    static blue_royal_dark = c("#311B92");

    // =========================================
    // PURPLES
    // =========================================
    static purple = c("#9C27B0");
    static purple_dark = c("#4A148C");
    static purple_magenta = c("#E040FB");
    static purple_magenta_dark = c("#AA00FF");
    static purple_violet = c("#7C4DFF");
    static purple_violet_dark = c("#311B92");
    static purple_lavender = c("#B388FF");
    static purple_lavender_dark = c("#512DA8");

    // =========================================
    // BROWNS & NEUTRALS
    // =========================================
    static brown = c("#8D6E63");
    static brown_dark = c("#4E342E");
    static gray = c("#E0E0E0");
    static gray_dark = c("#424242");
    static gray_white = c("#FFFFFF");
    static gray_white_dark = c("#B0BEC5");
    static gray_slate = c("#90A4AE");
    static gray_slate_dark = c("#455A64");
    static gray_charcoal = c("#616161");
    static gray_charcoal_dark = c("#212121");
}