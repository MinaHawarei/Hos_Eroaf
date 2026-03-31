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
 * المسافة الإضافية لعرض المتحدث - تم تقليلها لاستغلال المساحة بشكل أفضل
 */
export function speakerBlockExtraPx(fontSizePx: number): number {
    // تم التخفيض من fontSizePx * 1.12 إلى fontSizePx * 0.85
    return Math.round(Math.min(40, Math.max(20, fontSizePx * 0.85)));
}

/** Upper bound for “still fits on this page” — budget plus flexible tolerance. */
export function paginationOverflowCeiling(budgetPx: number, tolerancePx: number): number {
    return budgetPx + tolerancePx;
}

/**
 * Extra height allowed when packing lines so we do not break pages early.
 * تم تقليل التسامح لاستغلال المساحة بشكل أفضل
 */
export function paginationTolerancePx(budgetPx: number): number {
    // تم التخفيض من budgetPx * 0.14 إلى budgetPx * 0.08
    // مع حد أدنى 16 وأقصى 56
    return Math.min(56, Math.max(16, Math.round(budgetPx * 0.08)));
}

/**
 * Reserve height from the measured slot so pagination stays inside the viewport
 * (line-height rounding, flex gaps, and safe padding).
 * تم تقليل الاحتياطي بشكل كبير لاستغلال المساحة
 */
export function paginationVerticalReservePx(fontSizePx: number): number {
    // تم التخفيض من fontSizePx * 0.42 + 6 إلى fontSizePx * 0.25 + 4
    return Math.max(8, Math.ceil(fontSizePx * 0.25) + 4);
}

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
