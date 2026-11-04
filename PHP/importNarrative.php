<?php

require('api_helpers.php');
ensure_session_started();
require('PgConn.php');

// This endpoint always creates a new narration owned by the authenticated user.
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
	json_error_response('Method not allowed', 405);
}

$storageUser = require_login_user();
$userId = current_user_id();
if ($userId === null || $userId === '') {
	json_error_response('Authentication required', 401);
}

// Validate the upload before decoding it. The 30 MB limit covers current published storymaps.
if (!isset($_FILES['jsonFile']) || !is_array($_FILES['jsonFile'])) {
	json_error_response('Select a JSON file to import');
}

$uploadedFile = $_FILES['jsonFile'];
if ($uploadedFile['error'] !== UPLOAD_ERR_OK) {
	$message = $uploadedFile['error'] === UPLOAD_ERR_INI_SIZE || $uploadedFile['error'] === UPLOAD_ERR_FORM_SIZE
		? 'The JSON file is too large'
		: 'The JSON file could not be uploaded';
	json_error_response($message);
}

$maxFileSize = 50 * 1024 * 1024;
if ((int) $uploadedFile['size'] <= 0 || (int) $uploadedFile['size'] > $maxFileSize) {
	json_error_response('The JSON file must be between 1 byte and 50 MB');
}

$json = file_get_contents($uploadedFile['tmp_name']);
if ($json === false) {
	json_error_response('The uploaded file could not be read');
}

$payload = json_decode($json, true);
if (!is_array($payload) || json_last_error() !== JSON_ERROR_NONE) {
	json_error_response('The uploaded file is not valid JSON');
}

// Supported envelopes come from Download JSON and from published storymaps respectively.
$isDownloadedFormat = isset($payload['narra'], $payload['events'], $payload['entities'])
	&& is_array($payload['narra']) && is_array($payload['events']) && is_array($payload['entities']);
$isPublishedFormat = isset($payload['A1'], $payload['events'], $payload['items'])
	&& is_array($payload['A1']) && is_array($payload['events']) && is_array($payload['items']);

if ($isDownloadedFormat === $isPublishedFormat) {
	json_error_response('Unsupported or ambiguous narrative JSON format');
}

$metadata = $isDownloadedFormat ? $payload['narra'] : $payload['A1'];
$events = $payload['events'];
$entities = $isDownloadedFormat ? $payload['entities'] : $payload['items'];
$relations = isset($payload['D1']) && is_array($payload['D1']) ? $payload['D1'] : null;

// Prefer the subject selected by the user, then fall back to narra.subject/A1.subject from the file.
$subjectId = strtoupper(trim((string) post_param('subjectId', '')));
if (!preg_match('/^Q[1-9][0-9]*$/', $subjectId) && isset($metadata['subject']) && is_string($metadata['subject'])) {
	$subjectId = strtoupper(trim($metadata['subject']));
}
if (!preg_match('/^Q[1-9][0-9]*$/', $subjectId)) {
	json_error_response('Select a valid Wikidata subject for the narrative');
}
$subjectId = strtolower($subjectId);

if (count($events) > 2000 || count($entities) > 10000) {
	json_error_response('The JSON contains too many events or entities');
}

/**
 * Validate an event/entity map and normalize fields required by the current builder.
 * Published slides may omit formType, so it is inferred from their 3D or geographic fields.
 */
function normalize_import_map($objects, $kind) {
	$normalized = array();
	$position = 1;

	foreach ($objects as $objectId => $value) {
		$objectId = trim((string) $objectId);
		if (!is_array($value)) {
			json_error_response('Every imported ' . $kind . ' must be a JSON object');
		}

		$validId = $kind === 'event'
			? preg_match('/^ev[A-Za-z0-9._:-]+$/', $objectId)
			: preg_match('/^(?:Q[1-9][0-9]*|U[A-Za-z0-9._:-]+)$/', $objectId);
		if (!$validId || strlen($objectId) > 500) {
			json_error_response('Invalid ' . $kind . ' ID: ' . $objectId);
		}

		if (isset($value['_id']) && trim((string) $value['_id']) !== $objectId) {
			json_error_response('The key and _id differ for ' . $objectId);
		}
		$value['_id'] = $objectId;

		if ($kind === 'event') {
			// Preserve valid positions and provide deterministic ordering when old exports omit them.
			if (!isset($value['position']) || !is_numeric($value['position'])) {
				$value['position'] = $position;
			} else {
				$value['position'] = (int) $value['position'];
			}

			$formType = isset($value['formType']) ? (string) $value['formType'] : '';
			if ($formType === 'Aton 2') {
				$formType = 'Aton';
			}
			if ($formType === '') {
				// This mirrors the compatibility rules used when the builder loads legacy events.
				if (!empty($value['Atonid'])) {
					$formType = 'Aton';
				} elseif (!empty($value['sketchfabid'])) {
					$formType = 'sketchfab';
				} elseif ((isset($value['slideType']) && $value['slideType'] === 'geographic')
					|| !empty($value['latitud']) || !empty($value['longitud']) || !empty($value['polygon'])) {
					$formType = 'map';
				} else {
					$formType = 'slide';
				}
			}
			if (!in_array($formType, array('map', 'slide', 'sketchfab', 'Aton'), true)) {
				json_error_response('Unsupported event formType for ' . $objectId);
			}
			$value['formType'] = $formType;
			$position += 1;
		}

		$normalized[$objectId] = $value;
	}

	return $normalized;
}

function is_hidden_import_entity($entity) {
	if (!isset($entity['type']) || !is_array($entity['type'])) {
		return false;
	}

	foreach (array('Q15474042', 'Q4167836', 'Q186081') as $hiddenType) {
		if (in_array($hiddenType, $entity['type'], true)) {
			return true;
		}
	}

	return false;
}

$events = normalize_import_map($events, 'event');
$entities = normalize_import_map($entities, 'entity');

$hiddenEntityIds = array();
foreach ($entities as $entityId => $entity) {
	if (is_hidden_import_entity($entity)) {
		$hiddenEntityIds[$entityId] = true;
		unset($entities[$entityId]);
	}
}

if (count($hiddenEntityIds) > 0) {
	foreach ($events as &$event) {
		if (!isset($event['props']) || !is_array($event['props'])) {
			continue;
		}

		foreach ($event['props'] as $entityId => $prop) {
			if (isset($hiddenEntityIds[$entityId])) {
				unset($event['props'][$entityId]);
			}
		}
	}
	unset($event);
}

$title = isset($metadata['name']) ? trim((string) $metadata['name']) : '';
if ($title === '') {
	$title = strtoupper($subjectId);
}

// PostgreSQL supports transactional DDL, so a failure also removes the newly created table.
$transactionStarted = false;
try {
	if (pg_query($dbconn, 'BEGIN') === false) {
		throw new RuntimeException('Could not start the import transaction');
	}
	$transactionStarted = true;

	$idNarration = insert_narration_record($storageUser, $subjectId, $userId, $title);
	if ($idNarration === null) {
		throw new RuntimeException('Could not create the narration record');
	}

	$tableName = narrative_table_name($idNarration, $storageUser, $subjectId);
	$quotedTableName = pg_escape_identifier($dbconn, $tableName);
	$createTable = pg_query($dbconn, 'CREATE TABLE ' . $quotedTableName . ' ("id" character(500) PRIMARY KEY, "value" jsonb)');
	if ($createTable === false) {
		throw new RuntimeException('Could not create the narration table');
	}

	// Never trust ownership or old IDs from an uploaded file: the import belongs to this session user.
	$metadata['_id'] = 'A1';
	$metadata['id'] = (string) $idNarration;
	$metadata['idNarra'] = (string) $idNarration;
	$metadata['author'] = $storageUser;

	// slides is intentionally ignored because it duplicates events for visualization purposes.
	$objects = array('A1' => $metadata);
	if ($relations !== null) {
		$relations['_id'] = 'D1';
		$objects['D1'] = $relations;
	}
	foreach ($events as $objectId => $value) {
		$objects[$objectId] = $value;
	}
	foreach ($entities as $objectId => $value) {
		$objects[$objectId] = $value;
	}

	// Store every logical object with the same id/value JSONB model used by the existing save endpoints.
	$insertSql = 'INSERT INTO ' . $quotedTableName . ' (id, value) VALUES ($1, $2::jsonb)';
	foreach ($objects as $objectId => $value) {
		$objectJson = json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
		if ($objectJson === false || pg_query_params($dbconn, $insertSql, array($objectId, $objectJson)) === false) {
			throw new RuntimeException('Could not store imported object ' . $objectId);
		}
	}

	if (pg_query($dbconn, 'COMMIT') === false) {
		throw new RuntimeException('Could not commit the import');
	}
	$transactionStarted = false;
} catch (Throwable $error) {
	// Do not leave a narrations row or a partial per-narration table behind.
	if ($transactionStarted) {
		pg_query($dbconn, 'ROLLBACK');
	}
	json_error_response('The narrative could not be imported', 500);
}

json_response(array(
	'ok' => true,
	'idNarra' => (string) $idNarration,
	'subjectId' => strtoupper($subjectId),
	'title' => $title,
	'events' => count($events),
	'entities' => count($entities),
	'redirect' => 'toolNew.html?idwiki=' . rawurlencode(strtoupper($subjectId)) . '&idnar=' . rawurlencode((string) $idNarration),
));
