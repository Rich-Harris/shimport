import { transform } from './transform';
import { define, load } from './load';

interface Script extends Element {
	dataset: Record<string, string>;
}

const doc = self.document;
if (doc) {
	const scr: Script = doc.querySelector('[data-main]');
	if (scr) {
		load(new URL(scr.dataset.main, doc.baseURI));
	}
}

export { transform, define, load };