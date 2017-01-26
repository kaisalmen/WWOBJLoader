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

var packageContent = require('./package.json');

var DIR = {
	BUILD: 'build/',
	DOC: 'build/doc',
	EXAMPLES: 'build/examples'
};

function buildHeader() {
	return
		"/**\n" +
		"  * @author Kai Salmen / https://kaisalmen.de\n" +
		"  * Development repository: https://github.com/kaisalmen/WWOBJLoader\n" +
		"  */" +
		"\n\n'use strict';\n\n";
};

gulp.task( 'clean-build', function () {
	gulp.src(
		DIR.DOC,
		{
			read: false
		}
	)
	.pipe( clean() );

	gulp.src(
		DIR.EXAMPLES,
		{
			read: false
		}
	)
	.pipe( clean() );
});


gulp.task( 'bundle-objloader2', function () {
	gulp.src(
			[
				'src/loaders/OBJLoader2.js',
				'src/loaders/OBJLoader2Parser.js',
				'src/loaders/OBJLoader2MeshCreator.js'
			]
		)
		.pipe( concat( 'OBJLoader2.js' ) )
		.pipe( header( buildHeader() ) )
		.pipe( replace( {
			patterns: [
				{
					match: /THREE\.OBJLoader2\.version.*/g,
					replacement: "THREE.OBJLoader2.version = '"+ packageContent.version + "';"
				}
			]
		} ) )
		.pipe( gulp.dest( DIR.BUILD ) )

		// create minified version
		.pipe( uglify() )
		.pipe( rename( { basename: 'OBJLoader2.min' } ) )
		.pipe( gulp.dest( DIR.BUILD ) );
} );


gulp.task( 'bundle-wwobjloader2', function () {
	gulp.src(
			[
				'src/loaders/WWOBJLoader2.js',
				'src/loaders/WWOBJLoader2Director.js'
			]
		)
		.pipe( concat( 'WWOBJLoader2.js' ) )
		.pipe( header( buildHeader() ) )
		.pipe( replace( {
			patterns: [
				{
					match: /THREE\.OBJLoader2\.version.*/g,
					replacement: "THREE.OBJLoader2.version = '"+ packageContent.version + "';"
				}
			]
		} ) )
		.pipe( gulp.dest( DIR.BUILD ) )

		// create minified version
		.pipe( uglify() )
		.pipe( rename( { basename: 'WWOBJLoader2.min' } ) )
		.pipe( gulp.dest( DIR.BUILD ) );
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


var exampleDef = {
	css: {
		link: null,
		common: null,
		main: null,
		style_all: null
	},
	js: {
		code_inline: null,
		code_ext: null
	},
	file: {
		src: null,
		out: null
	},
	dir: {
		dest: null
	}
};

gulp.task( 'prepare-examples', function () {
	exampleDef.css.link = "\t\t\<link href=\"../common/Common.css\" type=\"text/css\" rel=\"stylesheet\"/\>\n";
	exampleDef.css.link += "\t\t\<link href=\"./main.css\" type=\"text/css\" rel=\"stylesheet\"/\>";
	exampleDef.css.common = fs.readFileSync( 'test/common/common.css', 'utf8' );
	exampleDef.dir.dest = DIR.EXAMPLES;
});


gulp.task( 'create-obj2-examples', function () {
	exampleDef.css.main = fs.readFileSync( 'test/objloader2/main.css', 'utf8' );
	exampleDef.css.style_all = "\t\t\<style\>\n" + exampleDef.css.common + "\n" + exampleDef.css.main + "\n\</style\>\n";
	exampleDef.js.code_ext = "\t\t\<script src=\"../../build/OBJLoader2.js\"\>\</script\>";
	exampleDef.js.code_inline = fs.readFileSync( 'test/objloader2/OBJLoader2Verify.js', 'utf8' );
	exampleDef.file.src = 'test/objloader2/template/main.three.html';
	exampleDef.dir.dest = 'build/examples';
	exampleDef.file.out = 'webgl_loader_obj2';
	buildExample();

	exampleDef.css.style_all = exampleDef.css.link;
	exampleDef.js.code_ext = "\t\t\<script src=\"../../build/OBJLoader2.js\"\>\</script\>\n\n";
	exampleDef.js.code_ext += "\t\t\<script src=\"./OBJLoader2Verify.js\"\>\</script\>";
	exampleDef.js.code_inline = "";
	exampleDef.dir.dest = 'test/objloader2';
	exampleDef.file.out = 'main';
	buildExample();

	exampleDef.js.code_ext = "\t\t\<script src=\"../../build/OBJLoader2.min.js\"\>\</script\>\n\n";
	exampleDef.js.code_ext += "\t\t\<script src=\"./OBJLoader2Verify.js\"\>\</script\>";
	exampleDef.file.out = 'main.min';
	buildExample();

	exampleDef.js.code_ext = "\t\t\<script src=\"../../src/loaders/OBJLoader2.js\"\>\</script\>\n";
	exampleDef.js.code_ext += "\t\t\<script src=\"../../src/loaders/OBJLoader2Parser.js\"\>\</script\>\n";
	exampleDef.js.code_ext += "\t\t\<script src=\"../../src/loaders/OBJLoader2MeshCreator.js\"\>\</script\>\n\n";
	exampleDef.js.code_ext += "\t\t\<script src=\"./OBJLoader2Verify.js\"\>\</script\>";
	exampleDef.file.out = 'main.src';
	buildExample();
});


gulp.task( 'create-wwobj2-examples', function () {
	exampleDef.css.main = fs.readFileSync( 'test/wwobjloader2/main.css', 'utf8' );
	exampleDef.css.style_all = "\t\t\<style\>\n" + exampleDef.css.common + "\n" + exampleDef.css.main + "\n\</style\>\n";
	exampleDef.js.code_ext = "\t\t\<script src=\"../../build/OBJLoader2.js\"\>\</script\>\n";
	exampleDef.js.code_ext += "\t\t\<script src=\"../../build/WWOBJLoader2.js\"\>\</script\>";
	exampleDef.js.code_inline = fs.readFileSync( 'test/wwobjloader2/WWOBJLoader2Verify.js', 'utf8' );
	exampleDef.file.src = 'test/wwobjloader2/template/main.three.html';
	exampleDef.dir.dest = 'build/examples';
	exampleDef.file.out = 'webgl_loader_wwobj2';
	buildExample();

	exampleDef.css.style_all = exampleDef.css.link;
	exampleDef.js.code_ext = "\t\t\<script src=\"../../build/OBJLoader2.js\"\>\</script\>\n";
	exampleDef.js.code_ext += "\t\t\<script src=\"../../build/WWOBJLoader2.js\"\>\</script\>\n\n";
	exampleDef.js.code_ext += "\t\t\<script src=\"./WWOBJLoader2Verify.js\"\>\</script\>";
	exampleDef.js.code_inline = "";
	exampleDef.dir.dest = 'test/wwobjloader2';
	exampleDef.file.out = 'main';
	buildExample();

	exampleDef.js.code_ext = "\t\t\<script src=\"../../build/OBJLoader2.min.js\"\>\</script\>\n";
	exampleDef.js.code_ext += "\t\t\<script src=\"../../build/WWOBJLoader2.min.js\"\>\</script\>\n\n";
	exampleDef.js.code_ext += "\t\t\<script src=\"./WWOBJLoader2Verify.js\"\>\</script\>";
	exampleDef.file.out = 'main.min';
	buildExample();

	exampleDef.js.code_ext = "\t\t\<script src=\"../../src/loaders/OBJLoader2Parser.js\"\>\</script\>\n";
	exampleDef.js.code_ext += "\t\t\<script src=\"../../src/loaders/WWOBJLoader2.js\"\>\</script\>\n\n";
	exampleDef.js.code_ext += "\t\t\<script src=\"./WWOBJLoader2Verify.js\"\>\</script\>";
	exampleDef.file.out = 'main.src';
	buildExample();
});


gulp.task( 'create-wwobj2_parallels-examples', function () {
	exampleDef.css.main = fs.readFileSync( 'test/wwparallels/main.css', 'utf8' );
	exampleDef.css.style_all = "\t\t\<style\>\n" + exampleDef.css.common + "\n" + exampleDef.css.main + "\n\</style\>\n";
	exampleDef.js.code_ext = "\t\t\<script src=\"../../build/OBJLoader2.js\"\>\</script\>\n";
	exampleDef.js.code_ext += "\t\t\<script src=\"../../build/WWOBJLoader2.js\"\>\</script\>";
	exampleDef.js.code_inline = fs.readFileSync( 'test/wwparallels/WWParallels.js', 'utf8' );
	exampleDef.file.src = 'test/wwparallels/template/main.three.html';
	exampleDef.dir.dest = 'build/examples';
	exampleDef.file.out = 'webgl_loader_wwobj2_parallels';
	buildExample();

	exampleDef.css.style_all = exampleDef.css.link;
	exampleDef.js.code_ext = "\t\t\<script src=\"../../build/OBJLoader2.js\"\>\</script\>\n";
	exampleDef.js.code_ext += "\t\t\<script src=\"../../build/WWOBJLoader2.js\"\>\</script\>\n\n";
	exampleDef.js.code_ext += "\t\t\<script src=\"./WWParallels.js\"\>\</script\>";
	exampleDef.js.code_inline = "";
	exampleDef.dir.dest = 'test/wwparallels';
	exampleDef.file.out = 'main';
	buildExample();

	exampleDef.js.code_ext = "\t\t\<script src=\"../../build/OBJLoader2.min.js\"\>\</script\>\n";
	exampleDef.js.code_ext += "\t\t\<script src=\"../../build/WWOBJLoader2.min.js\"\>\</script\>\n\n";
	exampleDef.js.code_ext += "\t\t\<script src=\"./WWParallels.js\"\>\</script\>";
	exampleDef.file.out = 'main.min';
	buildExample();

	exampleDef.js.code_ext = "\t\t\<script src=\"../../src/loaders/OBJLoader2Parser.js\"\>\</script\>\n";
	exampleDef.js.code_ext += "\t\t\<script src=\"../../src/loaders/WWOBJLoader2.js\"\>\</script\>\n";
	exampleDef.js.code_ext += "\t\t\<script src=\"../../src/loaders/WWOBJLoader2Director.js\"\>\</script\>\n\n";
	exampleDef.js.code_ext += "\t\t\<script src=\"./WWParallels.js\"\>\</script\>";
	exampleDef.file.out = 'main.src';
	buildExample();
});


function buildExample() {
	gulp.src( [ exampleDef.file.src ] )
	.pipe( replace( {
		patterns: [
			{
				match: /\/\*STUB_JS_EXT\*\//g,
				replacement: exampleDef.js.code_ext
			},
			{
				match: /\/\*STUB_JS_INLINE\*\//g,
				replacement: exampleDef.js.code_inline
			},
			{
				match: /\/\*STUB_CSS\*\//g,
				replacement: exampleDef.css.style_all
			}
		]
	} ) )
	.pipe( rename( { basename: exampleDef.file.out } ) )
	.pipe( gulp.dest( exampleDef.dir.dest ) );
};


gulp.task(
	'default',
	[
		'clean-build',
		'bundle-objloader2',
		'bundle-wwobjloader2',
		'doc',
		'prepare-examples',
		'create-obj2-examples',
		'create-wwobj2-examples',
		'create-wwobj2_parallels-examples'
	]
);
