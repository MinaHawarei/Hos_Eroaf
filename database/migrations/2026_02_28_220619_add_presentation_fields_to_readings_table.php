<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('readings', function (Blueprint $table) {
            $table->unsignedSmallInteger('sequence_order')->default(0)->after('title_ar');
            $table->boolean('has_coptic')->default(false)->after('sequence_order');
        });

        Schema::table('reading_lines', function (Blueprint $table) {
            $table->index('normalized_text', 'idx_normalized_text');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('reading_lines', function (Blueprint $table) {
            $table->dropIndex('idx_normalized_text');
        });

        Schema::table('readings', function (Blueprint $table) {
            $table->dropColumn(['sequence_order', 'has_coptic']);
        });
    }
};
