<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Key-value settings store.
 *
 * @property int $id
 * @property string $key
 * @property string|null $value
 */
class Setting extends Model
{
    protected $fillable = ['key', 'value'];

    /**
     * Get a setting value by key.
     */
    public static function getValue(string $key, ?string $default = null): ?string
    {
        $setting = static::where('key', $key)->first();

        return $setting?->value ?? $default;
    }

    /**
     * Set a setting value by key (upsert).
     */
    public static function setValue(string $key, ?string $value): void
    {
        static::updateOrCreate(
            ['key' => $key],
            ['value' => $value],
        );
    }
}
