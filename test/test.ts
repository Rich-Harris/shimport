import * as fs from 'fs';
import * as path from 'path';
import * as assert from 'assert';
import * as shimport from '../src/index';

describe('shimport', () => {
	fs.readdirSync('test/samples').forEach(dir => {
		if (dir[0] === '.') return;

		it(dir, () => {
			const input = fs.readFileSync(`test/samples/${dir}/input.js`, 'utf-8');
			const expected = fs.readFileSync(`test/samples/${dir}/output.js`, 'utf-8');

			const actual = shimport.transform(input, `./${dir}/input.js`);
			fs.writeFileSync(`test/samples/${dir}/actual.js`, actual);

			assert.equal(actual, expected);
		});
	});
});
