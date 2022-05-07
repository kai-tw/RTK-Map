<?php
/* 
	ini_set: prevent float precision bug.
	more info: https://stackoverflow.com/questions/43865885/how-to-json-encode-float-values-in-php-7-1-1
*/
ini_set('serialize_precision', -1);

define('RESOURCE_URL', 'https://data.nhi.gov.tw/resource/Nhi_Fst/Fstdata.csv');

header('Content-Type: application/json; charset=utf-8');

$data = ['type'=>'FeatureCollection', 'features'=>[]];
$curl = curl_init();
curl_setopt($curl, CURLOPT_URL, RESOURCE_URL);
curl_setopt($curl, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($curl, CURLOPT_SSL_VERIFYHOST, false);
curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
$result = curl_exec($curl);
curl_close($curl);

$mem = fopen('php://memory', 'r+');
fwrite($mem, $result);
rewind($mem);
fgets($mem); /* skip first row */

$latLngFix = json_decode(file_get_contents('latLng_fix.json'), true);

while (($row = fgets($mem)) !== false) {
	$row = explode(',', $row);
	$from = ['０', '１', '２', '３', '４', '５', '６', '７', '８', '９', '－'];
	$to = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '-'];
	$row[2] = str_replace($from, $to, $row[2]);
	$feature = [
					'type'=>'Feature',
					'properties'=>[
						'id'		=>	$row[0],
						'name'		=>	$row[1],
						'address'	=>	$row[2],
						'phone'		=>	$row[5],
						'brand'		=>	$row[6],
						'stock'		=>	(int)$row[7],
						'updateTime'=>	$row[8],
						'note'		=>	$row[9]
					],
					'geometry'=>[
						'type'			=>	'Point',
						'coordinates'	=>	[
							floatval($row[3]),
							floatval($row[4])
						]
					]
				];
	if (isset($latLngFix[$row[0]])) {	// Manual fix the wrong latitude & longitude
		$feature['geometry']['coordinates'] = $latLngFix[$row[0]];
	}
	$data['features'][] = $feature;
}
fclose($mem);
echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);