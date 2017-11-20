<?php
namespace PUZLA\Frontend;

use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

if ( !class_exists( __NAMESPACE__ . "\\Controller.php" ) ):
class Controller
{
	private $app			= NULL;
	private $DB			= NULL;
	private $app_path	= PUZLA_ROOT_FOLDER;

	public function __construct( &$app, $db )
	{
		$this->app	= $app;
		$this->DB	= $db;
	}
	
	public function run( )
	{
		$admin = $this->app['controllers_factory'];

		$admin
			->match( "/{theme}", array( &$this, 'landing_page' ) )
			->assert( "theme", "(?!api).*"  )
			->bind( 'puzla_landing' );
			
		$this->app
			->mount( '/', $admin );
	}
	
	public function landing_page( Request $request )
	{
		$response	= new Response;
		$theme 	= $request->get( 'theme' );
		if ( $theme )
		{
			$puzzle = $this->DB->get_theme( $theme );
		}
		else
		{
			$puzzle = $this->DB->get_feature_theme();
		}
		$template	= array(
			'title'				=> PUZLA_TITLE,
			'og_fb_app_id'		=> PUZLA_OG_FACEBOOK_APP_ID,
			'og_title'			=> PUZLA_OG_TITLE,
			'og_image'			=> PUZLA_OG_IMAGE,
			'og_description'	=> PUZLA_OG_DESCRIPTION,
			'og_tw_author'		=> PUZLA_OG_TWITTER_AUTHOR,
			'meta_keywords'		=> PUZLA_META_KEYWORDS,
			'cover_image'		=> PUZLA_COVER_IMAGE,
			'ga_tracking_id'	=> ( defined( 'PUZLA_GOOGLE_ANALYTICS_TRACKING_ID' ) ) ? PUZLA_GOOGLE_ANALYTICS_TRACKING_ID : false,
			'imageMaxWidth'		=> $this->DB->imageMaxWidth,
			'imageMaxHeight'	=> $this->DB->imageMaxHeight,
		);
		if ( $puzzle )
		{
			$template['puzzle'] = $puzzle;	
		}
		else
		{
			$template['msg'] = $this->DB->msg;	
		}
		$template['uri']		= 'http://' . $_SERVER['SERVER_NAME'] . $this->app_path;
		$output				= $this->app['twig']->render( 'index.twig.html', $template );
		$response->setContent( $output );
		$response->setStatusCode( Response::HTTP_OK );
		return $response;
	}
	
}
endif;