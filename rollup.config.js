import typescript from 'rollup-plugin-typescript';
import { terser } from 'rollup-plugin-terser';
import pkg from './package.json';

export default {
	input: 'src/index.ts',
	output: [
		{ file: pkg.main, format: 'iife' }
	],
	name: '__shimport__',
	plugins: [
		typescript({
			typescript: require('typescript')
		}),
		terser()
	]
};