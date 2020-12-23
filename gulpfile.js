'use strict';

var gulp = require( 'gulp' );
var del = require( 'del' );
var replace = require( 'gulp-replace' );
var remoteSrc = require( 'gulp-remote-src' );
var log = require( 'fancy-log' );
var decompress = require('gulp-decompress');

var jsdoc = require( 'gulp-jsdoc3' );
var config = require('./jsdoc.json');

var packageContent = require('./package.json');

var DIR = {
	DOCS: 'build/docs/'
};


gulp.task( 'set-versions', function ( done ) {
	gulp.src(
		[ 'examples/jsm/loaders/OBJLoader2.js' ]
	)
	.pipe( replace( /OBJLoader2\.OBJLOADER2_VERSION\s*=.*/g,
		"OBJLoader2.OBJLOADER2_VERSION = '"+ packageContent.version + "';" ) )
	.pipe( gulp.dest( "examples/jsm/loaders" ) );

	gulp.src(
		[ 'examples/jsm/loaders/OBJLoader2Parallel.js' ]
	)
	.pipe( replace( /OBJLoader2Parallel\.OBJLOADER2_PARALLEL_VERSION\s*=.*/g,
		"OBJLoader2Parallel.OBJLOADER2_PARALLEL_VERSION = '"+ packageContent.version + "';" ) )
	.pipe( gulp.dest( "examples/jsm/loaders" ) );
	done();
} );


gulp.task( 'create-docs', function ( done, cb ) {
	del.sync( DIR.DOCS + 'fonts' );
	del.sync( DIR.DOCS + 'img' );
	del.sync( DIR.DOCS + 'scripts' );
	del.sync( DIR.DOCS + 'styles' );
	del.sync( DIR.DOCS + '*.html' );
	del.sync( DIR.DOCS + '*.md' );
	gulp.src( [
			'examples/jsm/loaders/OBJLoader2.js',
			'examples/jsm/loaders/OBJLoader2Parallel.js'
		],
			{ read: false }
		)
		.pipe( jsdoc( config, cb ) );

	gulp.src( [
			'README.md',
			'CHANGELOG.md'
		] )
		.pipe( gulp.dest( DIR.DOCS ) );
	done();
} );


gulp.task( 'dl-ptv1', function( done ) {
	log( 'Downloading model PTV1:' );
	return remoteSrc(
		[ 'PTV1.zip' ],	{
			base: 'https://kaisalmen.de/resource/obj/PTV1/'
		}
	)
	.pipe( decompress() )
	.pipe( gulp.dest( './resource/obj/PTV1/' ) );
	done();
} );

gulp.task( 'dl-sink', gulp.series( 'dl-ptv1', function( done ) {
	log( 'Downloading model Sink created by Cornelius Dämmrich (https://corneliusdammrich.com/):' );
	return remoteSrc(
		[ 'zomax-net_haze-sink-scene.zip' ], {
			base: 'https://kaisalmen.de/resource/obj/zomax/'
		}
	)
	.pipe( decompress() )
	.pipe( gulp.dest( './resource/obj/zomax/' ) )
	.done();
} ) );

gulp.task( 'dl-oven', gulp.series( 'dl-sink', function( done ) {
	log( 'Downloading model Oven created by Cornelius Dämmrich (https://corneliusdammrich.com/):' );
	return remoteSrc(
		[ 'zomax-net_haze-oven-scene.zip' ], {
			base: 'https://kaisalmen.de/resource/obj/zomax/'
		}
	)
	.pipe( decompress() )
	.pipe( gulp.dest( './resource/obj/zomax/' ) )
	.done();
} ) );



gulp.task(
	'get-resources',
	gulp.series(
		'dl-oven'
	)
);


gulp.task(
	'default',
	gulp.series(
		'set-versions',
		'create-docs'
	)
);
