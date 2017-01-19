'use strict';

var fs = require( 'fs' );

var gulp = require( 'gulp' );
var clean = require( 'gulp-clean' );
var rename = require( 'gulp-rename' );
var concat = require( 'gulp-concat' );
var uglify = require( 'gulp-uglify' );
var header = require( 'gulp-header' );
var replace = require( 'gulp-replace-task' );

var jsdoc = require( 'gulp-jsdoc3' );
var config = require('./jsdoc.json');

var DIR_BUILD = 'build/';
var DIR_DOC = 'build/doc';
var DIR_EXAMPLES = 'build/examples';

gulp.task( 'bundle-objloader2', function () {
	gulp.src(
			[
				'src/loaders/OBJLoader2.js',
				'src/loaders/OBJLoader2Parser.js',
				'src/loaders/OBJLoader2MeshCreator.js'
			]
		)
		// all input files are concatenated and then saved to OBJLoader2.js
		.pipe( concat( 'OBJLoader2.js' ) )
		.pipe( header( "/**\n  * @author Kai Salmen / www.kaisalmen.de\n  */\n\n'use strict';\n\n" ) )
		.pipe( gulp.dest( DIR_BUILD ) )

		// create minified version
		.pipe( uglify() )
		.pipe( rename( { basename: 'OBJLoader2.min' } ) )
		.pipe( gulp.dest( DIR_BUILD ) );
} );


gulp.task( 'bundle-wwobjloader2', function () {
	gulp.src(
			[
				'src/loaders/WWOBJLoader2.js',
				'src/loaders/WWOBJLoader2Director.js'
			]
		)
		.pipe( concat( 'WWOBJLoader2.js' ) )
		.pipe( header( "/**\n  * @author Kai Salmen / www.kaisalmen.de\n  */\n\n'use strict';\n\n" ) )
		.pipe( gulp.dest( DIR_BUILD ) )

		// create minified version
		.pipe( uglify() )
		.pipe( rename( { basename: 'WWOBJLoader2.min' } ) )
		.pipe( gulp.dest( DIR_BUILD ) );
} );

gulp.task( 'doc', function ( cb ) {
	gulp.src(
			[
				'README.md',
				'src/loaders/OBJLoader2.js',
				'src/loaders/OBJLoader2Parser.js',
				'src/loaders/OBJLoader2MeshCreator.js',
				'src/loaders/WWOBJLoader2.js',
				'src/loaders/WWOBJLoader2Director.js'
			],
			{
				read: false
			}
		)
		.pipe( jsdoc( config, cb ) );
});

gulp.task( 'clean-build', function () {
	gulp.src(
			DIR_DOC,
			{
				read: false
			}
		)
		.pipe( clean() );
});

gulp.task( 'create-examples', function () {
	var css_common = fs.readFileSync( 'test/common/common.css', 'utf8' );
	var css_main = fs.readFileSync( 'test/objloader2/main.css', 'utf8' );
	var template = fs.readFileSync( 'test/objloader2/OBJLoader2Verify.js', 'utf8' );
	gulp.src( [ 'test/objloader2/template/main.three.html' ] )
		// replace //STUB with complete content of OBJLoader2Verify.js
		.pipe( replace( {
			patterns: [
				{
					match: /\/\/STUB/g,
					replacement: template
				},
				{
					match: /\/\*STUB_CSS_COMMON\*\//g,
					replacement: css_common
				},
				{
					match: /\/\*STUB_CSS_MAIN\*\//g,
					replacement: css_main
				}
			]
		} ) )
		.pipe( rename( { basename: 'webgl_loader_objloader2' } ) )
		.pipe( gulp.dest( DIR_EXAMPLES ) );

	template = fs.readFileSync( 'test/wwobjloader2/WWOBJLoader2Verify.js', 'utf8' );
	css_main = fs.readFileSync( 'test/wwobjloader2/main.css', 'utf8' );
	gulp.src( [ 'test/wwobjloader2/template/main.three.html' ] )
	// replace //STUB with complete content of OBJLoader2Verify.js
		.pipe( replace( {
			patterns: [
				{
					match: /\/\/STUB/g,
					replacement: template
				},
				{
					match: /\/\*STUB_CSS_COMMON\*\//g,
					replacement: css_common
				},
				{
					match: /\/\*STUB_CSS_MAIN\*\//g,
					replacement: css_main
				}
			]
		} ) )
		.pipe( rename( { basename: 'webgl_loader_wwobjloader2' } ) )
		.pipe( gulp.dest( DIR_EXAMPLES ) );
} );

gulp.task( 'default', [ 'clean-build', 'bundle-objloader2', 'bundle-wwobjloader2', 'create-examples', 'doc' ] );
