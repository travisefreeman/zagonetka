var Puzla = Puzla || {};

Puzla.App = function( )
{
	var canvas, media, media2, mediaBackground, stage, videoPuzzle, videoPuzzle2, ctx, inMemCanvas, inMemCtx;
	var colorMode					= 'color';
	var currentConnectedPuzzleIndex	= 2;
	var everyNthTickSeconds			= 0;
	var isConnectedPuzzlePiece		= false;
	var isPuzzleMoveMade				= false;
	var mediaplaying					= false;
	var microSecondsPlayed			= 0;
	var production					= true;
	var puzzle						= {};
	var puzzleFinished				= false;
	var quit							= false;
	var secondsPlayed				= 0;
	var start						= false;
	var stageReady					= false;
	var testTotalPieces				= false;
	var updateTick					= true;
	var videoPuzzleFrames			= [];
	
	/* Misc */
	
	var consoleLog = function ( text )
	{
		if ( production )
		{
			return true;
		}
		console.log( text );
		return null;
	};
	
	var intersect = function( obj1, obj2 )
	{
	  objBounds1	= obj1.getBounds().clone();
	  objBounds2	= obj2.getBounds().clone();
	  pt				= obj1.globalToLocal(objBounds2.x, objBounds2.y );
	  h1				= -( objBounds1.height / 2 + objBounds2.height );
	  h2				= objBounds2.width / 2;
	  w1				= -( objBounds1.width / 2 + objBounds2.width );
	  w2				= objBounds2.width / 2;
	  
	  if ( pt.x > w2 || pt.x < w1 )
	  {
		  return false;
	  }
	  
	  if ( pt.y > h2 || pt.y < h1 )
	  {
		  return false;
	  }
	  
	  return true;
	};
	
	var isSavedPerson = function()
	{
		var saved	= $.cookie( 'puzla_person_name_save' );
		if ( !saved )
		{
			/* Disabled the saving of person's name via cookies */
			//$( '#modal-notification' ).trigger( 'openModal' );
		}	
	};
	
	var savedName = function()
	{
		var savedPersonName	= $.cookie( 'puzla_person_name' );
		var saved			= $.cookie( 'puzla_person_name_save' );
	
		var isSaved = false;
	
		if ( 1 === parseFloat( saved ) )
		{
			if ( savedPersonName )
			{
				puzlaPerson.name	= savedPersonName;
				isSaved			= true;
			}
		}
		
		if ( isSaved )
		{
			startPuzzle();
			puzlaSlider.goToSlide( 2 );
		}
		else
		{
			puzlaSlider.goToSlide( 1 );
		}	
		
	};
	
	/* validate email address */
	
	var validateEmail = function( email )
	{
		var re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
		return re.test( email );
	};
	
	/* generate a random integer */
	
	var getRandomInt = function( min, max )
	{
		return Math.floor( Math.random( ) * ( max - min + 1 ) ) + min;
	};
	
	/* ensure width & height submitted fit the default puzzle specs */
	
	var resizePuzzleWidthHeight = function( width, height )
	{ 
		specs		= { };
		width_max	= puzlaSettings.imageMaxWidth;
		height_max	= puzlaSettings.imageMaxHeight;
		width_new	= parseFloat( width );
		height_new	= parseFloat( height );
		orientation	= 'landscape';
		
		if ( height > width ) {
			orientation = 'portrait';
		}
		
		specs.orientation 	= orientation;
		
		if ( 'landscape' == orientation ) {
			if 	( width_new > width_max ) {
				ratio		= width_max / width_new;
				width_new	= width_max;
				height_new	= Math.round( height_new * ratio );
			}
		}
		
		if ( 'portrait' == orientation ) {
			if 	( height_new > height_max ) {
				ratio		= height_max / height_new;
				width_new 	= Math.round( width_new * ratio );
				height_new	= height_max;
			}
		}
		
		if 	( width_new > width_max ) {
			ratio		= width_max / width_new;
			width_new	= width_max;
			height_new	= Math.round( height_new * ratio );
		}
		
		if 	( height_new > height_max ) {
			ratio		= height_max / height_new;
			width_new 	= Math.round( width_new * ratio );
			height_new	= height_max;
		}
		
		specs.width		= width_new;
		specs.height		= height_new;
		return specs;
	};
	
	/* Video */
	
	var updateVideoCurrentTime = function()
	{
		if ( "video" !== puzlaSettings.mediaType )
		{
			return false;
		}
		
		if ( isConnectedPuzzlePiece )
		{
			currentConnectedPuzzleIndex--;
			videoPuzzle.currentTime = videoPuzzleFrames[currentConnectedPuzzleIndex];
			consoleLog( 'Current Connected Puzzle Index: ' + currentConnectedPuzzleIndex );
			consoleLog( videoPuzzle );
		}
		
		isConnectedPuzzlePiece = false;
		return true;
	};
	
	var playVideo = function()
	{
		if ( "video" !== puzlaSettings.mediaType )
		{
			return false;
		}
		
		puzzleContainer			= stage.getChildByName( 'puzzle_container' );
		videoContainer			= puzzleContainer.getChildByName( 'videoContainer' );
		videoContainer.visible	= true;
		mediaplaying			= true;
		media2.play();
		
		/*tempVideo				= document.createElement( 'video' );
		tempVideo.src			= puzlaSettings.mediaDirectory + puzlaSettings.mediaFile;
		tempVideo.autoplay		= false;
		tempVideo.volume		= 0.5;
		tempVideo.currentTime	= 0;
		tempVideo.controls		= true;
		
		tempVideo.addEventListener( 'loadeddata', function() {
			displayModalContent( 'Play The Video', '' );
			$( '#modal-dialog .modal-info .modal-content' ).append( '<p>Congratulations on completing the video puzzle. You can play it to see it in full.</p>' );
			$( '#modal-dialog .modal-info .modal-content' ).append( this );
			
			openModal();
		});*/
		
		return true;
	};
	
	/* Puzzle */
	
	var init = function( )
	{
		createjs.Sound.registerSound( puzlaSettings.uri + "assets/sound-connect.mp3", 'puzzle_connect' );
		createjs.Sound.registerSound( puzlaSettings.uri + "assets/sound-applause.mp3", 'puzzle_applause' );

		canvas		= document.getElementById( 'playground' );
		ctx			= canvas.getContext( '2d' );
		inMemCanvas	= document.createElement( 'canvas' ); // Make our in-memory canvas
		inMemCtx	= inMemCanvas.getContext( '2d' );
		stage		= new createjs.Stage( canvas );
		
		createjs.Touch.enable( stage ); // enable touch interactions if supported on the current device:
		stage.enableMouseOver( 10 ); // enabled mouse over / out events
		stage.mouseMoveOutside = true; // keep tracking the mouse even when it leaves the canvas
		displayModalLoading( 'Please hold while the puzzle pieces load and shuffle' );
		openModal();
		
		if ( 'video' === puzlaSettings.mediaType )
		{
			videoPuzzle				= document.createElement( 'video' );
			videoPuzzle.id			= 'video1';
			videoPuzzle.src			= puzlaSettings.mediaDirectory + puzlaSettings.mediaFile;
			videoPuzzle.autoplay		= false;
			videoPuzzle.volume		= 0.5;
			videoPuzzle.hidden		= false;
			videoPuzzle.currentTime = puzlaSettings.mediaDuration;
			
			videoPuzzle.addEventListener( 'loadeddata', function() {
				handleVideoLoad( videoPuzzle );
			});
		}
		else
		{
			graphic			= new Image(); // load the source image:
			graphic.src		= puzlaSettings.mediaDirectory + puzlaSettings.mediaFile;
			graphic.onload	= handleImageLoad;
		}
	};
	
	var handleImageLoad = function( event )
	{
		media			= event.target;
		puzzle.width	= media.width;
		puzzle.height	= media.height;
		resizePuzzleCanvas();
		closeModal();
		savedName();
	};
	
	var handleVideoLoad = function( video )
	{
		var myBuffer		= new createjs.VideoBuffer( video );
		var myBitmap		= new createjs.Bitmap( myBuffer );
		mediaBackground	= myBuffer.getImage();
		specs			= resizePuzzleWidthHeight( video.videoWidth, video.videoHeight );
		media 			= video;
		
		puzzle.width	= specs.width;
		puzzle.height	= specs.height;
		
		videoPuzzle2				= document.createElement( 'video' );
		videoPuzzle2.id				= 'videoTwo';
		videoPuzzle2.src			= puzlaSettings.mediaDirectory + puzlaSettings.mediaFile;
		videoPuzzle2.autoplay		= false;
		videoPuzzle2.volume			= 0.5;
		videoPuzzle2.hidden			= false;
		videoPuzzle2.currentTime	= 0;
		
		videoPuzzle2.addEventListener( 'loadeddata', function() {
			handleVideoLoad2( videoPuzzle2 );
		});
		
		videoPuzzle2.addEventListener( 'ended', function() {
			mediaplaying = false;
		});
	};
	
	var handleVideoLoad2 = function( video )
	{
		media2 	= video;
		resizePuzzleCanvas();
		closeModal();
		savedName();
	};
	
	var startPuzzle = function()
	{
		isSavedPerson();
		$( '.puzla_hello_name' ).html( puzlaPerson.name );
		puzzle.people = { 'full_name' : puzlaPerson.name };
		
		if ( mediaplaying )
		{
			media2.pause();
		}
			
		colorMode				= 'color';
		isConnectedPuzzlePiece	= false;
		puzzleFinished			= false;
		start					= false;
		quit					= false;
		secondsPlayed			= 0;
		stageReady				= true;
		mediaplaying			= false;
		
		if ( 'video' === puzlaSettings.mediaType )
		{
			videoPuzzle.currentTime		= puzlaSettings.mediaDuration;
			//videoPuzzle2.currentTime	= 0;
		}
		
		$( '.puzla_timer' ).html( '0' );
		resizePuzzleCanvas();
		stage.removeAllChildren();
		
		containerBackground			= new createjs.Shape();
		containerBackground.x		= 0;
		containerBackground.y		= 0;
		containerBackground.regX	= 0;
		containerBackground.regY	= 0;
		//containerBackground.graphics.beginFill( '#fff' ).drawRect( 0, 0, canvas.width , canvas.height );
		containerBackground.graphics.drawRect( 0, 0, canvas.width , canvas.height );
		stage.addChild( containerBackground );
		
		container				= new createjs.Container();
		container.x				= canvas.width / 2;
		container.y				= canvas.height / 2;
		container.regX			= puzzle.width / 2;
		container.regY			= puzzle.height / 2;
		container.name			= 'puzzle_container';
		
		stage.addChild( container );
		
		puzzleBackground		= new createjs.Shape();
		puzzleBackground.shadow = new createjs.Shadow( '#494949', 1, 1, 5 );
		puzzleBackground.x		= 0;
		puzzleBackground.y		= 0;
		puzzleBackground.regX	= 0;
		puzzleBackground.regY	= 0;
		puzzleBackground.name	= 'pbg';
		puzzleBackground.graphics.beginFill( '#E8E8E8' ).drawRect( 0, 0, puzzle.width, puzzle.height );
		
		container.addChild( puzzleBackground );
		
		puzzle.id				= puzlaSettings.puzzleID;
		puzzle.connections		= 0;
		puzzle.valid			= true;
		puzzle.name				= puzlaSettings.puzzleName;
		puzzle.boundary_left	= 0 - ( ( canvas.width - puzzle.width ) / 2 );
		puzzle.boundary_right	= ( ( canvas.width - puzzle.width ) / 2 ) + puzzle.width;
		puzzle.boundary_top		= 0 - ( ( canvas.height - puzzle.height ) / 2 );
		puzzle.boundary_bottom	= ( ( canvas.height - puzzle.height ) / 2 ) + puzzle.height;
		puzzle.moves			= 0;
		puzzle.settings			= puzlaSettings;
		
		if ( puzzle.width < puzlaSettings.imageMinWidth || puzzle.width > puzlaSettings.imageMaxWidth )
		{
			puzzle.message	= 'The media asset does not meet minimum width or exceeds the maximum width.';
			puzzle.valid		= false;
		}
		if ( puzzle.height < puzlaSettings.imageMinHeight || puzzle.height  > puzlaSettings.imageMaxHeight  )
		{
			puzzle.message	= 'The media asset does not meet minimum height or exceeds the maximum height.';
			puzzle.valid		= false;
		}
		
		if ( puzzle.valid )
		{
			if ( puzzle.height > puzzle.width )
			{
				puzzle.orientation = 'portrait';
			}
			else if ( puzzle.width === puzzle.height )
			{
				puzzle.orientation = 'square';
			}
			else
			{
				puzzle.orientation = 'landscape';
			}
			
			block_height			= puzzle.height / puzlaSettings.puzzlePieceLength;
			block_height_rounded	= Math.floor( block_height );
			
			if ( block_height_rounded === block_height )
			{
				puzzle.rows = block_height;
			}
			else
			{
				puzzle.rows				= block_height_rounded;
				height_one_off			= ( parseFloat( block_height ) - parseFloat( block_height_rounded ) );
				puzzle.height_one_off	= puzlaSettings.puzzlePieceLength + ( puzlaSettings.puzzlePieceLength * parseFloat( height_one_off.toFixed( 2 ) ) );
				puzzle.row_one_off		= getRandomInt( 1, puzzle.rows );
			}
			
			block_length			= puzzle.width / puzlaSettings.puzzlePieceLength;
			block_length_rounded	= Math.floor( block_length );
			
			if ( block_length_rounded === block_length )
			{
				puzzle.cols = block_length;
			}
			else
			{
				puzzle.cols				= block_length_rounded;
				width_one_off			= ( parseFloat( block_length ) - parseFloat( block_length_rounded ) );
				puzzle.width_one_off	= puzlaSettings.puzzlePieceLength + ( puzlaSettings.puzzlePieceLength * parseFloat( width_one_off.toFixed( 2 ) ) );
				puzzle.col_one_off		= getRandomInt( 1, puzzle.cols );
			}
			
			puzzle.length		= puzlaSettings.puzzlePieceLength;
			puzzle.total_pieces	= puzzle.cols * puzzle.rows;
			
			if ( testTotalPieces )
			{
				puzzle.total_pieces = testTotalPieces;
			}
			
			currentConnectedPuzzleIndex	= puzzle.total_pieces - 1;
			temp						= puzlaSettings.mediaDuration / puzzle.total_pieces;
			
			for( x = 1; x <= puzzle.total_pieces; x++ )
			{
				y						= x - 1;
				n						= Math.floor( x * temp );
				videoPuzzleFrames[y]	= n;	
			}
			
			puzzle.videoPuzzleFrames	= videoPuzzleFrames;
			col							= 1;
			row							= 1;
			bitmap_x_coor				= 0;
			bitmap_y_coor				= 0;
			puzzle_piece_x_coor 		= 0;
			puzzle_piece_y_coor 		= 0;
			is_new_row					= false;
			prev_h						= puzzle.length;
			puzzle.random_coords		= [];
			
			for( pieces = 1; pieces <= puzzle.total_pieces; pieces++ )
			{
				w = puzzle.length;
				h = puzzle.length;
				
				if ( col > puzzle.cols ) // if col count exceeds max cols, then reset column count and then initiate new row
				{
					col = 1;
					row++;
					is_new_row = true;
				}
				
				if ( puzzle.row_one_off ) // if a row one-off exists, get height of one-off row
				{
					if ( row == puzzle.row_one_off )
					{
						h = puzzle.height_one_off;
					}
				}
				
				if ( puzzle.col_one_off ) // if a column one-off exists, get width of one-off column
				{
					if ( col == puzzle.col_one_off )
					{
						w = puzzle.width_one_off;
					}
				}
				
				if ( is_new_row )
				{
					bitmap_x_coor		= 0;
					puzzle_piece_x_coor = 0;
					bitmap_y_coor		= bitmap_y_coor - prev_h;
					puzzle_piece_y_coor	= puzzle_piece_y_coor + prev_h;
					is_new_row			= false;
				}
				
				prev_h							= h;
				random_x_coor					= getRandomInt( puzzle.boundary_left, ( puzzle.boundary_right - w ) );
				random_y_coor					= getRandomInt( puzzle.boundary_top, ( puzzle.boundary_bottom - h ) );
				puzzle.random_coords[pieces]	= { };
				puzzle.random_coords[pieces].x	= random_x_coor;
				puzzle.random_coords[pieces].y	= random_y_coor;
				
				shape	= new createjs.Shape(); // Create the shape that will mask the graphic
				shape.graphics.drawRect( 0, 0, w, h );
				
				bitmap			= new createjs.Bitmap( media );
				bitmap.x		= bitmap_x_coor;
				bitmap.y		= bitmap_y_coor;
				bitmap.regX		= 0;
				bitmap.regY		= 0;
				bitmap.cursor	= 'pointer';
				bitmap.mask		= shape;
				bitmap.name		= 'bitmap';
				
				puzzle_piece	= new createjs.Container(); // Create the puzzle container that will contain the bitmap
				
				if ( mediaBackground )
				{
					backgroundBitmap		= new createjs.Bitmap( mediaBackground );
					backgroundBitmap.x		= bitmap_x_coor;
					backgroundBitmap.y		= bitmap_y_coor;
					backgroundBitmap.regX	= 0;
					backgroundBitmap.regY	= 0;
					backgroundBitmap.mask	= shape;
					backgroundBitmap.name	= 'backgroundBitmap';
					puzzle_piece.addChild( backgroundBitmap );
				}
				
				puzzle_piece.addChild( bitmap ); // Add the bitmap to the puzzle piece container
				
				puzzle_piece.x				= random_x_coor;
				puzzle_piece.y				= random_y_coor;
				puzzle_piece.regX			= 0;
				puzzle_piece.regY			= 0;
				puzzle_piece.placement		= { };
				puzzle_piece.placement.x	= puzzle_piece_x_coor;
				puzzle_piece.placement.y	= puzzle_piece_y_coor;
				puzzle_piece.placement.w	= w;
				puzzle_piece.placement.h	= h;
				puzzle_piece.name			= 'puzzle_block_' + pieces;
				puzzle_piece.connected		= { };
				
				if ( 'bw' === colorMode )
				{
					color = new createjs.ColorMatrix().adjustSaturation( 0 );
					puzzle_piece.filters = [
						new createjs.ColorMatrixFilter( color ),
					];
					puzzle_piece.cache( 0, 0, w, h );
				}
			
				puzzle_piece.on( 'mousedown', function( evt ) {
					this.parent.addChild( this );
					this.offset = { x: this.x - evt.stageX, y: this.y - evt.stageY };
				});
				
				puzzle_piece.on( 'pressup', function( evt ) {
					destination				= container.getChildByName( "puzzle_block_2" );
					block					= evt.currentTarget;
					corner					= { };
					corner.top_left_x		= block.x;
					corner.top_left_y		= block.y;
					corner.top_right_x		= block.x + block.placement.w;
					corner.top_right_y		= block.y;
					corner.bottom_left_x	= block.x;
					corner.bottom_left_y	= block.y + block.placement.h;
					corner.bottom_right_x	= block.x + block.placement.w;
					corner.bottom_right_y	= block.y + block.placement.h;
					
					current_x	= parseFloat( corner.top_right_x );
					connect_x	= parseFloat( destination.x );
					current_y	= parseFloat( corner.top_right_y );
					connect_y	= parseFloat( destination.y );
					buffer		= parseFloat( puzlaSettings.fitRangeDistance );

					if ( !block.connected.right )
					{
						if ( ( current_x == connect_x || ( current_x >= ( connect_x - buffer ) && current_x <= ( connect_x + buffer ) ) ) && ( current_y == connect_y || ( current_y >= ( connect_y - buffer ) && current_y <= ( connect_y + buffer ) ) ) )
						{
							block.connected.right = 2;
							this.set( { x : ( destination.x - block.placement.w ), y : destination.y } );
							updateTick = true;
						}
					}
					else
					{
						
					}
					
					if ( isPuzzleMoveMade )
					{
						puzzle.moves++;
						isPuzzleMoveMade = false;
					}
					
					if ( !start )
					{
						$( '.puzla_phase' ).addClass( 'hide' );
						$( '.puzla_phase_2' ).removeClass( 'hide' );
						start			= true;
						secondsPlayed	= 0;
					}
					
					current_x	= parseFloat( this.x );
					connect_x	= parseFloat( this.placement.x );
					current_y	= parseFloat( this.y );
					connect_y	= parseFloat( this.placement.y );
					buffer		= parseFloat( puzlaSettings.fitRangeDistance );
					
					if ( ( current_x == connect_x || ( current_x >= ( connect_x - buffer ) && current_x <= ( connect_x + buffer ) ) ) && ( current_y == connect_y || ( current_y >= ( connect_y - buffer ) && current_y <= ( connect_y + buffer ) ) ) )
					{
						this.set( { x : this.placement.x, y : this.placement.y } );
						puzzle.connections++;
						createjs.Sound.play( 'puzzle_connect' );
						//this.children[0].image.currentTime = 1;
						
						this.mouseEnabled		= false;
						isConnectedPuzzlePiece	= true;
						this_child				= container.getChildByName( this.name );
						
						container.setChildIndex( this_child, 1 );
						
						updateTick = true;
						
						if ( puzzle.connections >= puzzle.total_pieces )
						{
							$( '.puzla_timer_done' ).html( secondsPlayed );
							$( '.puzla_phase' ).addClass( 'hide' );
							$( '.puzla_phase_3' ).removeClass( 'hide' );
							puzzle.seconds_completed = secondsPlayed;
							putPuzzleScore( puzzle );
							//createjs.Sound.play( 'puzzle_applause' );
							start					= false;
							createjs.Ticker.paused	= true;
							puzzleFinished			= true;
							playVideo();
						}
					}
				});
			
				puzzle_piece.on( 'pressmove', function( evt )
				{
					
					isPuzzleMoveMade	= true;
					this.x				= evt.stageX + this.offset.x;
					this.y				= evt.stageY + this.offset.y;
					updateTick			= true; // indicate that the stage should be updated on the next tick:
					updateVideoCurrentTime( );
				});
			
				container.addChild( puzzle_piece ); // Add the puzzle piece to the overall container
				
				bitmap_x_coor		= bitmap_x_coor - w;
				puzzle_piece_x_coor	= puzzle_piece_x_coor + w;
				col++;
			}
		}
		
		if ( "video" === puzlaSettings.mediaType )
		{
			
			videoBitmap			= new createjs.Bitmap( media2 );
			videoBitmap.x		= 0;
			videoBitmap.y		= 0;
			videoBitmap.regX	= 0;
			videoBitmap.regY	= 0;
			videoBitmap.name	= 'videoBitmap';
			
			videoContainer		= new createjs.Container();
			videoContainer.x	= 0;
			videoContainer.y	= 0;
			videoContainer.regX	= 0;
			videoContainer.regY	= 0;
			videoContainer.name	= 'videoContainer';
			videoContainer.visible = false;
			
			videoContainer.addChild( videoBitmap );
			container.addChild( videoContainer );
		}
		
		createjs.Ticker.setFPS( 60 );
		createjs.Ticker.addEventListener( 'tick', tick );
		createjs.Ticker.paused	= true;
		updateTick				= true;
		consoleLog( 'startPuzzle:' );
		consoleLog( puzzle );
	};
	
	var resizePuzzleCanvas = function()
	{
		navHeight			= $( 'nav' ).innerHeight();
		subnavHeight		= $( '.sub-nav' ).innerHeight();
		topMenuHeight		= parseFloat( navHeight ) + parseFloat( subnavHeight );
		playgroundWidth		= $( window ).width();
		playgroundheight	= $( window ).height();
		playgroundheight	= playgroundheight - topMenuHeight;
			
		if ( stageReady )
		{
			puzzleContainer	= stage.getChildByName( 'puzzle_container' );
			if ( puzzleContainer !== null )
			{
				x		= Math.ceil( canvas.width / 2 );
				y		= Math.ceil( canvas.height / 2 );
				regX	= Math.ceil( puzzle.width / 2 );
				regY	= Math.ceil( puzzle.height / 2 );
				puzzleContainer.set( { 'x': x, 'y': y, 'regX': regX, 'regY':regY } );//
				updateTick	= true;
			}
		}
		
		/* Taken from http://jsfiddle.net/simonsarris/weMbr/ */
		inMemCanvas.width	= canvas.width;
		inMemCanvas.height	= canvas.height;
		
		inMemCtx.drawImage( canvas, 0, 0 );
		
		canvas.width	= playgroundWidth;
		canvas.height	= playgroundheight;
		
		ctx.drawImage( inMemCanvas, 0, 0 );
		return true;
	};
	
	var uploadPuzzle = function( info )
	{
		$.ajax({
			method: "POST",
			url: puzlaSettings.uri + 'api/create',
			contentType: 'application/json; charset=utf-8',
			dataType: 'json',
			data: JSON.stringify( info )
		})
		.done(function( obj ) {
			$( '.puzla-custom-link' ).html( '<a href="' + obj.link + '" target="_blank">' + obj.link + '</a>' );
			$( '.upload-step-3' ).addClass( 'hide' );
			$( '.upload-step-4' ).removeClass( 'hide' );
		});
	};
	
	var quitPuzzle = function()
	{
		if ( !quit )
		{
			start				= false;
			puzzle_container	= stage.getChildByName( 'puzzle_container' );
			black_white			= new createjs.ColorMatrix().adjustSaturation( -100 );
			
			for ( pieces = 1; pieces <= puzzle.total_pieces; pieces++ )
			{
				puzzle_block = puzzle_container.getChildByName( 'puzzle_block_' + pieces );
				w  = puzzle_block.placement.w;
				h  = puzzle_block.placement.h;
				puzzle_block.filters = [
					new createjs.ColorMatrixFilter( black_white ),
				];
				puzzle_block.cache( 0, 0, w, h );
				puzzle_block.removeAllEventListeners( 'mousedown' );
				puzzle_block.removeAllEventListeners( 'pressup' );
				puzzle_block.removeAllEventListeners( 'pressmove' );
				bit = puzzle_block.getChildByName( 'bitmap' );
				bit.set( { 'cursor' : 'default' } );
			}
			
			if ( mediaplaying )
			{
				media2.pause();
			}
			
			colorMode		= 'bw';
			mediaplaying	= false;
			updateTick		= true;
			quit			= true;
			puzzleFinished	= true;
		}
	};
	
	/* Tic Toc */
	
	var tick = function( event )
	{
		
		microSecondsPlayed++;
		if ( microSecondsPlayed >= 60 )
		{
			secondsPlayed++;
			everyNthTickSeconds++;
			microSecondsPlayed = 0;
		}
		if ( start )
		{
			if ( secondsPlayed >= puzlaSettings.timeout )
			{
				$( '.puzla_phase' ).addClass( 'hide' );
				$( '.puzla_phase_4' ).removeClass( 'hide' );
				quitPuzzle();
			}
			$( '.puzla_timer' ).html( secondsPlayed );
		}
		
		if ( updateTick )
		{
			if ( !mediaplaying )
			{
				updateTick = false; // only update tick once
				stage.update( event );
			}
		}
		
		if ( mediaplaying )
		{
			stage.update( event );
		}
		
		if ( everyNthTickSeconds >= 5 )
		{
			if ( puzzleFinished )
			{
				if ( !mediaplaying )
				{
					tickStop();	
				}
			}
			everyNthTickSeconds = 0;
		}
	};
	
	var tickStop = function()
	{
		createjs.Ticker.removeEventListener( 'tick', tick );
	};
		
	/* Score */
	
	var putPuzzleScore = function( info )
	{
		$.ajax({
			method		: "POST",
			url			: puzlaSettings.uri + 'api/people',
			contentType	: 'application/json; charset=utf-8',
			dataType	: 'json',
			data		: JSON.stringify( info )
		})
		.done(function( obj ) {
			
		});
		return null;
	};
	
	/* Modals */
	
	var displayModalLoading = function( title )
	{
		$( '#modal-dialog .modal-loading .modal-content' ).html( title );
		return true;
	};
	
	var displayModalContent = function( title, content )
	{
		$( '#modal-dialog .modal-info .modal-title' ).html( title );
		$( '#modal-dialog .modal-info .modal-content' ).html( content );
		$( '.modal-loading' ).addClass( 'hide' );
		$( '.modal-info' ).removeClass( 'hide' );
		return true;
	};
	
	var openModal = function()
	{
		$( '#modal-dialog' ).trigger( 'openModal' );
		return true;
	};
	
	var closeModal = function()
	{
		$( '#modal-dialog' ).trigger( 'closeModal' );
		return true;
	};
	
	/* Public Methods */
	
	var oPublic =
	{
		init				: init,
		startPuzzle			: startPuzzle,
		quitPuzzle			: quitPuzzle,
		uploadPuzzle		: uploadPuzzle,
		displayModalLoading	: displayModalLoading,
		displayModalContent	: displayModalContent,
		openModal			: openModal,
		validateEmail		: validateEmail,
		resizePuzzleCanvas	: resizePuzzleCanvas,
	};
	
    return oPublic;
}();

var puzlaSlider;
var puzlaFileUploaded	= false;
var puzlaPerson			=
{
	name		: false,
	email		: false,
	puzzleName	: false,
};

$(function() {
	$( document ).foundation();
	
	puzlaSlider = $( '.bxslider' ).bxSlider({
		touchEnabled	: false,
		controls		: false,
		pager			: false,
		mode			: 'fade',
	});
	
	$( '.easy-modal' ).easyModal({
		top					: 58,
		overlayOpacity		: 0.8,
		closeOnEscape		: false,
		hasVariableWidth	: true,
	});
	
	Puzla.App.init();
	
	$( '.easy-modal-close' ).on( 'click', function( e )
	{
		$( '.easy-modal' ).trigger( 'closeModal' );
	});
	
	$( '.puzla-leaderboard-btn' ).on( 'click', function( e )
	{
		Puzla.App.displayModalLoading( 'Please hold while the scores load in' );
		Puzla.App.openModal( );
		$.ajax({
			method	: "GET",
			url		: puzlaSettings.uri + 'api/leaderboard/' + puzlaSettings.puzzleID,
		})
		.done( function( obj ) {
			leaderboard_content = '<p>For this <strong>' + puzlaSettings.puzzleName + '</strong> puzzle, the following players are in the top 10</p>';
			if ( obj.people )
			{
				leaderboard_content += '<table class="hover" style="width:100%;"><thead><tr><th style="width:50%;">Names</th><th style="width:50%;">Times</th></tr></thead><tbody>';
				people =  obj.people;
				for ( i = 0; i < people.length; i++ )
				{ 
					leaderboard_content += '<tr><td>' + people[i].full_name + '</td><td>' + people[i].time + '</td></tr>';
				}	
				leaderboard_content += '</tbody></table>';
			}
			Puzla.App.displayModalContent( 'Leaderboard', leaderboard_content );
		});
	});
	
	$( '.puzla-more-puzzles-btn' ).on( 'click', function( e )
	{
		Puzla.App.displayModalLoading( 'Please hold while I get the available puzzles' );
		Puzla.App.openModal();
		$.ajax({
			method: "GET",
			url: puzlaSettings.uri + 'api/puzzles/',
		})
		.done(function( obj ) {
			latest_puzzle_content = '<p>Check out the alternative puzzles and challenge yourself.</p>';
			if ( obj.puzzles )
			{
				latest_puzzle_content += '<table class="hover" style="width:100%;"><thead><tr><th style="width:70%;">Name</th><th style="width:30%;"></th></tr></thead><tbody>';
				latest_puzzles =  obj.puzzles;
				for ( i = 0; i < latest_puzzles.length; i++ )
				{ 
					latest_puzzle_content += '<tr><td>' + latest_puzzles[i].name + '</td><td><a href="' + puzlaSettings.uri + latest_puzzles[i].slug + '">Play</a></td></tr>';
				}	
				latest_puzzle_content += '</tbody></table>';
			}
			Puzla.App.displayModalContent( 'Latest Puzzles', latest_puzzle_content );
		});
	});
	
    $( '.puzla-rejig-btn' ).on( 'click', function( e )
	{
		$( '.puzla_phase' ).addClass( 'hide' );
		$( '.puzla_phase_1' ).removeClass( 'hide' );
		Puzla.App.startPuzzle();
	});
	
	$( '.puzla-quit-btn' ).on( 'click', function( e )
	{
		$( '.puzla_phase' ).addClass( 'hide' );
		$( '.puzla_phase_5' ).removeClass( 'hide' );
		Puzla.App.quitPuzzle();
	});
	
	$( '.puzla-start-btn' ).on( 'click', function( e )
	{
		e.preventDefault( );
		puzlaPerson.name = $( 'input[name="puzla_person_name"]' ).val( );
		if ( puzlaPerson.name )
		{
			Puzla.App.startPuzzle();
			puzlaSlider.goToSlide( 2 );
			
		}
		else
		{
			$( 'input[name="puzla_person_name"]' ).addClass( 'error' );
		}
	});
	
	$( '.puzla-menu-close-btn' ).on( 'click', function( e )
	{
		$( '.options-menu' ).addClass( 'hide' );
	});
	
	$( '.puzla-options-btn' ).on( 'click', function( e )
	{
		$( '.options-menu' ).removeClass( 'hide' );
	});
	
	$( '.puzla_save_name' ).on( 'click', function( e )
	{
		e.preventDefault( );
		$.cookie( 'puzla_person_name', puzlaPerson.name, { expires: 7, path: '/' });
		$.cookie( 'puzla_person_name_save', 1, { expires: 7, path: '/' });
		$( '#modal-notification' ).trigger( 'closeModal' );
	});
	
	$( '.puzla_dont_save_name' ).on( 'click', function( e )
	{
		e.preventDefault( );
		$.cookie( 'puzla_person_name_save', 0, { expires: 1, path: '/' });
		$( '#modal-notification' ).trigger( 'closeModal' );
	});
	
	$( '.puzla-upload-btn' ).on( 'click', function( e )
	{
		$( '#modal-upload' ).trigger( 'openModal' );
	});
	
	$( '.puzla-upload-step-email' ).on( 'click', function( e )
	{
		e.preventDefault( );
		puzlaPerson.email	= $( 'input[name="puzla_person_email"]' ).val( );
		puzlaIsEmail		= Puzla.App.validateEmail( puzlaPerson.email );
		if ( puzlaIsEmail )
		{
			$( '.upload-step-1' ).addClass( 'hide' );
			$( '.upload-step-2' ).removeClass( 'hide' );
		}
		else
		{
			$( 'input[name="puzla_person_email"]' ).addClass( 'error' );
		}
	});
	
	$( '.puzla-upload-step-puzzle-name' ).on( 'click', function( e )
	{
		e.preventDefault( );
		puzlaPerson.puzzleName = $( 'input[name="puzla_person_puzzle_name"]' ).val( );
		if ( puzlaPerson.puzzleName )
		{
			$( '.upload-step-2' ).addClass( 'hide' );
			$( '.upload-step-3' ).removeClass( 'hide' );
		}
		else
		{
			$( 'input[name="puzla_person_puzzle_name"]' ).addClass( 'error' );
		}
	});
	
	$( '.singleupload' ).on( 'click', function( e )
	{
		if ( !puzlaFileUploaded )
		{
			$( '#puzla_img_upload' ).trigger( 'click' );
		}
	});
	
	$( '#uploadbox' ).singleupload({
        action	: puzlaSettings.uri + 'api/upload',
        inputId	: 'puzla_img_upload',
        onError	: function( code, data ) {
			$( '.upload-msg' ).html( data.msg ).removeClass( 'success' ).addClass( 'error' ).removeClass( 'hide' );
        },
		onSuccess: function( url, data ) {
			$( '.upload-msg' ).html( data.msg ).removeClass( 'error' ).addClass( 'success' ).removeClass( 'hide' );
			puzlaFileUploaded = true;
			create = {
				'person_name'			: puzlaPerson.name,
				'person_email'			: puzlaPerson.email,
				'person_puzzle_name'	: puzlaPerson.puzzleName,
				'file'					: data.file,
			};
			Puzla.App.uploadPuzzle( create );
		},
		/*OnProgress: function( loaded, total ) {
			var percent = Math.round( loaded * 100 / total );
			console.log( percent + '%' );
        }*/
    });
	
	$( window ).resize( function()
	{
		Puzla.App.resizePuzzleCanvas();
	});	
});