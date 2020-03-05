/**
 * @author Kai Salmen / www.kaisalmen.de
 */

import { sayHello } from './greet.js';

addEventListener('message', e => {
	postMessage( sayHello() );
});
