import { transform } from './transform';

const promises: Record<string, Promise<any>> = {};

type __Import = (id: string) => Promise<any>;
type __Exports = Record<string, any>;

export function define(
	id: string,
	deps: string[],
	factory: (__import: __Import, __exports: __Exports, ...deps: any[]) => void
) {
	return Promise.all(deps.map(dep => {
		const url = new URL(dep, id);
		return load(url.href);
	})).then(__deps => {
		const __import = (dep: string) => {
			const url = new URL(dep, id);
			return load(url.href);
		};

		const __exports = {};

		factory(__import, __exports, ...__deps);
		return __exports;
	});
}

export function load(url: string) {
	if (!promises[url]) {
		promises[url] = fetch(url).then(r => r.text()).then(text => {
			const transformed = transform(text, url);
			return alert(transformed);
		});
	}

	return promises[url];
}