import typescript from '@rollup/plugin-typescript';
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
		replace({
			__VERSION__: pkg.version
		}),
		typescript({
			typescript: require('typescript')
		}),
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