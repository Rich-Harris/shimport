import { foo } from './foo.js';

console.log(foo);

import('./bar.js').then(({ bar }) => {
	console.log(bar);
});