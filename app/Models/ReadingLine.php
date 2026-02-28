<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A single line of a reading, designed for line-by-line highlighting.
 *
 * @property int $id
 * @property int $reading_id
 * @property string $lang_type         'arabic' or 'coptic_arabized'
 * @property int $line_order
 * @property string $text              Original text
 * @property string $normalized_text   Normalized for STT matching
 */
class ReadingLine extends Model
{
    protected $fillable = [
        'reading_id',
        'lang_type',
        'line_order',
        'text',
        'normalized_text',
    ];

    /**
     * The reading this line belongs to.
     */
    public function reading(): BelongsTo
    {
        return $this->belongsTo(Reading::class, 'reading_id');
    }
}
