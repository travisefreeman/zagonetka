<?php
require_once __DIR__ . '/vendor/autoload.php';
require_once __DIR__ . '/src/autoload.php';
require_once __DIR__ . '/config.php';

use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use PUZLA\Database\Controller as DB_Controller;
use PUZLA\Frontend\Controller as Frontend_Controller;

$app			= new Silex\Application;
$app['debug']	= true;

$app->register( new Silex\Provider\TwigServiceProvider(), array( 'twig.path' => __DIR__ . '/templates', 'twig.options' => array( 'strict_variables' => false ) ) );
$app->register( new Silex\Provider\RoutingServiceProvider() );
$app->register( new Silex\Provider\SessionServiceProvider() );

$db			= new DB_Controller( $app );
$frontend	= new Frontend_Controller( $app, $db );

$db->run();
$frontend->run();

$app->run();
?>