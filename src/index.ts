import { transform } from './transform';
import { define, load } from './load';
import { version } from '../package.json';

interface Script extends Element {
	dataset: Record<string, string>;
}

if (typeof document !== 'undefined') {
	const scr: Script = document.querySelector('[data-main]');
	if (scr) {
		load(new URL(scr.dataset.main, document.baseURI));
	}
}

export { transform, define, load, version as VERSION };