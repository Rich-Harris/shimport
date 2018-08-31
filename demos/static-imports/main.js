import a from './a.js';
import { message } from './b.js';

document.body.innerHTML += `
	<p>${a}</p>
	<p>${message}</p>
`;