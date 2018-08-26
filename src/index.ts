import { transform } from './transform';
import { define, load } from './load';

if (typeof document !== 'undefined') {
	const scr = document.querySelector('[data-main]');
	if (scr) {
		const url = scr.getAttribute('data-main');
		load(new URL(url, document.baseURI).href);
	}
}

export { transform, define, load };