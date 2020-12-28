'use strict';

var gulp = require( 'gulp' );
var del = require( 'del' );
var replace = require( 'gulp-replace' );
var config = require('./jsdoc.json');
var jsdoc = require( 'gulp-jsdoc3' );

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


gulp.task(
	'default',
	gulp.series(
		'set-versions',
		'create-docs'
	)
);
