<?php
/**
 * @filesource   mumble.php
 * @created      15.10.2019
 * @author       smiley <smiley@chillerlan.net>
 * @copyright    2019 smiley
 * @license      MIT
 */

// path to python executable
$python = 'C:\Python38\python.exe';

$prevTick = 0;
$prevPos = [0, 0];

$filename = date('Ymd-His-').hash('crc32b', microtime(true)).'.txt';

$fh = fopen('./logs/'.$filename, 'w+');

while(true){
	exec($python.' mumblelink.py', $data);
	$json = json_decode($data[0] ?? '');

	if($json && $json->ui_tick !== $prevTick && $json->position !== $prevPos){
		var_dump($data[0]);

		if($prevTick === 0){
			fwrite($fh, $json->map_id.PHP_EOL);
		}

		fwrite($fh, json_encode($json->position).','.PHP_EOL);
		$prevTick = $json->ui_tick;
		$prevPos  = $json->position;
	}

	// remove the first element to not blow up memory
	array_shift($data);
	usleep(500000);
}


