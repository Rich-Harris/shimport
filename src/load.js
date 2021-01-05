// @ts-check
import { transform } from './transform.js';

/** @type {Record<string, Promise<any>>} */
const promises = {};

/** @typedef {(id: string) => Promise<any>} __Import */
/** @typedef {Record<string, any>} __Exports */

/**
 * @param {string} id
 * @param {string[]} deps
 * @param {(__import: __Import, __exports: __Exports, ...deps: any[]) => void} factory
 */
export function define(id, deps, factory) {
	const __import = (dep) => load(new URL(dep, id).toString());

	return Promise.all(deps.map(__import)).then(__deps => {
		const __exports = {};

		factory(__import, __exports, ...__deps);
		return __exports;
	});
}

/**
 * @param {string} url
 */
export function load(url) {
	return promises[url] || (
		promises[url] = fetch(url)
			.then(r => r.text())
			.then(text => evaluate(transform(text, url)))
	);
}

let uid = 1;

/**
 * @param {string} code
 */
function evaluate(code) {
	if (typeof document !== 'undefined' && typeof URL !== 'undefined') {
		return new Promise(fulfil => {
			const id = `__shimport__${uid++}`;

			// creating a script tag gives us proper stack traces
			const blob = new Blob([`${id}=${code}`], {
				type: 'application/javascript'
			});

			const script = document.createElement('script');
			script.src = URL.createObjectURL(blob);

			script.onload = () => {
				fulfil(window[id]);
				delete window[id];
			};

			document.head.appendChild(script);
		});

	} else {
		// for browsers without `URL`
		return (0,eval)(code);
	}
}