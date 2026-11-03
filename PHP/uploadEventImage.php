<?php
require('api_helpers.php');
ensure_session_started();
require_login_user();
require('PgConn.php');

	$imagesDir =  images_storage_dir();

	$targetPath = rtrim(  $imagesDir, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . basename($_POST['imgName']);


	if (0 < $_FILES['file']['error']) {
		json_error_response('Upload failed', 400, array('code' => $_FILES['file']['error']));
	}

	if (!move_uploaded_file($_FILES['file']['tmp_name'], $targetPath)) {
		json_error_response('Upload failed', 500, array(
			'targetPath' => $targetPath,
			'directoryExists' => is_dir(dirname($targetPath)),
			'directoryWritable' => is_writable(dirname($targetPath)),
			'tempFile' => $_FILES['file']['tmp_name'],
			'tempFileExists' => is_uploaded_file($_FILES['file']['tmp_name'])
		));
		exit;
	}

	chmod($targetPath, 0777);

	json_response(array('ok' => true, 'path' => basename($targetPath)));

?>
