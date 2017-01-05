'use strict';

var fs = require( 'fs' );

var gulp = require( 'gulp' );
var rename = require( 'gulp-rename' );
var concat = require( 'gulp-concat' );
var uglify = require( 'gulp-uglify' );
var header = require( 'gulp-header' );

var replace = require( 'gulp-replace-task' );

var DIR_BUILD = 'build/';

gulp.task( 'bundle-objloader2', function () {
	return gulp
		.src( [ 'src/loaders/OBJLoader2Control.js', 'src/loaders/OBJLoader2Parser.js', 'src/loaders/OBJLoader2MeshCreator.js' ] )

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
	var objLoader2ParserContent = fs.readFileSync( 'src/loaders/OBJLoader2Parser.js', 'utf8' );

	return gulp
		.src( [ 'src/loaders/WWOBJLoader2.js' ] )
	// replace import statement with complete content of OBJLoader2Parser.js
		.pipe( replace( {
			 patterns: [ {
				match: /importScripts.*/g,
				replacement: objLoader2ParserContent
			 } ]
		 } ) )
		.pipe( header( "/**\n  * @author Kai Salmen / www.kaisalmen.de\n  */\n\n'use strict';\n\n" ) )
		.pipe( gulp.dest( DIR_BUILD ) )

		// create minified version
		.pipe( uglify() )
		.pipe( rename( { basename: 'WWOBJLoader2.min' } ) )
		.pipe( gulp.dest( DIR_BUILD ) );
} );

gulp.task( 'bundle-wwobjloader2proxy', function () {
	return gulp
	.src( [ 'src/loaders/WWLoaderProxyBase.js', 'src/loaders/WWOBJLoader2Proxy.js', 'src/loaders/WWLoaderDirector.js' ] )

	// all input files are concatenated and then saved to OBJLoader2.js
		.pipe( concat( 'WWOBJLoader2Proxy.js' ) )
		.pipe( header( "/**\n  * @author Kai Salmen / www.kaisalmen.de\n  */\n\n'use strict';\n\n" ) )
		.pipe( gulp.dest( DIR_BUILD ) )

		// create minified version
		.pipe( uglify() )
		.pipe( rename( { basename: 'WWOBJLoader2Proxy.min' } ) )
		.pipe( gulp.dest( DIR_BUILD ) );
} );

gulp.task( 'bundle-super', function () {
	return gulp
		.src( [
			'src/loaders/OBJLoader2Control.js',
			'src/loaders/OBJLoader2Parser.js',
			'src/loaders/OBJLoader2MeshCreator.js',
			'src/loaders/WWOBJLoader2.js',
			'src/loaders/WWLoaderProxyBase.js',
			'src/loaders/WWOBJLoader2Proxy.js',
			'src/loaders/WWLoaderDirector.js',
			'src/loaders/OBJLoader2WWBuilder.js'
		] )
		.pipe( replace( {
			patterns: [ {
				match: /importScripts.*/g,
				replacement: ""
			} ]
		} ) )
		.pipe( concat( 'OBJLoader2Super.js' ) )
		.pipe( header( "/**\n  * @author Kai Salmen / www.kaisalmen.de\n  */\n\n'use strict';\n\n" ) )
		.pipe( gulp.dest( DIR_BUILD ) )

} );

gulp.task( 'default', [ 'bundle-objloader2', 'bundle-wwobjloader2', 'bundle-wwobjloader2proxy', 'bundle-super' ] );
