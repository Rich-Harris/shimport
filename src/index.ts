import { transform } from './transform';
import { define, load } from './load';

interface Script extends Element {
	dataset: Record<string, string>;
}

if (typeof document !== 'undefined') {
	const scr: Script = document.querySelector('[data-main]');
	if (scr) {
		load(new URL(scr.dataset.main, document.baseURI));
	}
}

export { transform, define, load };