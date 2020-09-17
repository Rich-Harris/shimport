import { test } from 'uvu';
import * as fs from 'fs';
import * as assert from 'assert';
import * as shimport from '../src/index';

fs.readdirSync('test/samples').forEach(dir => {
	if (dir[0] === '.') return;

	test(dir, () => {
		const input = fs.readFileSync(`test/samples/${dir}/input.js`, 'utf-8');
		const actual = shimport.transform(input, `./${dir}/input.js`);
		fs.writeFileSync(`test/samples/${dir}/actual.js`, actual);

		const expected = fs.readFileSync(`test/samples/${dir}/output.js`, 'utf-8');

		assert.equal(actual, expected);
	});
});

test.run();