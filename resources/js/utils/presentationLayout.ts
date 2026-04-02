/**
 * Shared presentation layout constants and helpers.
 * Keep measuring markup (TextPaginator) and SplitViewReader visually aligned.
 */
export const PRES_BODY_LEADING_CLASS = 'leading-[1.55]';

/** CSS class for Coptic script text — applies local Coptic fonts */
export const COPTIC_FONT_CLASS = 'pres-coptic-text';

/** CSS class for Arabic reading text — applies Amiri/reading fonts */
export const ARABIC_FONT_CLASS = 'pres-arabic-text';

/** Matches SplitViewReader vertical spacing between row blocks (`space-y-3`). */
export const PRES_ROW_BLOCK_STACK_GAP_PX = 12;

export type MultiColumnMode = 'single' | 'dual' | 'triple';

/** 
 * Calculates extra height added when the speaker changes (e.g., 'Priest' to 'People'). 
 * Reduced to optimize screen usage for more text content.
 */
export function speakerBlockExtraPx(fontSizePx: number): number {
    // Reduced from fontSizePx * 1.12 to fontSizePx * 0.85
    return Math.round(Math.min(40, Math.max(20, fontSizePx * 0.85)));
}

/** 
 * Final height limit for a page: Target Budget + Tolerance. 
 * Allows some flexibility so we don't split single lines unnecessarily if they barely exceed the budget.
 */
export function paginationOverflowCeiling(budgetPx: number, tolerancePx: number): number {
    return budgetPx + tolerancePx;
}

/**
 * Calculates the extra height allowance before a page split is forced.
 * Aimed at maximizing screen real estate by allowing 8% overflow.
 */
export function paginationTolerancePx(budgetPx: number): number {
    // Reduced from 14% to 8% to keep content within safe visible limits
    // Minimum 16px, Maximum 56px
    return Math.min(56, Math.max(16, Math.round(budgetPx * 0.08)));
}

/**
 * Height reserved to account for line-height rounding, flex gaps, and safe padding.
 * Ensures that the rendered content stays strictly within the physical viewport.
 */
export function paginationVerticalReservePx(fontSizePx: number): number {
    // Reduced from fontSizePx * 0.42 + 6 to fontSizePx * 0.25 + 4 to maximize screen space
    return Math.max(8, Math.ceil(fontSizePx * 0.25) + 4);
}

/** Returns true if any of the lines contain native Coptic script */
export function linesHaveCopticScript(
    lines: { lang_type: string; text?: string | null }[]
): boolean {
    return lines.some(
        (l) =>
            l.lang_type === 'coptic' &&
            typeof l.text === 'string' &&
            l.text.trim().length > 0
    );
}

/**
 * Determines whether the layout should be Single (Arabic), 
 * Dual (Ar + CopAr), or Triple (Ar + CopAr + Coptic) column mode.
 */
export function resolveMultiColumnMode(
    hasCopticArabized: boolean,
    hasCopticScript: boolean
): MultiColumnMode {
    if (!hasCopticArabized) {
        return 'single';
    }
    if (!hasCopticScript) {
        return 'dual';
    }
    return 'triple';
}
