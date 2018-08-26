import { something } from './static-import.js';

const main = document.querySelector('main');

main.innerHTML = `
<p>${something}</p>
<p id="dynamic">...</p>
<button>Click me</button>
`;

main.querySelector('button').addEventListener('click', () => {
	import('./dynamic-import.js').then(({ somethingElse }) => {
		document.querySelector('#dynamic').textContent = somethingElse;
	});
});