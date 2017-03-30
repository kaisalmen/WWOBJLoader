'use strict';

var fs = require( 'fs' );

var gulp = require( 'gulp' );
var del = require( 'del' );
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
	DOCS: 'build/docs',
	EXAMPLES: 'build/examples',
	TEST: 'test/'
};

function buildHeader() {
	return "/**\n" +
		"  * @author Kai Salmen / https://kaisalmen.de\n" +
		"  * Development repository: https://github.com/kaisalmen/WWOBJLoader\n" +
		"  */" +
		"\n\n'use strict';\n\n";
};

gulp.task( 'clean-build', function () {
	return del.sync( DIR.BUILD );
});


gulp.task( 'bundle-objloader2', function () {
	var builtHeader = buildHeader();
	gulp.src(
			[
				'src/loaders/OBJLoader2.js'
			]
		)
		.pipe( concat( 'OBJLoader2.js' ) )
		.pipe( header( builtHeader ) )
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
		.pipe( uglify( { mangle: false } ) )
		.pipe( rename( { basename: 'OBJLoader2.min' } ) )
		.pipe( gulp.dest( DIR.BUILD ) );
} );


gulp.task( 'bundle-wwobjloader2', function () {
	var builtHeader = buildHeader();
	gulp.src(
			[
				'src/loaders/WWOBJLoader2.js',
				'src/loaders/WWOBJLoader2Director.js'
			]
		)
		.pipe( concat( 'WWOBJLoader2.js' ) )
		.pipe( header( builtHeader ) )
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
		.pipe( uglify( { mangle: false } ) )
		.pipe( rename( { basename: 'WWOBJLoader2.min' } ) )
		.pipe( gulp.dest( DIR.BUILD ) );
} );


gulp.task( 'create-docs', function ( cb ) {
	gulp.src(
			[
				'README.md',
				'src/loaders/OBJLoader2.js',
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
		common: "",
		main: "",
		link_all_ref: "<link href=\"../common/Common.css\" type=\"text/css\" rel=\"stylesheet\"/\>\n\<link href=\"./main.css\" type=\"text/css\" rel=\"stylesheet\"/\>",
		link_all: "",
		link_tabs: "",
		style_all: "",
		style_tabs: ""
	},
	js: {
		inline_code: "",
		inline_tabs: "",
		ext_code: "",
		ext_three: "<script src=\"../../node_modules/three/build/three.js\"\>\</script\>",
		ext_tabs: ""
	},
	file: {
		src: "",
		out: ""
	},
	dir: {
		dest: ""
	}
};

gulp.task( 'prepare-examples', function () {
	exampleDef.css.common = fs.readFileSync( 'test/common/common.css', 'utf8' );
	exampleDef.js.ext_tabs = "\t\t";
	exampleDef.dir.dest = DIR.EXAMPLES;
});


gulp.task( 'clean-examples', function () {
	del.sync( DIR.TEST + 'objloader2/' + 'main.min.html' );
	del.sync( DIR.TEST + 'objloader2/' + 'main.src.html' );
	del.sync( DIR.TEST + 'objloader2/' + 'webgl_loader*.html' );
	del.sync( DIR.TEST + 'wwobjloader2/' + 'main.min.html' );
	del.sync( DIR.TEST + 'wwobjloader2/' + 'main.src.html' );
	del.sync( DIR.TEST + 'wwobjloader2/' + 'webgl_loader*.html' );
	del.sync( DIR.TEST + 'wwobjloader2stage/' + 'main.min.html' );
	del.sync( DIR.TEST + 'wwobjloader2stage/' + 'main.src.html' );
	del.sync( DIR.TEST + 'wwobjloader2stage/' + 'webgl_loader*.html' );
	del.sync( DIR.TEST + 'wwparallels/' + 'main.min.html' );
	del.sync( DIR.TEST + 'wwparallels/' + 'main.src.html' );
	del.sync( DIR.TEST + 'wwparallels/' + 'webgl_loader*.html' );
});

gulp.task( 'create-obj2-examples', function () {
	exampleDef.css.style_all = exampleDef.css.common;
	exampleDef.css.style_tabs = "\t\t\t";
	exampleDef.css.link_all = "";
	exampleDef.css.link_tabs = "";
	exampleDef.js.ext_three = "<script src=\"../../node_modules/three/build/three.js\"\>\</script\>";
	exampleDef.js.ext_code = "\<script src=\"../../build/OBJLoader2.js\"\>\</script\>";
	exampleDef.js.inline_code = fs.readFileSync( 'test/objloader2/OBJLoader2Example.js', 'utf8' );
	exampleDef.js.inline_tabs = "\t\t\t";
	exampleDef.file.src = 'test/objloader2/template/main.three.html';
	exampleDef.dir.dest = 'test/objloader2';
	exampleDef.file.out = 'webgl_loader_obj2';
	buildExample();

	exampleDef.css.style_all = "";
	exampleDef.css.style_tabs = "";
	exampleDef.css.link_all =  "<link href=\"../common/Common.css\" type=\"text/css\" rel=\"stylesheet\"/\>";
	exampleDef.css.link_tabs = "\t\t";
	exampleDef.js.ext_code = "\<script src=\"../../build/OBJLoader2.js\"\>\</script\>\n";
	exampleDef.js.ext_code += "\<script src=\"./OBJLoader2Example.js\"\>\</script\>";
	exampleDef.js.inline_code = "";
	exampleDef.js.inline_tabs = "";
	exampleDef.dir.dest = 'test/objloader2';
	exampleDef.file.out = 'main';
	buildExample();

	exampleDef.js.ext_three = "<script src=\"../../node_modules/three/build/three.min.js\"\>\</script\>";
	exampleDef.js.ext_code = "\<script src=\"../../build/OBJLoader2.min.js\"\>\</script\>\n";
	exampleDef.js.ext_code += "\<script src=\"./OBJLoader2Example.js\"\>\</script\>";
	exampleDef.file.out = 'main.min';
	buildExample();

	exampleDef.js.ext_three = "<script src=\"../../node_modules/three/build/three.js\"\>\</script\>";
	exampleDef.js.ext_code = "<script src=\"../../src/loaders/OBJLoader2.js\"\>\</script\>\n";
	exampleDef.js.ext_code += "<script src=\"./OBJLoader2Example.js\"\>\</script\>";
	exampleDef.file.out = 'main.src';
	buildExample();
});


gulp.task( 'create-wwobj2-examples', function () {
	exampleDef.css.style_all = exampleDef.css.common;
	exampleDef.css.style_tabs = "\t\t\t";
	exampleDef.css.link_all = "";
	exampleDef.css.link_tabs = "";
	exampleDef.js.ext_three = "<script src=\"../../node_modules/three/build/three.js\"\>\</script\>";
	exampleDef.js.ext_code = "<script src=\"../../build/OBJLoader2.js\"\>\</script\>\n";
	exampleDef.js.ext_code += "<script src=\"../../build/WWOBJLoader2.js\"\>\</script\>";
	exampleDef.js.inline_code = fs.readFileSync( 'test/wwobjloader2/WWOBJLoader2Example.js', 'utf8' );
	exampleDef.js.inline_tabs = "\t\t\t";
	exampleDef.file.src = 'test/wwobjloader2/template/main.three.html';
	exampleDef.dir.dest = 'test/wwobjloader2';
	exampleDef.file.out = 'webgl_loader_obj2_ww';
	buildExample();

	exampleDef.css.style_all = "";
	exampleDef.css.style_tabs = "";
	exampleDef.css.link_all =  "<link href=\"../common/Common.css\" type=\"text/css\" rel=\"stylesheet\"/\>";
	exampleDef.css.link_tabs = "\t\t";
	exampleDef.js.ext_code = "<script src=\"../../build/OBJLoader2.js\"\>\</script\>\n";
	exampleDef.js.ext_code += "<script src=\"../../build/WWOBJLoader2.js\"\>\</script\>\n";
	exampleDef.js.ext_code += "<script src=\"./WWOBJLoader2Example.js\"\>\</script\>";
	exampleDef.js.inline_code = "";
	exampleDef.js.inline_tabs = "";
	exampleDef.dir.dest = 'test/wwobjloader2';
	exampleDef.file.out = 'main';
	buildExample();

	exampleDef.js.ext_three = "<script src=\"../../node_modules/three/build/three.min.js\"\>\</script\>";
	exampleDef.js.ext_code = "<script src=\"../../build/OBJLoader2.min.js\"\>\</script\>\n";
	exampleDef.js.ext_code += "<script src=\"../../build/WWOBJLoader2.min.js\"\>\</script\>\n";
	exampleDef.js.ext_code += "<script src=\"./WWOBJLoader2Example.js\"\>\</script\>";
	exampleDef.file.out = 'main.min';
	buildExample();

	exampleDef.js.ext_three = "<script src=\"../../node_modules/three/build/three.js\"\>\</script\>";
	exampleDef.js.ext_code = "<script src=\"../../src/loaders/OBJLoader2.js\"\>\</script\>\n";
	exampleDef.js.ext_code += "<script src=\"../../src/loaders/WWOBJLoader2.js\"\>\</script\>\n";
	exampleDef.js.ext_code += "<script src=\"./WWOBJLoader2Example.js\"\>\</script\>";
	exampleDef.file.out = 'main.src';
	buildExample();
});


gulp.task( 'create-wwobj2_parallels-examples', function () {
	exampleDef.css.main = fs.readFileSync( 'test/wwparallels/main.css', 'utf8' );
	exampleDef.css.style_all = exampleDef.css.common + "\n" + exampleDef.css.main;
	exampleDef.css.style_tabs = "\t\t\t";
	exampleDef.css.link_all = "";
	exampleDef.css.link_tabs = "";
	exampleDef.js.ext_three = "<script src=\"../../node_modules/three/build/three.js\"\>\</script\>";
	exampleDef.js.ext_code = "<script src=\"../../build/OBJLoader2.js\"\>\</script\>\n";
	exampleDef.js.ext_code += "<script src=\"../../build/WWOBJLoader2.js\"\>\</script\>";
	exampleDef.js.inline_code = fs.readFileSync( 'test/wwparallels/WWParallels.js', 'utf8' );
	exampleDef.js.inline_tabs = "\t\t\t";
	exampleDef.file.src = 'test/wwparallels/template/main.three.html';
	exampleDef.dir.dest = 'test/wwparallels';
	exampleDef.file.out = 'webgl_loader_obj2_ww_parallels';
	buildExample();

	exampleDef.css.style_all = "";
	exampleDef.css.style_tabs = "";
	exampleDef.css.link_all = exampleDef.css.link_all_ref;
	exampleDef.css.link_tabs = "\t\t";
	exampleDef.js.ext_code = "<script src=\"../../build/OBJLoader2.js\"\>\</script\>\n";
	exampleDef.js.ext_code += "<script src=\"../../build/WWOBJLoader2.js\"\>\</script\>\n";
	exampleDef.js.ext_code += "<script src=\"./WWParallels.js\"\>\</script\>";
	exampleDef.js.inline_code = "";
	exampleDef.js.inline_tabs = "";
	exampleDef.dir.dest = 'test/wwparallels';
	exampleDef.file.out = 'main';
	buildExample();

	exampleDef.js.ext_three = "<script src=\"../../node_modules/three/build/three.min.js\"\>\</script\>";
	exampleDef.js.ext_code = "<script src=\"../../build/OBJLoader2.min.js\"\>\</script\>\n";
	exampleDef.js.ext_code += "<script src=\"../../build/WWOBJLoader2.min.js\"\>\</script\>\n";
	exampleDef.js.ext_code += "<script src=\"./WWParallels.js\"\>\</script\>";
	exampleDef.file.out = 'main.min';
	buildExample();

	exampleDef.js.ext_three = "<script src=\"../../node_modules/three/build/three.js\"\>\</script\>";
	exampleDef.js.ext_code = "<script src=\"../../src/loaders/OBJLoader2.js\"\>\</script\>\n";
	exampleDef.js.ext_code += "<script src=\"../../src/loaders/WWOBJLoader2.js\"\>\</script\>\n";
	exampleDef.js.ext_code += "<script src=\"../../src/loaders/WWOBJLoader2Director.js\"\>\</script\>\n";
	exampleDef.js.ext_code += "<script src=\"./WWParallels.js\"\>\</script\>";
	exampleDef.file.out = 'main.src';
	buildExample();
});

gulp.task( 'create-wwobj2_stage-examples', function () {
	exampleDef.css.main = fs.readFileSync( 'test/wwobjloader2stage/main.css', 'utf8' );
	exampleDef.css.style_all = exampleDef.css.common + "\n" + exampleDef.css.main;
	exampleDef.css.style_tabs = "\t\t\t";
	exampleDef.css.link_all = "";
	exampleDef.css.link_tabs = "";
	exampleDef.js.ext_three = "<script src=\"../../node_modules/three/build/three.js\"\>\</script\>";
	exampleDef.js.ext_code = "<script src=\"../../build/OBJLoader2.js\"\>\</script\>\n";
	exampleDef.js.ext_code += "<script src=\"../../build/WWOBJLoader2.js\"\>\</script\>";
	exampleDef.js.inline_code = fs.readFileSync( 'test/wwobjloader2stage/WWOBJLoader2Stage.js', 'utf8' );
	exampleDef.js.inline_tabs = "\t\t\t";
	exampleDef.file.src = 'test/wwobjloader2stage/template/main.three.html';
	exampleDef.dir.dest = 'test/wwobjloader2stage';
	exampleDef.file.out = 'webgl_loader_obj2_ww_stage';
	buildExample();

	exampleDef.css.style_all = "";
	exampleDef.css.style_tabs = "";
	exampleDef.css.link_all = exampleDef.css.link_all_ref;
	exampleDef.css.link_tabs = "\t\t";
	exampleDef.js.ext_code = "<script src=\"../../build/OBJLoader2.js\"\>\</script\>\n";
	exampleDef.js.ext_code += "<script src=\"../../build/WWOBJLoader2.js\"\>\</script\>\n";
	exampleDef.js.ext_code += "<script src=\"./WWOBJLoader2Stage.js\"\>\</script\>";
	exampleDef.js.inline_code = "";
	exampleDef.js.inline_tabs = "";
	exampleDef.dir.dest = 'test/wwobjloader2stage';
	exampleDef.file.out = 'main';
	buildExample();

	exampleDef.js.ext_three = "<script src=\"../../node_modules/three/build/three.min.js\"\>\</script\>";
	exampleDef.js.ext_code = "<script src=\"../../build/OBJLoader2.min.js\"\>\</script\>\n";
	exampleDef.js.ext_code += "<script src=\"../../build/WWOBJLoader2.min.js\"\>\</script\>\n";
	exampleDef.js.ext_code += "<script src=\"./WWOBJLoader2Stage.js\"\>\</script\>";
	exampleDef.file.out = 'main.min';
	buildExample();

	exampleDef.js.ext_three = "<script src=\"../../node_modules/three/build/three.js\"\>\</script\>";
	exampleDef.js.ext_code = "<script src=\"../../src/loaders/OBJLoader2.js\"\>\</script\>\n";
	exampleDef.js.ext_code += "<script src=\"../../src/loaders/WWOBJLoader2.js\"\>\</script\>\n";
	exampleDef.js.ext_code += "<script src=\"../../src/loaders/WWOBJLoader2Director.js\"\>\</script\>\n";
	exampleDef.js.ext_code += "<script src=\"./WWOBJLoader2Stage.js\"\>\</script\>";
	exampleDef.file.out = 'main.src';
	buildExample();
});


function buildExample() {
	var js_inline_code = exampleDef.js.inline_code;
	var js_ext_code = exampleDef.js.ext_code;
	var js_ext_three = exampleDef.js.ext_three;
	var css_style_all = exampleDef.css.style_all;
	var css_link_all = exampleDef.css.link_all;

	if ( js_inline_code != "" ) {

		if ( exampleDef.js.inline_tabs != "" ) {

			js_inline_code = exampleDef.js.inline_tabs + js_inline_code;
			js_inline_code = js_inline_code.replace( /\n/g, '\n' + exampleDef.js.inline_tabs );

		}

	}

	if ( js_ext_three != "" ) {

		if ( exampleDef.js.ext_tabs != "" ) {

			js_ext_three = exampleDef.js.ext_tabs + js_ext_three;
			js_ext_three = js_ext_three.replace( /\n/g, '\n' + exampleDef.js.ext_tabs );

		}

	}

	if ( js_ext_code != "" ) {

		if ( exampleDef.js.ext_tabs != "" ) {

			js_ext_code = exampleDef.js.ext_tabs + js_ext_code;
			js_ext_code = js_ext_code.replace( /\n/g, '\n' + exampleDef.js.ext_tabs );

		}

	}

	if ( css_style_all != "" ) {

		if ( exampleDef.css.style_tabs != "" ) {

			css_style_all = exampleDef.css.style_tabs + css_style_all;
			css_style_all = css_style_all.replace( /\n/g, '\n' + exampleDef.css.style_tabs );

		}
		css_style_all = "\n\t\t\<style\>\n" + css_style_all + "\n\t\t\</style\>";

	}

	if ( css_link_all != "" ) {

		if ( exampleDef.css.link_tabs != "" ) {

			css_link_all = exampleDef.css.link_tabs + css_link_all;
			css_link_all = css_link_all.replace( /\n/g, '\n' + exampleDef.css.link_tabs );

		}

	}

	gulp.src( [ exampleDef.file.src ] )
		.pipe( replace( {
			patterns: [
				{
					match: /\/\*STUB_JS_THREE\*\//g,
					replacement: js_ext_three
				},
				{
					match: /\/\*STUB_JS_EXT\*\//g,
					replacement: js_ext_code
				},
				{
					match: /\/\*STUB_JS_INLINE\*\//g,
					replacement: js_inline_code
				},
				{
					match: /\/\*STUB_CSS_LINK\*\//g,
					replacement: css_link_all
				},
				{
					match: /\/\*STUB_CSS_EMBED\*\//g,
					replacement: css_style_all
				}
			]
		} ) )
		.pipe( rename( { basename: exampleDef.file.out } ) )
		.pipe( gulp.dest( exampleDef.dir.dest ) );
};

gulp.task(
	'build-examples',
	[
		'prepare-examples',
		'create-obj2-examples',
		'create-wwobj2-examples',
		'create-wwobj2_stage-examples',
		'create-wwobj2_parallels-examples'
	]
);


gulp.task(
	'default',
	[
		'clean-build',
		'bundle-objloader2',
		'bundle-wwobjloader2',
		'create-docs',
		'build-examples'
	]
);
