import { transform } from './transform';

const promises: Record<string, Promise<any>> = {};

type __Import = (id: string) => Promise<any>;
type __Exports = Record<string, any>;

export function define(
	id: string,
	deps: string[],
	factory: (__import: __Import, __exports: __Exports, ...deps: any[]) => void
) {
	const __import = (dep: string) => load(new URL(dep, id));

	return Promise.all(deps.map(__import)).then(__deps => {
		const __exports = {};

		factory(__import, __exports, ...__deps);
		return __exports;
	});
}

export function load(url: string | URL) {
	return promises[<string>url] || (
		promises[<string>url] = fetch(<string>url)
			.then(r => r.text())
			.then(text => alert(transform(text, <string>url)))
	);
}