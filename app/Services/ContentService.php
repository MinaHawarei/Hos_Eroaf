<?php

namespace App\Services;

use Illuminate\Support\Facades\Storage;

class ContentService
{
    public function getByDayIndex(int $day): ?array
    {
        $file = str_pad($day, 3, '0', STR_PAD_LEFT);
        $path = base_path("storage/content/lectionary/{$file}.json");
        if (!file_exists($path)) {
            return null;
        }
        return json_decode(file_get_contents($path), true);

    }

    public function getLectionary(string|int $day): ?array
    {
        $file = str_pad($day, 3, '0', STR_PAD_LEFT);
        $path = base_path("storage/content/lectionary/{$file}.json");
        if (!file_exists($path)) {
            return null;
        }
        return json_decode(file_get_contents($path), true);
    }

    private function getLectionarySections($day, $requiredSections = [], $variables = [])
    {
        $file = str_pad($day, 3, '0', STR_PAD_LEFT) . '.json';
        $path = base_path("storage/content/lectionary/{$file}");

        if (!file_exists($path)) return [];

        $data = json_decode(file_get_contents($path), true);
        if (!$data) return [];

        $result = [];

        foreach ($requiredSections as $sectionKey) {

            if (!isset($data[$sectionKey])) continue;

            foreach ($data[$sectionKey] as $item) {

                $content = [
                    [
                        "speaker" => "", // أو "القارئ"
                        "text_ar" => $item['text_ar'] ?? [],
                        "text_ar_co" => $item['text_ar_co'] ?? [],
                        "text_co" => $item['text_co'] ?? [],
                    ]
                ];

                $result[] = [
                    "title" => $item['title_ar'] ?? $sectionKey,
                    "style" => $data['style'] ?? 1,
                    "has_alternatives" => false,

                    // 👇 الجديد
                    "intonation" => $item['intonation'] ?? null,
                    "conclusion" => $item['conclusion'] ?? null,

                    "content" => $content
                ];
            }
        }

        return $result;
    }

    /**
     * دالة دمج ملفات القداس بتنسيق مرقم
     */

    public function oldgetLiturgy($data): ?array
    {
        $day = $data['dayKey'];
        $dayName = $data['dayName'];
        $season = $data['season'];


        $file = str_pad($day, 3, '0', STR_PAD_LEFT) . '.json';
        $FastingDays = ['الأربعاء', 'الجمعة'];
        $FastingSeasons = ['apostles_fast', 'nativity_fast', 'jonah_fast', 'great_lent'];
        // قائمة الملفات بالترتيب الذي تريده
        /*
        $fileConfigs = [
            "ellison_emas" =>'ellison emas',
            "our_father" => [
                ['file' => 'ابانا الذي في السموات', 'label' => 'النسخة الأولى'],
                ['file' => 'ابانا النسخة الثانية',  'label' => 'النسخة الثانية'],
                ['file' => 'ابانا النسخة الثانية',  'label' => 'النسخة الثالثة'],
                ['file' => 'ابانا النسخة الثانية',  'label' => 'النسخة الرابعة'],
            ],
            "aliloia_fay_be" =>[

                ['file' => 'الهيتنيات', 'label' => 'الهيتنيات'],
                ['file' => 'الهيتنيات مجمعة',  'label' => 'الهيتنيات مجمعة'],

            ],
            "oshit_alabaa" =>'اوشية الاباء',
        ];
        */
         $fileConfigs = [
            "magdan_w_ekraman" =>'مجدا و اكراما',
            "aliloia_fay_be" =>'الليلويا فاي بي',
            "kean_evran"=>'رشومات الحمل',
            "Salat_AlShoakr"=>'صلاة الشكر',
            "sotis_amin"=>'سوتيس امين',
            "tahlil_alkhodam"=>'تحليل الخدام',
            "ne_saviv"=>'ني صافيف',
            "te_shory"=>'تي شوري',
            "hetaniat"=>'الهيتنيات',
            "pauline" => ['type' => 'lectionary'],
        ];


        $isGreatLentSunday = ($season === 'great_lent' && $dayName === 'الأحد');

        $isRegularFastingDay = in_array($season, $FastingSeasons)
                            && in_array($dayName, $FastingDays)
                            && $season !== 'pentecost';

        if ($isGreatLentSunday || $isRegularFastingDay) {
            $fileConfigs["aliloia_fay_be"] = 'الليلويا جي افمفئي';

        }else if( in_array($season , $FastingSeasons)){
            $fileConfigs["aliloia_fay_be"] = 'الليلويا إي إ';
        }

        $variables = $data;
        unset($variables['dayKey'], $variables['dayName'], $variables['season']);

        $combinedData = [];
        $counter = 1;

        foreach ($fileConfigs as $configKey => $entry) {
            if (is_array($entry)) {
                // ✅ Case: Alternatives
                $alternativesArr = [];
                $mainTitle = '';
                $mainStyle = 1;

                foreach ($entry as $altConfig) {
                    $fileName = $altConfig['file'];
                    $label = $altConfig['label'];
                    $path = base_path("storage/content/liturgy/{$fileName}.json");

                    if (file_exists($path)) {
                        $fileContent = json_decode(file_get_contents($path), true);
                        if ($fileContent) {
                            $processedContent = $this->replaceVariables($fileContent['content'] ?? [], $variables);
                            $altData = [
                                "label"   => $label,
                                "title"   => $fileContent['title'] ?? '',
                                "style"   => $fileContent['style'] ?? 1,
                                "content" => $processedContent ?? []
                            ];
                            $alternativesArr[] = $altData;

                            if (empty($mainTitle)) {
                                $mainTitle = $altData['title'];
                                $mainStyle = $altData['style'];
                            }
                        }
                    }
                }

                if (!empty($alternativesArr)) {
                    $newKey = "{$counter}_{$configKey}";
                    $combinedData[$newKey] = [
                        "title"            => $mainTitle,
                        "style"            => $mainStyle,
                        "has_alternatives" => true,
                        "active_index"     => 0,
                        "alternatives"     => $alternativesArr
                    ];
                    $counter++;
                }

            } else {
                // ✅ Case: Single file string
                $fileName = $entry;
                $path = base_path("storage/content/liturgy/{$fileName}.json");

                if (file_exists($path)) {
                    $fileContent = json_decode(file_get_contents($path), true);

                    if ($fileContent) {
                        $processedContent = $this->replaceVariables(
                            $fileContent['content'] ?? [],
                            $variables
                        );
                        $slug = $fileContent['code'] ?? $configKey;
                        $newKey = "{$counter}_{$slug}";

                        $combinedData[$newKey] = [
                            "title"            => $fileContent['title'] ?? '',
                            "style"            => $fileContent['style'] ?? 1,
                            "has_alternatives" => false,
                            "content"          => $processedContent ?? []
                        ];

                        $counter++;
                    }
                }
            }
        }

        //$lectionaryData = $this->getLectionary($day, $variables);
        //$combinedData = array_merge($combinedData, $lectionaryData);

        return !empty($combinedData) ? $combinedData : null;
    }
    public function getLiturgy($data): ?array
    {
        $day = $data['dayKey'];
        $dayName = $data['dayName'];
        $season = $data['season'];

        $FastingDays = ['الأربعاء', 'الجمعة'];
        $FastingSeasons = ['apostles_fast', 'nativity_fast', 'jonah_fast', 'great_lent'];

        // ✅ الترتيب النهائي (فيه liturgy + lectionary)
        $fileConfigs = [
            "magdan_w_ekraman" =>'مجدا و اكراما',
            "aliloia_fay_be" =>'الليلويا فاي بي',
            "kean_evran"=>'رشومات الحمل',
            "esbatir_agious"=>[
                ['file' => 'اسباتير اجيوس', 'label' => 'اسباتير اجيوس'],
                ['file' => 'اسباتير الكبيرة',  'label' => 'اسباتير الكبيرة'],
            ],
            "Salat_AlShoakr"=>'صلاة الشكر - حضور الاسقف',
            "sotis_amin"=>'سوتيس امين',
            "ne_saviv"=>'ني صافيف',
            "naiv_santy"=>'نيف سنتي',
            "tahlil_alkhodam"=>'تحليل الخدام',
            "te_shory"=>'تي شوري',
            "hetaniat" =>[
                ['file' => 'الهيتنيات', 'label' => 'الهيتنيات'],
                ['file' => 'الهيتنيات مجمعة',  'label' => 'الهيتنيات مجمعة'],
            ],
            "be_ehmot_ghar"=>'بي اهموت غار الصغير',
            "pauline" => ['type' => 'lectionary'],
            "catholic" => ['type' => 'lectionary'],
            "marad_praxis"=>'اري باميفي',
            "praxis" => ['type' => 'lectionary'],
            "synaxarium" => ['type' => 'lectionary'],
            "mi_ghalo"=>'لحن ميغالو',
            "mohaier_abenshoais"=>'محير ابنشويس',
            "agyous"=>'اجيوس',
            "oshait_al_angeal"=>'اوشية الانجيل',
            "maro_etshasf"=>'مارو اتشاسف',
            "liturgy_psalm" => ['type' => 'lectionary'],
            "liturgy_gospel" => ['type' => 'lectionary'],
            "marad_alangel"=>'مرد إنجيل أحاد وسبوت الصوم الكبير',
            "thalath_awashy_kobar" => 'الثلاث أواشي الكبار',
            "osheait_alsalam" => 'اوشية السلام',
            "osheait_alabaa" => 'اوشية الاباء',
            "osheait_alagtmaat" => 'اوشية الاجتماعات',
            "an_sofia" => 'ان صوفيا',
            "kanon_al_eman" => 'قانون الايمان',
            "into_alsoalh" => 'الثلاث أواشي الكبار',
            "salat_alsoalh" => [
                ['file' => 'يا الله العظيم الابدي', 'label' => 'صلاة الصلح باسيلي'],
                ['file' => 'عال فوق كل قوة', 'label' => 'صلاة الصلح اخري'],
                ['file' => 'ايها الكائن', 'label' => 'صلاة صلح للابن(القداس الغريغوري)'],
                ['file' => 'ايها المسيح الهنا', 'label' => 'صلاة صلح للابن للبطريرك ساويرس'],
                ['file' => 'يا رئيس الحياة وملك الدهور', 'label' => 'صلاة صلح للاب للبطريرك ساويرس'],
                ['file' => 'يا إله المحبة', 'label' => 'صلاة صلح ليوحنا المثلث الطوبي'],
            ],
            "esbasmos_adam" => 'اسبسمس ادام للصوم الكبير',
            "khatemat_alsoalh" => 'قبلو بعضكم بعضا',
            "falnaqif_hasanan" => 'فلنقف حسنا',
            "be_shafaat_waledat_alelaah" => 'بشفاعات والدة الإله ',
            "mostahiq_w_adeel" => [
                ['file' => 'مستحق و عادل', 'label' => 'باسيلي'],
                ['file' => 'محبة الله الآب', 'label' => 'غريغوري'],
                ['file' => 'مستحق و عادل - كيرلسي', 'label' => 'كيرلسي'],
            ],
            "alaazy_yakif_amamh" => [
                ['file' => 'الذي يقف أمامه الملائكة', 'label' => 'باسيلي'],
                ['file' => 'أيها الكائن السيد الرب', 'label' => 'غريغوري'],
                ['file' => 'أنت الذي يقوم أمامك', 'label' => 'كيرلسي'],
            ],
            "alsharobeam_yasgedon_lak" => 'الشاروبيم يسجدون لك',
            "asbasmos_wates" => [
                ['file' => 'اسبسمس واطس الصوم الكبير', 'label' => 'اسبسمس واطس'],
                ['file' => 'اسبسمس واطس ثانى للصوم الكبير', 'label' => 'اسبسمس واطس ثاني'],
            ],
            "agioas_agioas" => [
                ['file' => 'اجيوس اجيوس اجيوس', 'label' => 'باسيلي'],
                ['file' => 'اجيوس اجيوس اجيوس - غريغوري', 'label' => 'غريغوري'],
                ['file' => 'اجيوس اجيوس اجيوس - كيرلسي', 'label' => 'كيرلسي'],
            ],
            "tagasad_w_tanas" => [
                ['file' => 'تجسد و تأنس', 'label' => 'باسيلي'],
                ['file' => 'أتيت إلى الذبح مثل حمل', 'label' => 'غريغوري'],
                //['file' => 'اجيوس اجيوس اجيوس - كيرلسي', 'label' => 'كيرلسي'],
            ],
            "alrshomat" => [
                ['file' => 'الرشومات', 'label' => 'باسيلي'],
                ['file' => 'الرشومات-غريغوري', 'label' => 'غريغوري'],
                //['file' => 'اجيوس اجيوس اجيوس - كيرلسي', 'label' => 'كيرلسي'],
            ],
            "amen_amen_amen" => 'امين امين امين',
            "ffima_nahno_aidan" => [
                ['file' => 'ففيما نحن أيضا نصنع', 'label' => 'باسيلي'],
                ['file' => 'فإذا يا سيدنا', 'label' => 'غريغوري'],
            ],
            "altalba_alawla" => [
                ['file' => 'نعم نسألك أيها المسيح', 'label' => 'الطلبة الاولي'],
                ['file' => 'لكي يكونا لنا', 'label' => 'كيرلسي'],
            ],
            "agelna_mostahkeen_kolna" => 'اجعلنا مستحقين كلنا',
            "erhamna_thoma_erhamna" => 'ارحمنا ثم اررحمنا',
            "althlath_awashy_alsoghar" => [
                ['file' => 'اوشية اهوية السماء', 'label' => 'اهوية السماء'],
                ['file' => 'الاواشي الصغار', 'label' => 'الثلاث اواشي معا'],
            ],
            "aseadha_k_meqdriha" => 'أصعدها كمقدارها كنعمتك',
            "el_magmaa" => [
                ['file' => 'المجمع الباسيلي', 'label' => 'باسيلي'],
                ['file' => 'المجمع الغريغوري', 'label' => 'غريغوري'],
            ],
            "marad_alqareouan" => 'مرد القارئون',
            "traheam" => 'التراحيم',
            "barakathom_al_mpkadasa" => 'مرد بركاتهم المقدسة',
            "intro_qisma" => [
                ['file' => 'مقدمة القسمة باسيلي', 'label' => 'باسيلي'],
                //['file' => 'مقدمة القسمة غريغوري', 'label' => 'غريغوري'],
            ],
            "el_qisma" => [
                ['file' => 'قسمة للآب في الصوم الكبير المقدس', 'label' => 'قسمة للآب في الصوم الكبير المقدس'],
                ['file' => 'قسمة للإبن في أيام صوم الأربعين المقدس', 'label' => 'قسمة للإبن في أيام صوم الأربعين المقدس'],
            ],
            "salat_khodoaa_llab" => 'صلاة خضوع للاب',
            "alqodsat_llqediseen" => 'القدسات للقديسين',
            "alaatraaf" => 'الاعتراف',
        ];

        // ✅ تعديل حسب الصوم
        $isGreatLentSunday = ($season === 'great_lent' && $dayName === 'الأحد');

        $isRegularFastingDay = in_array($season, $FastingSeasons)
                            && in_array($dayName, $FastingDays)
                            && $season !== 'pentecost';

        if ($isGreatLentSunday || $isRegularFastingDay) {
            $fileConfigs["aliloia_fay_be"] = 'الليلويا جي افمفئي';
        } elseif (in_array($season, $FastingSeasons)) {
            $fileConfigs["aliloia_fay_be"] = 'الليلويا إي إ';
        }

        $variables = $data;
        unset($variables['dayKey'], $variables['dayName'], $variables['season']);

        $combinedData = [];
        $counter = 1;

        foreach ($fileConfigs as $configKey => $entry) {

            // =============================
            // ✅ CASE 1: Lectionary
            // =============================
            if (is_array($entry) && ($entry['type'] ?? null) === 'lectionary') {

                $sections = $this->getLectionarySections($day, [$configKey], $variables);

                foreach ($sections as $section) {
                    $newKey = "{$counter}_{$configKey}";
                    $combinedData[$newKey] = $section;
                    $counter++;
                }

                continue;
            }

            // =============================
            // ✅ CASE 2: Alternatives
            // =============================
            if (is_array($entry)) {

                $alternativesArr = [];
                $mainTitle = '';
                $mainStyle = 1;

                foreach ($entry as $altConfig) {
                    $fileName = $altConfig['file'];
                    $label = $altConfig['label'];
                    $path = base_path("storage/content/liturgy/{$fileName}.json");

                    if (file_exists($path)) {
                        $fileContent = json_decode(file_get_contents($path), true);

                        if ($fileContent) {
                            $processedContent = $this->replaceVariables(
                                $fileContent['content'] ?? [],
                                $variables
                            );

                            $altData = [
                                "label"   => $label,
                                "title"   => $fileContent['title'] ?? '',
                                "style"   => $fileContent['style'] ?? 1,
                                "content" => $processedContent ?? []
                            ];

                            $alternativesArr[] = $altData;

                            if (empty($mainTitle)) {
                                $mainTitle = $altData['title'];
                                $mainStyle = $altData['style'];
                            }
                        }
                    }
                }

                if (!empty($alternativesArr)) {
                    $newKey = "{$counter}_{$configKey}";
                    $combinedData[$newKey] = [
                        "title"            => $mainTitle,
                        "style"            => $mainStyle,
                        "has_alternatives" => true,
                        "active_index"     => 0,
                        "alternatives"     => $alternativesArr
                    ];
                    $counter++;
                }

                continue;
            }

            // =============================
            // ✅ CASE 3: Single file
            // =============================
            $fileName = $entry;
            $path = base_path("storage/content/liturgy/{$fileName}.json");

            if (file_exists($path)) {
                $fileContent = json_decode(file_get_contents($path), true);

                if ($fileContent) {
                    $processedContent = $this->replaceVariables(
                        $fileContent['content'] ?? [],
                        $variables
                    );

                    $slug = $fileContent['code'] ?? $configKey;
                    $newKey = "{$counter}_{$slug}";

                    $combinedData[$newKey] = [
                        "title"            => $fileContent['title'] ?? '',
                        "style"            => $fileContent['style'] ?? 1,
                        "has_alternatives" => false,
                        "content"          => $processedContent ?? []
                    ];

                    $counter++;
                }
            }
        }

        return !empty($combinedData) ? $combinedData : null;
    }

    private function replaceVariables($content, $variables)
    {
        if (is_array($content)) {
            return array_map(function ($item) use ($variables) {
                return $this->replaceVariables($item, $variables);
            }, $content);
        }

        if (is_string($content)) {
            foreach ($variables as $key => $value) {
                if (is_scalar($value)) {
                    $content = str_replace('$' . $key, $value, $content);
                }
            }
        }

        return $content;
    }
}
