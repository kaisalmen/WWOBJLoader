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
	DOCS: 'docs/'
};


gulp.task( 'set-versions', function ( done ) {
	gulp.src(
		[ 'examples/jsm/loaders/OBJLoader2.js' ]
	)
	.pipe( replace( /OBJLoader2\.OBJLOADER2_VERSION\s*=.*/g,
		"OBJLoader2.OBJLOADER2_VERSION = '"+ packageContent.versions.obj_loader2 + "';" ) )
	.pipe( gulp.dest( "examples/jsm/loaders" ) );

	gulp.src(
		[ 'examples/jsm/loaders/OBJLoader2Parallel.js' ]
			'src/loaders/support/NodeLoaderWorkerSupport.js',
	)
	.pipe( replace( /OBJLoader2Parallel\.OBJLOADER2_PARALLEL_VERSION\s*=.*/g,
		"OBJLoader2Parallel.OBJLOADER2_PARALLEL_VERSION = '"+ packageContent.versions.obj_loader2_parallel + "';" ) )
	.pipe( gulp.dest( "examples/jsm/loaders" ) );

	gulp.src(
		[ 'examples/jsm/loaders/obj2/worker/main/WorkerExecutionSupport.js']
	)
	.pipe( replace( /WorkerExecutionSupport\.WORKER_SUPPORT_VERSION\s*=.*/g,
		"WorkerExecutionSupport.WORKER_SUPPORT_VERSION = '"+ packageContent.versions.worker_execution_support + "';" ) )
	.pipe( gulp.dest( "examples/jsm/loaders/obj2/worker/main" ) );
	done();
} );


gulp.task( 'create-docs', function ( done, cb ) {
	del.sync( DIR.DOCS + 'fonts' );
	del.sync( DIR.DOCS + 'img' );
	del.sync( DIR.DOCS + 'scripts' );
	del.sync( DIR.DOCS + 'styles' );
	del.sync( DIR.DOCS + '*.html' );
	del.sync( DIR.DOCS + '*.md' );
	gulp.src(
			[
				'README.md',
				'src/loaders/OBJLoader2.js',
				'src/loaders/OBJLoader2Parallel.js'
				'src/loaders/support/NodeLoaderWorkerSupport.js',
			],
			{
				read: false
			}
		)
		.pipe( jsdoc( config, cb ) );

	gulp.src( [ 'CHANGELOG.md' ] )
		.pipe( gulp.dest( DIR.DOCS ) );
	done();
} );


gulp.task( 'dl-female02', function( done ) {
	log( 'Downloading female02:' );
	return remoteSrc(
		[ 'female02.obj', 'female02.mtl', 'female02_vertex_colors.obj', '01_-_Default1noCulling.JPG', '02_-_Default1noCulling.JPG', '03_-_Default1noCulling.JPG' ],	{
			base: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/obj/female02/'
		}
	).pipe( gulp.dest( './resource/obj/female02/' ) );
	done();
});

gulp.task( 'dl-male02', gulp.series( 'dl-female02', function( done ) {
	log( 'Downloading male02:' );
	return remoteSrc(
		[ 'male02.obj', 'male02.mtl', '01_-_Default1noCulling.JPG', 'male-02-1noCulling.JPG', 'orig_02_-_Defaul1noCulling.JPG' ], {
			base: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/obj/male02/'
		}
	).pipe( gulp.dest( './resource/obj/male02/' ) );
	done();
} ) );

gulp.task( 'dl-cerberus', gulp.series( 'dl-male02', function( done ) {
	log( 'Downloading cerberus:' );
	return remoteSrc(
		[ 'Cerberus.obj' ],	{
			base: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/obj/cerberus/'
		}
	)
	.pipe( gulp.dest( './resource/obj/cerberus/' ) );
	done();
} ) );

gulp.task( 'dl-ninja', gulp.series( 'dl-cerberus', function( done ) {
	log( 'Downloading ninja:' );
	return remoteSrc(
		[ 'ninjaHead_Low.obj' ], {
			base: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/obj/ninja/'
		}
	)
	.pipe( gulp.dest( './resource/obj/ninja/' ) );
	done();
} ) );

gulp.task( 'dl-walt', gulp.series( 'dl-ninja', function( done ) {
	log( 'Downloading walt:' );
	return remoteSrc(
		[ 'WaltHead.obj', 'WaltHead.mtl' ],	{
			base: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/obj/walt/'
		}
	)
	.pipe( gulp.dest( './resource/obj/walt/' ) );
	done();
} ) );

gulp.task( 'dl-ptv1', gulp.series( 'dl-walt', function( done ) {
	log( 'Downloading model PTV1:' );
	return remoteSrc(
		[ 'PTV1.zip' ],	{
			base: 'https://kaisalmen.de/resource/obj/PTV1/'
		}
	)
	.pipe( decompress() )
	.pipe( gulp.dest( './resource/obj/PTV1/' ) );
	done();
} ) );

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
