<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A liturgical reading day.
 *
 * @property int $id
 * @property string $date_key        Gregorian date key (Y-m-d)
 * @property string $season          Liturgical season key
 * @property int $coptic_day
 * @property int $coptic_month
 * @property int $coptic_year
 * @property string|null $notes
 */
class ReadingDay extends Model
{
    protected $fillable = [
        'date_key',
        'season',
        'coptic_day',
        'coptic_month',
        'coptic_year',
        'notes',
    ];

    /**
     * All readings for this day.
     */
    public function readings(): HasMany
    {
        return $this->hasMany(Reading::class, 'reading_day_id');
    }
}
