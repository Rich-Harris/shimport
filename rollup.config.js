import buble from '@rollup/plugin-buble';
import replace from '@rollup/plugin-replace';
import { terser } from 'rollup-plugin-terser';
import pkg from './package.json';

const config = dev => ({
	input: 'src/index.js',
	output: [
		{
			file: dev ? 'index.dev.js' : pkg.main,
			format: 'iife',
			name: '__shimport__',
			esModule: false
		}
	],
	plugins: [
		replace({
			__VERSION__: pkg.version
		}),
		buble(),
		!dev && terser({
			output: {
				comments: false
			}
		})
	]
})

export default [
	config(false),
	config(true)
];