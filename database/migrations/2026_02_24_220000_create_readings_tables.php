<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Reading sections (Pauline, Catholic, Praxis, Psalm, Gospel, etc.)
        Schema::create('reading_sections', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50)->unique();      // e.g. 'pauline', 'catholic', 'praxis', 'psalm', 'gospel'
            $table->string('name_ar');                   // Arabic name: 'البولس', 'الكاثوليكون', etc.
            $table->unsignedSmallInteger('order');       // Display order
            $table->timestamps();
        });

        // Reading days (one row per liturgical day)
        Schema::create('reading_days', function (Blueprint $table) {
            $table->id();
            $table->string('date_key', 10)->unique();    // e.g. '2026-02-24' (Gregorian key for lookup)
            $table->string('season', 30);                // e.g. 'annual', 'great_lent', 'holy_week'
            $table->unsignedTinyInteger('coptic_day');
            $table->unsignedTinyInteger('coptic_month');
            $table->unsignedSmallInteger('coptic_year');
            $table->text('notes')->nullable();            // Optional notes about the day
            $table->timestamps();

            $table->index(['season']);
            $table->index(['coptic_month', 'coptic_day']);
        });

        // Individual readings (one per section per day)
        Schema::create('readings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('reading_day_id')
                ->constrained('reading_days')
                ->cascadeOnDelete();
            $table->foreignId('section_id')
                ->constrained('reading_sections')
                ->cascadeOnDelete();
            $table->string('title_ar');                  // e.g. 'رسالة بولس الرسول إلى أهل رومية'
            $table->timestamps();

            $table->index(['reading_day_id', 'section_id']);
        });

        // Reading lines (individual lines for highlighting)
        Schema::create('reading_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('reading_id')
                ->constrained('readings')
                ->cascadeOnDelete();
            $table->enum('lang_type', ['arabic', 'coptic_arabized']);
            $table->unsignedSmallInteger('line_order');
            $table->text('text');                         // Original text with tashkeel
            $table->text('normalized_text');              // Stripped/normalized for matching
            $table->timestamps();

            $table->index(['reading_id', 'line_order']);
            // Full-text index for searching (SQLite uses FTS if needed separately)
        });

        // App settings (key-value store)
        Schema::create('settings', function (Blueprint $table) {
            $table->id();
            $table->string('key', 100)->unique();
            $table->text('value')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reading_lines');
        Schema::dropIfExists('readings');
        Schema::dropIfExists('reading_days');
        Schema::dropIfExists('reading_sections');
        Schema::dropIfExists('settings');
    }
};
