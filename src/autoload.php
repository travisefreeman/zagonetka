<?php

if ( !function_exists( "untrailingslashit" ) ):
function untrailingslashit( $string )
{
	return rtrim( $string, "/\\" );
}
endif;

if ( !function_exists( "trailingslashit" ) ):
function trailingslashit( $string )
{
	return untrailingslashit( $string )."/";
}
endif;

if ( !class_exists( "Generic_Autoload" ) ):
class Generic_Autoload
{
	public $dir;

	function __construct( $dir = "" )
	{
		if ( ! empty( $dir ) )
			$this->dir = trailingslashit( $dir );
		else 
			$this->dir = trailingslashit( ( @__DIR__ == "__DIR__" ) && define( "__DIR__", realpath( dirname( __FILE__ ) ) ) );

		spl_autoload_register( array( $this, "spl_autoload_register" ) );
	}

	function spl_autoload_register( $class_name )
	{
		$class_path = str_replace( "\\", "/", $this->dir.$class_name.".php" );

		if ( file_exists( $class_path ) )
			include $class_path;
	}
}
endif;

$generic_autoload = new Generic_Autoload( __DIR__ );