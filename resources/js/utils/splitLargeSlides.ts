import { TextPaginator } from './TextPaginator';
import { computeSlidePages } from './computeSlidePages';
import {
    resolveMultiColumnMode,
    paginationTolerancePx,
    paginationVerticalReservePx,
    paginationOverflowCeiling,
    speakerBlockExtraPx,
    PRES_ROW_BLOCK_STACK_GAP_PX,
} from './presentationLayout';

interface Line {
    id: number;
    lang_type: 'arabic' | 'coptic_arabized' | 'coptic';
    text: string;
    speaker?: string;
}

interface Slide {
    id: string;
    section_code: string;
    section_name: string;
    intonation_ar: string;
    title: string;
    lines: Line[];
    has_coptic: boolean;
}

// ✅ تأكد من تصدير هذه الواجهة
export interface SplitResult {
    slides: Slide[];
    totalOriginalSlides: number;
    totalSplitSlides: number;
    splitMap: Map<string, string[]>; // خريطة لتتبع العلاقة بين الشرائح الأصلية والمقسمة
}

/**
 * تقسيم الشرائح الكبيرة إلى شرائح متعددة
 */
export async function splitLargeSlides(
    slides: Slide[],
    maxHeightPx: number,
    fontSizePx: number,
    containerWidthPx: number,
    measureAdapter: any
): Promise<SplitResult> {
    const result: Slide[] = [];
    const splitMap = new Map<string, string[]>();
    let totalSplit = 0;

    for (const slide of slides) {
        const splitSlides = await splitSingleSlide(
            slide,
            maxHeightPx,
            fontSizePx,
            containerWidthPx,
            measureAdapter
        );

        result.push(...splitSlides);
        totalSplit += splitSlides.length;

        // تسجيل العلاقة بين الشريحة الأصلية والأجزاء
        splitMap.set(
            slide.id,
            splitSlides.map(s => s.id)
        );
    }

    return {
        slides: result,
        totalOriginalSlides: slides.length,
        totalSplitSlides: totalSplit,
        splitMap,
    };
}

/**
 * تقسيم شريحة واحدة إلى عدة شرائح باستخدام نفس منطق computeSlidePages
 */
async function splitSingleSlide(
    slide: Slide,
    maxHeightPx: number,
    fontSizePx: number,
    containerWidthPx: number,
    measureAdapter: any
): Promise<Slide[]> {
    // تحديد وضع الأعمدة
    const hasCopticScript = slide.lines.some(line => line.lang_type === 'coptic');
    const columnMode = resolveMultiColumnMode(slide.has_coptic, hasCopticScript);

    // استخدام نفس منطق computeSlidePages لتقسيم المحتوى
    const tolerance = paginationTolerancePx(maxHeightPx);
    const reserve = paginationVerticalReservePx(fontSizePx);
    const contentBudget = Math.max(64, maxHeightPx - reserve);
    const ceiling = paginationOverflowCeiling(contentBudget, tolerance);

    // دالة لتقسيم النص الطويل
    const splitLongParagraph = (text: string, maxHeight: number): string[] => {
        return splitTextByHeight(text, maxHeight, measureAdapter);
    };

    // استخدام computeSlidePages الأصلي للحصول على الصفحات
    const pages = computeSlidePages(
        slide.lines,
        columnMode,
        maxHeightPx,
        tolerance,
        fontSizePx,
        measureAdapter,
        splitLongParagraph
    );

    // إذا كانت الشريحة تحتاج لأكثر من صفحة
    if (pages.length <= 1) {
        return [slide];
    }

    // إنشاء شرائح جديدة من الصفحات
    const splitSlides: Slide[] = [];

    pages.forEach((pageLines, index) => {
        // إنشاء ID فريد للجزء
        const partNumber = index + 1;
        const newSlideId = `${slide.id}_p${partNumber}`;

        // إنشاء الشريحة الجديدة
        const newSlide: Slide = {
            ...slide,
            id: newSlideId,
            lines: pageLines,
            title: pages.length > 1 && partNumber > 1
                ? `${slide.title} (${partNumber}/${pages.length})`
                : slide.title,
        };

        splitSlides.push(newSlide);
    });

    return splitSlides;
}

/**
 * تقسيم النص حسب الارتفاع المحدد
 */
function splitTextByHeight(
    text: string,
    maxHeightPx: number,
    measureAdapter: any
): string[] {
    if (!text || text.trim().length === 0) {
        return [text];
    }

    // تقسيم النص إلى كلمات (مع مراعاة اللغة العربية)
    const words = text.split(/\s+/);
    const parts: string[] = [];
    let currentPart = '';
    let currentHeight = 0;

    for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const testPart = currentPart ? `${currentPart} ${word}` : word;
        const testHeight = measureAdapter.arabicParagraph(testPart);

        if (testHeight > maxHeightPx && currentPart) {
            // الكلمة الحالية لا تتسع، احفظ الجزء الحالي وابدأ جزء جديد
            parts.push(currentPart);
            currentPart = word;
            currentHeight = measureAdapter.arabicParagraph(word);
        } else {
            // الكلمة تتسع، أضفها للجزء الحالي
            currentPart = testPart;
            currentHeight = testHeight;
        }
    }

    // أضف آخر جزء
    if (currentPart) {
        parts.push(currentPart);
    }

    // إذا لم يتم التقسيم، أرجع النص الأصلي
    return parts.length > 0 ? parts : [text];
}

/**
 * حساب الارتفاع الإجمالي للشريحة قبل التقسيم (للتقييم)
 */
export async function estimateSlideHeight(
    slide: Slide,
    fontSizePx: number,
    containerWidthPx: number,
    measureAdapter: any
): Promise<number> {
    const hasCopticScript = slide.lines.some(line => line.lang_type === 'coptic');
    const columnMode = resolveMultiColumnMode(slide.has_coptic, hasCopticScript);

    let totalHeight = 0;
    const speakerExtra = speakerBlockExtraPx(fontSizePx);
    const lineGap = PRES_ROW_BLOCK_STACK_GAP_PX;

    if (columnMode === 'single') {
        // حساب ارتفاع كل سطر في الوضع العادي
        for (let i = 0; i < slide.lines.length; i++) {
            const line = slide.lines[i];
            const prevLine = i > 0 ? slide.lines[i - 1] : null;
            const speakerChanged = line.speaker && line.speaker !== prevLine?.speaker;

            let lineHeight = measureAdapter.arabicParagraph(line.text);
            if (speakerChanged) {
                lineHeight += speakerExtra;
            }

            totalHeight += lineHeight;
            if (i < slide.lines.length - 1) {
                totalHeight += lineGap;
            }
        }
    } else {
        // حساب ارتفاع الأعمدة المتعددة
        const arabicLines = slide.lines.filter(l => l.lang_type === 'arabic');
        const arcopticLines = slide.lines.filter(l => l.lang_type === 'coptic_arabized');
        const copticLines = slide.lines.filter(l => l.lang_type === 'coptic');
        const maxRows = Math.max(arabicLines.length, arcopticLines.length, copticLines.length);
        const isTriple = columnMode === 'triple';

        for (let i = 0; i < maxRows; i++) {
            const ar = arabicLines[i];
            const copAr = arcopticLines[i];
            const cop = isTriple ? copticLines[i] : null;

            const arText = ar?.text || '';
            const copArText = copAr?.text || '';
            const copText = cop?.text || '';

            let rowHeight = isTriple && copText
                ? measureAdapter.tripleRow(arText, copArText, copText)
                : measureAdapter.dualRow(arText, copArText);

            const prevAr = i > 0 ? arabicLines[i - 1] : null;
            const speakerChanged = ar?.speaker && ar.speaker !== prevAr?.speaker;
            if (speakerChanged) {
                rowHeight += speakerExtra;
            }

            totalHeight += rowHeight;
            if (i < maxRows - 1) {
                totalHeight += lineGap;
            }
        }
    }

    return totalHeight;
}

/**
 * التحقق مما إذا كانت الشريحة بحاجة للتقسيم
 */
export async function needsSplitting(
    slide: Slide,
    maxHeightPx: number,
    fontSizePx: number,
    containerWidthPx: number,
    measureAdapter: any
): Promise<boolean> {
    const estimatedHeight = await estimateSlideHeight(
        slide,
        fontSizePx,
        containerWidthPx,
        measureAdapter
    );

    const tolerance = paginationTolerancePx(maxHeightPx);
    return estimatedHeight > maxHeightPx + tolerance;
}

/**
 * دالة مساعدة لدمج الشرائح المقسمة (في حالة الحاجة للتراجع)
 */
export function mergeSlides(slides: Slide[], splitMap: Map<string, string[]>): Slide[] {
    const merged: Slide[] = [];
    const processed = new Set<string>();

    for (const slide of slides) {
        // البحث عن الشريحة الأصلية
        let originalId = slide.id;
        let isPart = false;

        for (const [original, parts] of splitMap.entries()) {
            if (parts.includes(slide.id)) {
                originalId = original;
                isPart = true;
                break;
            }
        }

        if (!isPart && !processed.has(slide.id)) {
            merged.push(slide);
            processed.add(slide.id);
        } else if (isPart && !processed.has(originalId)) {
            // جمع جميع أجزاء الشريحة الأصلية
            const originalSlide = slides.find(s => s.id === originalId);
            if (originalSlide) {
                merged.push(originalSlide);
                processed.add(originalId);
            }
        }
    }

    return merged;
}
