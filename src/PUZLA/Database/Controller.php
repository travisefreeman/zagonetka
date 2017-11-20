<?php
namespace PUZLA\Database;

use RedBeanPHP\R as R;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

if ( !class_exists( __NAMESPACE__ . "\\Controller" ) ):
class Controller
{
	private $parent			= NULL;
	private $bean_type		= NULL;
	private $id				= NULL;
	private $request_data	= NULL;
	private $host			= NULL;
	var $people_tbl			='people';
	var $theme_tbl			='theme';
	var $msg					= NULL;
	private $app_path		= PUZLA_ROOT_FOLDER;
	public $imageMaxWidth	= 960;
	public $imageMaxHeight	= 600;

	public function __construct( \Silex\Application &$silex )
	{
		$this->parent = $silex;
		R::setup( 'mysql:host=' . PUZLA_HOST . ';dbname=' . PUZLA_DB, PUZLA_USER, PUZLA_PASSWORD );
	}

	public function __destruct()
	{
		R::close( );
	}

	public function run()
	{
		$crud = $this->parent['controllers_factory'];
		
		$crud
			->match( "/", array( &$this, "transaction" ) )
			->bind( "puzla_restful_crud" );
			
		$crud
			->match( "/{bean_type}", array( &$this, 'transaction' ) )
			->method( "POST|GET" )
			->bind( "puzla_restful_crud2" );
		
		$crud
			->match( "/leaderboard/{theme_id}", array( &$this, 'get_leaderboard' ) )
			->assert( "theme_id", ".*"  )
			->bind( 'puzla_leaderboard_restful_crud' );
		
		$crud
			->match( "/puzzles/", array( &$this, 'get_latest_puzzles' ) )
			->bind( 'puzla_latest_puzzles_restful_crud' );
			
		$this->parent
			->mount( "/api", $crud );
	}

	public function transaction( Request $request )
	{
		$method				= $request->getMethod( );
		$this->bean_type 	= $request->get( 'bean_type' );
		$this->data			= json_decode( $request->getContent( ) );
		$this->host			= 'http://' . $request->getHttpHost( );
		$this->request 		= $request;
		
		if ( "GET" === $method )
		{
			$this->query = $request->query->all( );
		}

		$output = array( );
		switch( $method )
		{
			case "GET":
				break;
				
			case 'POST':
				$output = R::transaction( array( &$this, "__createUpdateBean" ) );
				break;
		}

		unset( $this->data );

		if ( !is_null( $output ) )
			$output = json_encode( $output );
		else
			$output = '';
			
		$response = new Response( $output, Response::HTTP_OK );
		if ( !empty( $output ) )
			$response->headers->set( 'Content-Type', 'application/json' );

		return $response;
	}
	
	private function get_slug( $string )
	{
		$string = str_replace( array( '-', ' ' ), array( '', '-' ), $string );
		$new_string = preg_replace( "/[^A-Za-z0-9\-]/", '', $string );
		$end_dash = true;
		while( $end_dash )
		{
			if ( substr( $new_string, -1 ) == '-' )
			{
				$new_string = substr( $new_string, 0, strlen( $new_string ) - 1 );
			}
			else
			{
				$end_dash = false;
			}
		}
		
		$front_dash = true;
		while( $front_dash )
		{
			if ( substr( $new_string, 0, 1 ) == '-' )
			{
				$new_string = substr( $new_string, 1, strlen( $new_string ) - 1 );
			}
			else
			{
				$front_dash = false;
			}
		}
		
		$new_string = strtolower( $new_string );
		if ( $new_string )
			return $new_string;
		return false;
	}
	
	private function resizeWidthHeight( $w, $h )
	{
		$specs			= [];
		$width_max		= $this->imageMaxWidth;
		$height_max		= $this->imageMaxHeight;
		$width_new		= $w;
		$height_new		= $h;
		$orientation	= 'landscape';
			
		if ( $h > $w )
		{
			$orientation = 'portrait';
		}
		
		$specs['orientation'] 	= $orientation;
		
		if ( 'landscape' == $orientation )
		{
			if 	( $width_new > $width_max )
			{
				$ratio		= $width_max / $width_new;
				$width_new	= $width_max;
				$height_new	= round( $height_new * $ratio );
			}
		}
			
		if ( 'portrait' == $orientation )
		{
			if 	( $height_new > $height_max )
			{
				$ratio		= $height_max / $height_new;
				$width_new 	= round( $width_new * $ratio );
				$height_new	= $height_max;
			}
		}
		
		if 	( $width_new > $width_max )
		{
			$ratio		= $width_max / $width_new;
			$width_new	= $width_max;
			$height_new	= ceil( $height_new * $ratio );
		}
		
		if 	( $height_new > $height_max )
		{
			$ratio		= $height_max / $height_new;
			$width_new 	= ceil( $width_new * $ratio );
			$height_new	= $height_max;
		}
		
		$specs['width']	= $width_new;
		$specs['height']	= $height_new;
		return ( object ) $specs;
	}
	
	private function resize_file( $filename, $extension )
	{
		$media_dir = __DIR__ . '/../../../media/';
		$extension = strtolower( $extension );
		$file = $media_dir . $filename ;
		list( $width, $height ) = getimagesize( $file );
		if ( $width > $this->imageMaxWidth || $height > $this->imageMaxHeight )
		{
			$specs = $this->resizeWidthHeight( $width, $height );
			
			$newwidth	= $specs->width;
			$newheight	= $specs->height;
			
			if ( 'jpg' == $extension || 'jpeg' == $extension  )
				$src = imagecreatefromjpeg( $file );
			
			if ( 'png' == $extension )
				$src = imagecreatefrompng( $file );
				
			if ( 'gif' == $extension )
				$src = imagecreatefromgif( $file );
			
			$dst = imagecreatetruecolor( $newwidth, $newheight );
			
			if ( 'png' == $extension )
			{
				//http://stackoverflow.com/questions/2611852/imagecreatefrompng-makes-a-black-background-instead-of-transparent
				$background = imagecolorallocate( $dst, 0, 0, 0 );
				imagecolortransparent( $dst, $background );
				imagealphablending( $dst, false );
				imagesavealpha( $dst, true );
			}
				
			imagecopyresampled( $dst, $src, 0, 0, 0, 0, $newwidth, $newheight, $width, $height );
			
			$new_filename = str_replace( '.' . $extension, '_resampled.' . $extension, $filename );
			
			if ( 'jpg' == $extension || 'jpeg' == $extension  )
				imagejpeg( $dst, $media_dir . $new_filename );
			
			if ( 'png' == $extension )
				imagepng( $dst, $media_dir . $new_filename );
				
			if ( 'gif' == $extension )
				imagegif( $dst, $media_dir . $new_filename );
			return $new_filename;
		}
		else
		{
			return $filename;
		}
	}
	
	public function __createUpdateBean()
	{
		$results = array( 'msg' => 'Error. Please try again.' );
		if ( 'upload' == $this->bean_type ):
			$data			= array();
			$results		= array();
			$dir			= __DIR__ . '/../../../media/';
			$req			= $this->request;
			$file			= $req->files->get( 'img' );
			$results['code']	= 1;
			if ( $file == NULL )
			{
				
			}
			else
			{
				$new_file_name	= date( 'YmdHis' ) . '-' . $file->getClientOriginalName();
				$mimetype		= $file->getMimeType();
				$size			= $file->getClientSize();
				$extension		= $file->getClientOriginalExtension();
				$results['size']	= $size;
				if ( $size <= 6000000 ) // 6 mb
				{
					if ( in_array( strtolower( $extension ), array( 'jpg', 'jpeg', 'png', 'gif' ) ) )
					{
						
						$file->move( $dir, $new_file_name );
						$resized_file_name	= $this->resize_file( $new_file_name, $extension );
						$url				= 'http://' . $_SERVER['SERVER_NAME'] . $this->app_path . 'media/' . $resized_file_name;
						$results['code']		= 0;
						$results['url']		= $url;
						$results['data']		= array(
							'msg'		=> 'Your image was successfully uploaded',
							'file'		=> $resized_file_name,
							'url'		=> $url,
							'mimetype'	=> $mimetype,
							'size'		=> $size,
							'extension'	=> $extension,
						);
					}
					else
					{
						$results['data'] = array( 'msg' => 'File is not standard image type. Please upload a standard image.' );
					}
				}
				else
				{
					$results['data'] = array( 'msg' => 'File is too large.  Please upload a standard sized image.' );
				}
			}
		endif;
		if ( 'people' == $this->bean_type ):
			$theme_id		= $this->scrub( $this->data->id );
			$full_name		= $this->scrub( $this->data->people->full_name );
			$time			= $this->scrub( $this->data->seconds_completed );
			$puzzle_data	= serialize( $this->data );
			
			$people = R::dispense( $this->people_tbl );
			$people->theme_id 	= $theme_id;
			$people->full_name 	= $full_name;
			$people->time 		= $time;
			$people->puzzle_data	= $puzzle_data;
			$people_id			= R::store( $people );
			
			$results['success']	= true;
			$results['msg']	= 'The puzzle score has been saved.';
		endif;
		if ( 'create' == $this->bean_type ):
			$person_name		= $this->scrub( $this->data->person_name );
			$person_email		= $this->scrub( $this->data->person_email );
			$person_puzzle_name	= $this->scrub( $this->data->person_puzzle_name );
			$file				= $this->scrub( $this->data->file );
			$slug				= $this->get_slug( $person_puzzle_name );
			if ( !$slug )
			{
				$slug = NULL;
			}
			
			$theme = R::dispense( $this->theme_tbl );
			$theme->name 			= $person_puzzle_name;
			$theme->slug 			= $slug;
			$theme->media_type		= 'photo';
			$theme->file 			= $file;
			$theme->person_name 		= $person_name;
			$theme->person_email 	= strtolower( $person_email );
			$theme_id				= R::store( $theme );
			
			$results['link']			= 'http://' . $_SERVER['SERVER_NAME'] . $this->app_path . $slug;
			$results['success']		= true;
			$results['msg']			= 'The puzzle has been created.';
		endif;
		return $results;
	}
	
	public function get_feature_theme()
	{
		$theme = R::findOne( $this->theme_tbl, ' `feature` = ? AND `visible` = ? ', array( 1, 1 ) );	
		if ( $theme ):
			$data['id']			= $theme->id;
			$data['type']		= $theme->media_type;
			$data['duration']	= $theme->video_duration;
			$data['name']		= $theme->name;
			$data['file']		= $theme->file;
			return ( object ) $data;
		endif;
		$this->msg = 'That puzzle is not available.';
		return false;
	}
	
	public function get_theme( $slug = false )
	{
		if ( $slug )
		{
			$theme = R::findOne( $this->theme_tbl, ' `slug` = ? AND `visible` = ? ',array( $slug, 1 ) );	
			if ( $theme ):
				$data['id']			= $theme->id;
				$data['type']		= $theme->media_type;
				$data['duration']	= $theme->video_duration;
				$data['name']		= $theme->name;
				$data['file']		= $theme->file;
				return ( object ) $data;
			endif;
		}
		$this->msg = 'There is no puzzle available at the moment.';
		return false;
	}
	
	public function get_leaderboard( Request $request )
	{
		$method				= $request->getMethod( );
		$theme_id 			= $request->get( 'theme_id' );
		$this->data			= json_decode( $request->getContent( ) );
		$this->host			= 'http://' . $request->getHttpHost( );
		
		$output = array( );
		if ( "GET" === $method )
		{
			$output['msg'] = 'No people found on the leaderboard.';
			if ( $theme_id )
			{
				$leaders = R::find( $this->people_tbl, '`theme_id` = ? ORDER BY `time` ASC', array( $theme_id ) );	
				$full_names = array( );
				$x = 0;
				if ( $leaders ):
					foreach( $leaders as $leader ):
						if ( !in_array( $leader->full_name, $full_names ) && $x <= 10 ):
							$output['people'][]		= array( 'full_name' => $leader->full_name, 'time' => $leader->time );
							$full_names[] = $leader->full_name;
							$x++;
						endif;
					endforeach;
				$output['msg'] = 'Leaders found.';
				endif;
			}
		}

		unset( $this->data );

		if ( !is_null( $output ) )
			$output = json_encode( $output );
		else
			$output = '';
			
		$response = new Response( $output, Response::HTTP_OK );
		if ( !empty( $output ) )
			$response->headers->set( 'Content-Type', 'application/json' );

		return $response;
	}
	
	public function get_latest_puzzles( Request $request )
	{
		$method				= $request->getMethod();
		$this->data			= json_decode( $request->getContent() );
		$this->host			= 'http://' . $request->getHttpHost();
		
		$output = array( );
		if ( "GET" === $method )
		{
			$output['msg'] = 'No puzzles found.';
			$puzzles = R::find( $this->theme_tbl, '`visible` = ? ORDER BY `timestamp` DESC LIMIT 10', array( 1 ) );	
			if ( $puzzles ):
				foreach( $puzzles as $puzzle ):
					$output['puzzles'][]		= array( 'name' => $puzzle->name, 'slug' => $puzzle->slug );
				endforeach;
			$output['msg'] = 'Puzzles found.';
			endif;
		}

		unset( $this->data );

		if ( !is_null( $output ) )
			$output = json_encode( $output );
		else
			$output = 'ss';
			
		$response = new Response( $output, Response::HTTP_OK );
		if ( !empty( $output ) )
			$response->headers->set( 'Content-Type', 'application/json' );

		return $response;
	}
	
	private function scrub( $p )
	{
		$p = strip_tags( $p );
		$p = stripslashes( $p );
		$p = trim( $p );
		return $p;
	}
}
endif;
