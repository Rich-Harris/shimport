//@ts-check
import { transform } from './transform.js';
import { define, load } from './load.js';

if (typeof document !== 'undefined') {
	const scr = document.querySelector('[data-main]');
	if (scr) {
		load(new URL(scr.getAttribute('data-main'), document.baseURI).toString());
	}
}

const VERSION = "__VERSION__";

export { transform, define, load, VERSION };