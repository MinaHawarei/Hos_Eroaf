/**
 * Shared presentation layout constants and helpers.
 * Keep measuring markup (TextPaginator) and SplitViewReader visually aligned.
 */
export const PRES_BODY_LEADING_CLASS = 'leading-[1.55]';

/** Matches SplitViewReader vertical spacing between row blocks (`space-y-3`). */
export const PRES_ROW_BLOCK_STACK_GAP_PX = 12;

export type MultiColumnMode = 'single' | 'dual' | 'triple';

export function speakerBlockExtraPx(fontSizePx: number): number {
    return Math.round(Math.min(48, Math.max(26, fontSizePx * 1.12)));
}

/** Upper bound for “still fits on this page” — budget plus flexible tolerance. */
export function paginationOverflowCeiling(budgetPx: number, tolerancePx: number): number {
    return budgetPx + tolerancePx;
}

/**
 * Extra height allowed when packing lines so we do not break pages early.
 * Scales with viewport/font changes (budget is the measured slot height).
 */
export function paginationTolerancePx(budgetPx: number): number {
    return Math.min(88, Math.max(28, Math.round(budgetPx * 0.14)));
}

/**
 * Reserve height from the measured slot so pagination stays inside the viewport
 * (line-height rounding, flex gaps, and safe padding).
 */
export function paginationVerticalReservePx(fontSizePx: number): number {
    return Math.max(10, Math.ceil(fontSizePx * 0.42) + 6);
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
