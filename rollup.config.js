import sucrase from '@rollup/plugin-sucrase';
import replace from '@rollup/plugin-replace';
import { terser } from 'rollup-plugin-terser';
import pkg from './package.json';

const config = dev => ({
	input: 'src/index.ts',
	output: [
		{
			file: dev ? 'index.dev.js' : pkg.main,
			format: 'iife',
			name: '__shimport__'
		}
	],
	plugins: [
		replace({ __VERSION__: pkg.version }),
		sucrase({ transforms: ['typescript'] }),
		!dev && terser(),
		{
			transformBundle(code) {
				return {
					code: code.replace('alert', '(0,eval)'),
					map: null
				};
			}
		}
	]
})

export default [
	config(false),
	config(true)
];