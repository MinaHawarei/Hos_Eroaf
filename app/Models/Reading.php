<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A single reading (e.g., "رسالة بولس الرسول إلى أهل رومية").
 *
 * @property int $id
 * @property int $reading_day_id
 * @property int $section_id
 * @property string $title_ar
 */
class Reading extends Model
{
    protected $fillable = [
        'reading_day_id',
        'section_id',
        'title_ar',
        'sequence_order',
        'has_coptic',
    ];

    /**
     * The reading day this belongs to.
     */
    public function readingDay(): BelongsTo
    {
        return $this->belongsTo(ReadingDay::class, 'reading_day_id');
    }

    /**
     * The section type (Pauline, Catholic, etc.).
     */
    public function section(): BelongsTo
    {
        return $this->belongsTo(ReadingSection::class, 'section_id');
    }

    /**
     * Individual lines of this reading.
     */
    public function lines(): HasMany
    {
        return $this->hasMany(ReadingLine::class, 'reading_id');
    }
}
