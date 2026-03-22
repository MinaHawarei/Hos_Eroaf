<?php

test('presentation search returns empty array for short query', function () {
    $response = $this->getJson('/presentation/search?q=a');

    $response->assertOk();
    $response->assertJson(['results' => []]);
});

test('presentation search returns matches from lectionary json files', function () {
    $response = $this->getJson('/presentation/search?q='.rawurlencode('راعي'));

    $response->assertOk();
    $data = $response->json('results');
    expect($data)->toBeArray()->not->toBeEmpty();
    expect($data[0])->toHaveKeys(['source', 'file', 'label', 'slide']);
    expect($data[0]['slide'])->toHaveKey('lines');
});
