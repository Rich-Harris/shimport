import typescript from 'rollup-plugin-typescript';
import replace from 'rollup-plugin-replace';
import { terser } from 'rollup-plugin-terser';
import filesize from 'rollup-plugin-filesize';
import pkg from './package.json';

export default [
	{
		input: 'src/index.ts',
		output: [
			{ file: pkg.main, format: 'iife' }
		],
		name: '__shimport__',
		plugins: [
			replace({ __VERSION__: pkg.version }),
			typescript({
				typescript: require('typescript')
			}),
			terser(),
			{
				transformBundle(code) {
					return {
						code: code.replace('alert', '(0,eval)'),
						map: null
					};
				}
			},
			filesize()
		]
	},

	{
		input: 'src/index.ts',
		output: [
			{ file: 'index.dev.js', format: 'iife' }
		],
		name: '__shimport__',
		plugins: [
			replace({ __VERSION__: pkg.version }),
			typescript({
				typescript: require('typescript')
			}),
			{
				transformBundle(code) {
					return {
						code: code.replace('alert', '(0,eval)'),
						map: null
					};
				}
			}
		]
	}
];