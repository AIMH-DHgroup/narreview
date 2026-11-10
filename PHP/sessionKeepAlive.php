<?php

require('api_helpers.php');
ensure_session_started();
require_login_user();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
	json_error_response('Method not allowed', 405);
}

$_SESSION['session_keepalive'] = time();
session_write_close();

json_response(array('ok' => true));
