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
		sucrase({ transforms: ['typescript'] }),
		replace({
			__VERSION__: pkg.version
		}),
		!dev && terser()
	]
})

export default [
	config(false),
	config(true)
];