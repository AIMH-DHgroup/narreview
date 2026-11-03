
<?php
require('api_helpers.php');
ensure_session_started();
require_login_user();
require('PgConn.php');

$imagesDir =  images_storage_dir();

$targetPath = rtrim($imagesDir, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . basename($_POST['fileName']);

if (!move_uploaded_file($_FILES['file']['tmp_name'], $targetPath)) {
	json_error_response('Upload failed', 500);
}

chmod($targetPath, 0777);

json_response(array('ok' => true, 'path' => basename($targetPath)));
