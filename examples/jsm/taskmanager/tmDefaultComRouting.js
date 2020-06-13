/**
 * @author Kai Salmen / www.kaisalmen.de
 */

function comRouting ( message, init, execute ) {
	let payload = message.data;
	if ( payload.cmd === 'init' ) {

		init( self, payload.id, payload.config );

	}
	else if ( payload.cmd === 'execute' ) {

		execute( self, payload.id, payload.config );

	}
}

export { comRouting }
