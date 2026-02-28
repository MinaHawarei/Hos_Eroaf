<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A liturgical reading section type.
 * Examples: Pauline (البولس), Catholic (الكاثوليكون), Praxis (الإبركسيس), etc.
 *
 * @property int $id
 * @property string $code
 * @property string $name_ar
 * @property int $order
 */
class ReadingSection extends Model
{
    protected $fillable = [
        'code',
        'name_ar',
        'order',
    ];

    /**
     * All readings of this section type.
     */
    public function readings(): HasMany
    {
        return $this->hasMany(Reading::class, 'section_id');
    }
}
