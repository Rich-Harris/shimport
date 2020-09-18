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
			.then(text => evaluate(transform(text, <string>url)))
	);
}

let uid = 1;

function evaluate(code: string) {
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
				fulfil((window as any)[id]);
				delete (window as any)[id];
			};

			document.head.appendChild(script);
		});

	} else {
		// for browsers without `URL`
		return <unknown>(0,eval)(code);
	}
}