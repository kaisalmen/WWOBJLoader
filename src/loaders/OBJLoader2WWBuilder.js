function isString(s) {
	return typeof(s) === 'string' || s instanceof String;
}

var buildObject = function ( fullName, object ) {
	var objectString = fullName + ' = {\n';
	var part;
	for ( var name in object ) {

		part = object[ name ];
		if ( isString( part ) ) {

			part = part.replace( '\n', '\\n' );
			part = part.replace( '\r', '\\r' );
			objectString += '\t' + name + ': "' + part + '",\n';

		} else if ( part instanceof Array ) {

			objectString += '\t' + name + ': [' + part + '],\n';

		} else if ( Number.isInteger( part ) ) {

			objectString += '\t' + name + ': ' + part + ',\n';

		} else if ( typeof func === 'function' ) {

			objectString += '\t' + name + ': ' + part + ',\n';

		}

	}
	objectString += '}\n';

	return objectString;
};

var buildSingelton = function ( fullName, internalName, object ) {
	var objectString = fullName + ' = (function () {\n\n';
	objectString += '\t' + object.prototype.constructor + ';\n\n';
	var part;
	for ( var name in object.prototype ) {

		part = object.prototype[ name ];
		if ( typeof part === 'function' ) {

			objectString += '\t' + internalName + '.prototype.' + name + ' = ' + part + ';\n\n';

		}

	}
	objectString += '\treturn ' + internalName + ';\n';
	objectString += '})();\n';

	return objectString;
};

var textBuilder = '/**\n  * This code was re-constructed for web worker usage\n  */\n\n';
textBuilder += 'if ( THREE === undefined ) { var THREE = {} }\n';
textBuilder += 'if ( THREE.WebWorker === undefined ) { THREE.WebWorker = {} }\n';
textBuilder += 'if ( THREE.OBJLoader2 === undefined ) { THREE.OBJLoader2 = {} }\n\n';
textBuilder += buildObject( 'THREE.OBJLoader2.consts', THREE.OBJLoader2.consts );

textBuilder += buildSingelton( 'THREE.OBJLoader2.Parser', 'Parser', THREE.OBJLoader2.Parser );
textBuilder += buildSingelton( 'THREE.OBJLoader2.RawObject', 'RawObject', THREE.OBJLoader2.RawObject );
textBuilder += buildSingelton( 'THREE.OBJLoader2.RawObjectDescription', 'RawObjectDescription', THREE.OBJLoader2.RawObjectDescription );

textBuilder += buildSingelton( 'THREE.WebWorker.WWOBJLoader', 'WWOBJLoader', THREE.WebWorker.WWOBJLoader );
textBuilder += buildSingelton( 'THREE.WebWorker.WWMeshCreator', 'WWMeshCreator', THREE.WebWorker.WWMeshCreator );
textBuilder += 'THREE.WebWorker.WWOBJLoaderRef = new THREE.WebWorker.WWOBJLoader();\n\n';
textBuilder += buildSingelton( 'THREE.WebWorker.WWOBJLoaderRunner', 'WWOBJLoaderRunner', THREE.WebWorker.WWOBJLoaderRunner );
textBuilder += 'new THREE.WebWorker.WWOBJLoaderRunner();\n\n';

var parser = THREE.OBJLoader2.Parser.prototype;

console.log( textBuilder );
var blob = new Blob( [ textBuilder ], { type: 'text/plain' } );
var worker = new Worker( window.URL.createObjectURL( blob ) );

