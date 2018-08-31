document.querySelector('button').addEventListener('click', () => {
	import('./dynamic-import.js').then(({ message }) => {
		document.querySelector('p').innerHTML = message;
	});
});