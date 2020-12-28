'use strict';

var gulp = require( 'gulp' );
var del = require( 'del' );
var config = require('./jsdoc.json');
var jsdoc = require( 'gulp-jsdoc3' );

var DIR = {
	DOCS: 'build/docs/'
};


gulp.task( 'default', function ( done, cb ) {
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
