import { something } from './static-import.js';

console.log({ something });

import('./dynamic-import.js').then(({ somethingElse }) => {
	console.log({ somethingElse });
});