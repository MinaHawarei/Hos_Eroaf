<?php

namespace Database\Seeders;

use App\Models\Reading;
use App\Models\ReadingDay;
use App\Models\ReadingLine;
use App\Models\ReadingSection;
use App\Models\Setting;
use App\Services\ReadingResolverService;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

/**
 * Seeds sample liturgical readings for development and testing.
 *
 * Creates:
 * - 6 reading sections (standard Coptic liturgy order)
 * - 1 sample reading day (today's date)
 * - Sample readings with Arabic + Coptic-arabized lines
 * - Default app settings
 */
class ReadingsSeeder extends Seeder
{
    public function run(): void
    {
        // ========================================
        // 1. Reading Sections
        // ========================================
        $sections = [
            ['code' => 'vespers_psalm',  'name_ar' => 'مزمور عشية',        'order' => 1],
            ['code' => 'vespers_gospel', 'name_ar' => 'إنجيل عشية',        'order' => 2],
            ['code' => 'matins_psalm',   'name_ar' => 'مزمور باكر',         'order' => 3],
            ['code' => 'matins_gospel',  'name_ar' => 'إنجيل باكر',         'order' => 4],
            ['code' => 'pauline',        'name_ar' => 'البولس',             'order' => 5],
            ['code' => 'catholic',       'name_ar' => 'الكاثوليكون',        'order' => 6],
            ['code' => 'praxis',         'name_ar' => 'الإبركسيس',          'order' => 7],
            ['code' => 'synaxarium',     'name_ar' => 'السنكسار',           'order' => 8],
            ['code' => 'liturgy_psalm',  'name_ar' => 'مزمور القداس',       'order' => 9],
            ['code' => 'liturgy_gospel', 'name_ar' => 'إنجيل القداس',       'order' => 10],
        ];

        foreach ($sections as $section) {
            ReadingSection::updateOrCreate(
                ['code' => $section['code']],
                $section,
            );
        }

        // ========================================
        // 2. Sample Reading Day — today
        // ========================================
        $today = Carbon::today();
        $resolver = new ReadingResolverService();
        [$copticDay, $copticMonth, $copticYear] = $resolver->gregorianToCoptic($today);
        $season = $resolver->determineSeason($today, $copticDay, $copticMonth);

        $readingDay = ReadingDay::updateOrCreate(
            ['date_key' => $today->format('Y-m-d')],
            [
                'season' => $season,
                'coptic_day' => $copticDay,
                'coptic_month' => $copticMonth,
                'coptic_year' => $copticYear,
                'notes' => 'بيانات تجريبية للتطوير',
            ],
        );

        // ========================================
        // 3. Sample Readings
        // ========================================

        // --- Pauline: Romans 8:14-27 (sample) ---
        $paulineSection = ReadingSection::where('code', 'pauline')->first();
        $pauline = Reading::updateOrCreate(
            ['reading_day_id' => $readingDay->id, 'section_id' => $paulineSection->id],
            ['title_ar' => 'رسالة بولس الرسول إلى أهل رومية (ص 8: 14-27)'],
        );

        $this->seedLines($pauline, [
            ['arabic', 'لأَنَّ كُلَّ الَّذِينَ يَنْقَادُونَ بِرُوحِ اللهِ، فَأُولئِكَ هُمْ أَبْنَاءُ اللهِ.'],
            ['arabic', 'إِذْ لَمْ تَأْخُذُوا رُوحَ الْعُبُودِيَّةِ أَيْضًا لِلْخَوْفِ، بَلْ أَخَذْتُمْ رُوحَ التَّبَنِّي الَّذِي بِهِ نَصْرُخُ: يَا أَبَا الآبُ.'],
            ['arabic', 'اَلرُّوحُ نَفْسُهُ أَيْضًا يَشْهَدُ لأَرْوَاحِنَا أَنَّنَا أَوْلاَدُ اللهِ.'],
            ['arabic', 'فَإِنْ كُنَّا أَوْلاَدًا فَإِنَّنَا وَرَثَةٌ أَيْضًا، وَرَثَةُ اللهِ وَوَارِثُونَ مَعَ الْمَسِيحِ.'],
            ['arabic', 'إِنْ كُنَّا نَتَأَلَّمُ مَعَهُ لِكَيْ نَتَمَجَّدَ أَيْضًا مَعَهُ.'],
            ['arabic', 'فَإِنِّي أَحْسِبُ أَنَّ آلاَمَ الزَّمَانِ الْحَاضِرِ لاَ تُقَاسُ بِالْمَجْدِ الْعَتِيدِ أَنْ يُسْتَعْلَنَ فِينَا.'],
        ]);

        // --- Catholic: 1 John 4:7-16 (sample) ---
        $catholicSection = ReadingSection::where('code', 'catholic')->first();
        $catholic = Reading::updateOrCreate(
            ['reading_day_id' => $readingDay->id, 'section_id' => $catholicSection->id],
            ['title_ar' => 'رسالة يوحنا الأولى (ص 4: 7-16)'],
        );

        $this->seedLines($catholic, [
            ['arabic', 'أَيُّهَا الأَحِبَّاءُ، لِنُحِبَّ بَعْضُنَا بَعْضًا، لأَنَّ الْمَحَبَّةَ هِيَ مِنَ اللهِ.'],
            ['arabic', 'وَكُلُّ مَنْ يُحِبُّ فَقَدْ وُلِدَ مِنَ اللهِ وَيَعْرِفُ اللهَ.'],
            ['arabic', 'وَمَنْ لاَ يُحِبُّ لَمْ يَعْرِفِ اللهَ، لأَنَّ اللهَ مَحَبَّةٌ.'],
            ['arabic', 'بِهذَا أُظْهِرَتْ مَحَبَّةُ اللهِ فِينَا: أَنَّ اللهَ قَدْ أَرْسَلَ ابْنَهُ الْوَحِيدَ إِلَى الْعَالَمِ لِكَيْ نَحْيَا بِهِ.'],
        ]);

        // --- Praxis: Acts 2:42-47 (sample) ---
        $praxisSection = ReadingSection::where('code', 'praxis')->first();
        $praxis = Reading::updateOrCreate(
            ['reading_day_id' => $readingDay->id, 'section_id' => $praxisSection->id],
            ['title_ar' => 'الإبركسيس فصل من أعمال الرسل (ص 2: 42-47)'],
        );

        $this->seedLines($praxis, [
            ['arabic', 'وَكَانُوا يُواظِبُونَ عَلَى تَعْلِيمِ الرُّسُلِ، وَالشَّرِكَةِ، وَكَسْرِ الْخُبْزِ، وَالصَّلَوَاتِ.'],
            ['arabic', 'وَصَارَ خَوْفٌ فِي كُلِّ نَفْسٍ. وَكَانَتْ عَجَائِبُ وَآيَاتٌ كَثِيرَةٌ تُجْرَى عَلَى أَيْدِي الرُّسُلِ.'],
            ['arabic', 'وَجَمِيعُ الَّذِينَ آمَنُوا كَانُوا مَعًا، وَكَانَ عِنْدَهُمْ كُلُّ شَيْءٍ مُشْتَرَكًا.'],
        ]);

        // --- Liturgy Psalm: Psalm 23 (sample) ---
        $psalmSection = ReadingSection::where('code', 'liturgy_psalm')->first();
        $psalm = Reading::updateOrCreate(
            ['reading_day_id' => $readingDay->id, 'section_id' => $psalmSection->id],
            ['title_ar' => 'من مزامير أبينا داود النبي (مز 23)'],
        );

        $this->seedLines($psalm, [
            ['arabic', 'الرَّبُّ رَاعِيَّ فَلاَ يُعْوِزُنِي شَيْءٌ.'],
            ['arabic', 'فِي مَرَاعٍ خُضْرٍ يُرْبِضُنِي. إِلَى مِيَاهِ الرَّاحَةِ يُورِدُنِي.'],
            ['arabic', 'يَرُدُّ نَفْسِي. يَهْدِينِي إِلَى سُبُلِ الْبِرِّ مِنْ أَجْلِ اسْمِهِ.'],
            ['arabic', 'أَيْضًا إِذَا سِرْتُ فِي وَادِي ظِلِّ الْمَوْتِ لاَ أَخَافُ شَرًّا، لأَنَّكَ أَنْتَ مَعِي.'],
            ['coptic_arabized', 'ابشويس ناماني مبي إن شاات ناي.'],
            ['coptic_arabized', 'خين أوماو إنخلوي أفتشيرو إيت. هيجين أوموو إنتي إمتون أفتشيرو إيت.'],
        ]);

        // --- Liturgy Gospel: Matthew 5:1-12 (sample) ---
        $gospelSection = ReadingSection::where('code', 'liturgy_gospel')->first();
        $gospel = Reading::updateOrCreate(
            ['reading_day_id' => $readingDay->id, 'section_id' => $gospelSection->id],
            ['title_ar' => 'من إنجيل معلمنا متى البشير (ص 5: 1-12)'],
        );

        $this->seedLines($gospel, [
            ['arabic', 'وَلَمَّا رَأَى الْجُمُوعَ صَعِدَ إِلَى الْجَبَلِ، فَلَمَّا جَلَسَ تَقَدَّمَ إِلَيْهِ تَلاَمِيذُهُ.'],
            ['arabic', 'فَفَتَحَ فَاهُ وَعَلَّمَهُمْ قَائِلاً:'],
            ['arabic', 'طُوبَى لِلْمَسَاكِينِ بِالرُّوحِ، لأَنَّ لَهُمْ مَلَكُوتَ السَّمَاوَاتِ.'],
            ['arabic', 'طُوبَى لِلْحَزَانَى، لأَنَّهُمْ يَتَعَزَّوْنَ.'],
            ['arabic', 'طُوبَى لِلْوُدَعَاءِ، لأَنَّهُمْ يَرِثُونَ الأَرْضَ.'],
            ['arabic', 'طُوبَى لِلْجِيَاعِ وَالْعِطَاشِ إِلَى الْبِرِّ، لأَنَّهُمْ يُشْبَعُونَ.'],
            ['arabic', 'طُوبَى لِلرُّحَمَاءِ، لأَنَّهُمْ يُرْحَمُونَ.'],
            ['arabic', 'طُوبَى لِلأَنْقِيَاءِ الْقَلْبِ، لأَنَّهُمْ يُعَايِنُونَ اللهَ.'],
            ['coptic_arabized', 'أووو ناف إنجي نيمي إش إتإيرينيي جي إنتووأو نيي إنشيري إنتي إفنوتي.'],
            ['coptic_arabized', 'أووو ناف إنجي نيي إيتاف أرجوجت ناف إيثبي إتي ميثمي جي ثيو تي إنتي نيفيأوي.'],
        ]);

        // ========================================
        // 4. Default Settings
        // ========================================
        Setting::setValue('readings_version', '1.0.0-sample');
        Setting::setValue('last_content_update', now()->toDateTimeString());
        Setting::setValue('app_version', '1.0.0');
    }

    /**
     * Seed reading lines with automatic normalization.
     *
     * @param Reading $reading
     * @param array<array{0: string, 1: string}> $lines  Each: [lang_type, text]
     */
    private function seedLines(Reading $reading, array $lines): void
    {
        // Delete existing lines to avoid duplicates on re-seed
        $reading->lines()->delete();

        foreach ($lines as $index => [$langType, $text]) {
            ReadingLine::create([
                'reading_id' => $reading->id,
                'lang_type' => $langType,
                'line_order' => $index + 1,
                'text' => $text,
                'normalized_text' => $this->normalizeArabic($text),
            ]);
        }
    }

    /**
     * Normalize Arabic text for STT matching:
     * - Remove tashkeel (diacritics)
     * - Unify hamza variants → ا
     * - Unify taa marbuta → ه
     * - Unify alef variants
     * - Remove punctuation
     * - Collapse whitespace
     */
    private function normalizeArabic(string $text): string
    {
        // Remove Arabic diacritics (tashkeel): fathatan, dammatan, kasratan,
        // fatha, damma, kasra, shadda, sukun, etc.
        $text = preg_replace('/[\x{064B}-\x{065F}\x{0670}]/u', '', $text);

        // Unify hamza variants → ا
        $text = preg_replace('/[إأآ]/u', 'ا', $text);

        // Unify ya variants
        $text = str_replace('ى', 'ي', $text);

        // Unify taa marbuta → ه
        $text = str_replace('ة', 'ه', $text);

        // Remove Arabic-specific punctuation and common punctuation
        $text = preg_replace('/[،؛؟\.,:;!?\-\(\)\[\]«»"\']/u', '', $text);

        // Collapse whitespace
        $text = preg_replace('/\s+/u', ' ', $text);

        return trim($text);
    }
}
