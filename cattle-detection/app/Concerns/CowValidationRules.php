<?php

namespace App\Concerns;

/**
 * Shared validation rules for the cow form.
 *
 * Kept in one place so create and update cannot drift: a rule that only exists on
 * one of them means the other silently accepts a value the database will reject
 * or, worse, store something inconsistent with the device.
 */
trait CowValidationRules
{
    /**
     * The code is the join key the Pi, the MQTT topic and the CSV export all use,
     * so it is limited to characters that are safe in a URL path and a topic.
     *
     * @return array<int, string>
     */
    protected function cowCodeRules(): array
    {
        return [
            'required',
            'string',
            'min:2',
            'max:32',
            // Lower-case letters, digits, dash and underscore only.
            'regex:/^[a-z0-9_-]+$/',
            'not_regex:/^[-_]/',
        ];
    }

    /**
     * @return array<int, string>
     */
    protected function cowNameRules(): array
    {
        return ['required', 'string', 'min:2', 'max:100'];
    }

    /**
     * @return array<string, string>
     */
    public function cowMessages(): array
    {
        return [
            'code.regex' => 'Kode sapi hanya boleh huruf kecil, angka, tanda hubung, dan garis bawah.',
            'code.not_regex' => 'Kode sapi tidak boleh diawali tanda hubung atau garis bawah.',
            'code.min' => 'Kode sapi minimal 2 karakter.',
            'name.min' => 'Nama sapi minimal 2 karakter.',
        ];
    }

    /**
     * @return array<string, string>
     */
    public function cowAttributes(): array
    {
        return [
            'code' => 'kode sapi',
            'name' => 'nama sapi',
        ];
    }
}
