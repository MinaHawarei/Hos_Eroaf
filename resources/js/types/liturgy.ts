// AlternativeItem كما يجيء من الـ backend في الـ sections
export interface AlternativeItem {
    label: string;
    title: string;
    style: number;
    content: any[];
}

// AlternativeItem كما يجيء في الـ slides (بعد تحويل الـ Controller)
export interface SlideAlternativeItem {
    label: string;
    title: string;
    lines: any[];
    has_coptic: boolean;
}

export interface RegularSection {
    id: string;
    code: string;
    name_ar: string;
    title: string;
    style: number;
    has_alternatives: false;
    content: any[];
    readings?: any[]; // For compatibility with Controller transformation
}

export interface AlternativeSection {
    id: string;
    code: string;
    name_ar: string;
    title: string;
    style: number;
    has_alternatives: true;
    active_index: number;
    alternatives: AlternativeItem[];
}

export type LiturgySection = RegularSection | AlternativeSection;

// نوع خاص بالـ Slide اللي فيها alternatives (بعد تحويل الـ Controller)
export interface SlideAlternativeSection {
    id: string;
    section_code: string;
    section_name: string;
    has_alternatives: true;
    active_index: number;
    alternatives: SlideAlternativeItem[];
}
