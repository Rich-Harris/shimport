const fs = require('fs');
const ms = require('pretty-ms');
const c = require('kleur');
const { locate } = require('locate-character');

const shimport = `(function() { ${fs.readFileSync('index.dev.js', 'utf-8')}; return __shimport__; }())`;

const n = 25;

function test(file) {
	console.log(c.bold.cyan(file));

	const __shimport__ = eval(shimport);
	const code = fs.readFileSync(file, 'utf-8');

	let err;

	function run(code, file) {
		try {
			const start = process.hrtime();
			const transformed = __shimport__.transform(code, file);
			const time = process.hrtime(start);

			const duration = time[0] * 1000 | time[1] / 1e6;

			return { duration, transformed };
		} catch (e) {
			err = e;
			return null;
		}
	}

	const firstRun = run(code, file);

	if (firstRun === null) {
		const match = /Error parsing module at character (\d+)/.exec(err.message);
		if (match) {
			const { line, column } = locate(code, +match[1]);
			err.message += ` (${line}:${column})`;
		}
		console.log(c.bold.red(err.message));
		console.log(err.stack);
		return;
	}

	console.log(`> Cold: ${c.bold.green(ms(firstRun.duration))}`);

	fs.writeFileSync(file.replace('/samples/', '/output/'), firstRun.transformed);

	// warm up
	let i = n;
	while (i--) run(code, file);

	// take average
	i = n;
	let total = 0;
	while (i--) total += run(code, file).duration;

	const avg = total / n;
	console.log(`> Warm: ${c.bold.green(ms(avg))} (average of ${n} runs)`);
}

let files = process.argv.slice(2);
if (files.length === 0) {
	files = fs.readdirSync('bench/samples').map(f => `bench/samples/${f}`);
}

files.forEach(test);

console.log('');