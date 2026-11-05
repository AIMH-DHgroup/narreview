<?php

require('api_helpers.php');
ensure_session_started();
require('PgConn.php');

$context = resolve_narrative_context_from_request(array(
	'method' => 'POST',
	'id_keys' => array('idNarr', 'idNarra', 'id'),
	'subject_keys' => array('subject', 'subjectId'),
));
$user = $context['storageUser'];
$idNarration = $context['idNarration'];
$baseUrl = post_param('baseURL', '');

$tableName = $context['tableName'];
$scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$triplifyRoot = realpath('/opt/smbvt');
$triplifyJar = $triplifyRoot !== false ? $triplifyRoot . DIRECTORY_SEPARATOR . 'triplify.jar' : false;

$events = fetch_narrative_events_map($tableName);
$entities = fetch_narrative_entities_map($tableName);
$info = fetch_narrative_info_object($tableName);

if (isset($_SESSION['Demon_on'])) {
	$datasetFs = 'https://tool.dlnarratives.eu/fuseki/prova2';
	$storageSubdir = 'prova2';
} elseif (isset($info->CSVnumber)) {
	$datasetFs = 'https://tool.dlnarratives.eu/fuseki/moving';
	$storageSubdir = 'moving';
} else {
	$datasetFs = 'http://127.0.0.1:3030/narratives';
	$storageSubdir = 'narratives';
}

$triplifyPayload = array(
	'entities' => $entities,
	'narra' => $info,
	'events' => $events,
);

$jsonDir = json_storage_dir($storageSubdir);
$owlDir = owl_storage_dir($storageSubdir);

foreach (array(
	'JSON' => $jsonDir,
	'OWL' => $owlDir,
) as $outputType => $outputDir) {
	if (!is_dir($outputDir) || !is_writable($outputDir)) {
		json_error_response(
			'The ' . $outputType . ' output directory is not writable by the web server.',
			500,
			array('path' => $outputDir)
		);
	}
}

$jsonPath = $jsonDir . DIRECTORY_SEPARATOR . $user . '_N' . $idNarration . '.json';
$owlPath = $owlDir . DIRECTORY_SEPARATOR . $user . '_N' . $idNarration . '.owl';

$jsonContent = json_encode($triplifyPayload);
if ($jsonContent === false) {
	json_error_response('Unable to encode narrative data for graph generation: ' . json_last_error_msg(), 500);
}

$jsonBytesWritten = file_put_contents($jsonPath, $jsonContent);
if ($jsonBytesWritten === false || $jsonBytesWritten !== strlen($jsonContent) || !is_readable($jsonPath)) {
	json_error_response('Unable to write the triplification JSON input file.', 500, array('path' => $jsonPath));
}
chmod($jsonPath, 0777);

$output = array();
$retval = null;
if ($triplifyRoot !== false && $triplifyJar !== false && is_file($triplifyJar) && is_readable($triplifyJar)) {
    $command = 'cd ' . escapeshellarg($triplifyRoot) . ' && ' .
            'java -Xmx512m -cp ' .
            escapeshellarg($triplifyRoot . PATH_SEPARATOR . $triplifyJar) .
            ' narra.triplifier.Triplify ' .
            escapeshellarg($jsonPath) . ' ' .
            escapeshellarg($owlPath) . ' ' .
            escapeshellarg($datasetFs) . ' 2>&1';

    exec($command, $output, $retval);
    if (file_exists($owlPath)) {
        chmod($owlPath, 0777);
    } elseif ($retval === 0) {
        $output[] = 'Triplifier completed without creating the OWL output file';
        $retval = 1;
    }
} else {
    $output[] = 'Triplify JAR not found or not readable: ' . ($triplifyJar === false ? __DIR__ . '/../Triplify/triplify.jar' : $triplifyJar);
    $retval = 1;
}

$owlLink = $retval === 0
	? $scheme . '://' . $baseUrl . '/owl/' . rawurlencode($storageSubdir) . '/' . rawurlencode($user . '_N' . $idNarration . '.owl')
	: null;

json_response(array(
	'owlLink' => $owlLink,
	'output' => $output,
	'exitCode' => $retval,
));
