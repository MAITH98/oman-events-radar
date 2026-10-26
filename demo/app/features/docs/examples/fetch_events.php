<?php
$api = "https://maith98.github.io/oman-events-radar";
$context = stream_context_create(["http" => ["timeout" => 10]]);
$body = file_get_contents("$api/events.json", false, $context);
if ($body === false) {
    exit("Radar API unreachable\n");
}
$data = json_decode($body, true, 512, JSON_THROW_ON_ERROR);

foreach ($data["events"] as $e) {
    if ($e["status"] === "Upcoming" && $e["relevance"] === "High") {
        echo "{$e['start']} {$e['title']}\n";
    }
}
