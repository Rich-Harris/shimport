const fs = require('fs');
const ms = require('pretty-ms');
const c = require('kleur');

const shimport = `(function() { ${fs.readFileSync('index.js', 'utf-8')}; return __shimport__; }())`;

const n = 25;

function test(file) {
	console.log(c.bold.cyan(file));

	const __shimport__ = eval(shimport);
	const code = fs.readFileSync(file, 'utf-8');

	let err;

	function run(code, file) {
		try {
			const start = process.hrtime();
			__shimport__.transform(code, file);
			const time = process.hrtime(start);

			const ms = time[0] * 1000 | time[1] / 1e6;

			return ms;
		} catch (e) {
			err = e;
			return null;
		}
	}

	const firstRun = run(code, file);
	console.log(`> Cold: ${c.bold.green(ms(firstRun))}`);

	if (firstRun === null) {
		console.log(c.bold.red(err.message));
		return;
	}

	// warm up
	let i = n;
	while (i--) run(code, file);

	// take average
	i = n;
	let total = 0;
	while (i--) total += run(code, file);

	const avg = total / n;
	console.log(`> Warm: ${c.bold.green(ms(avg))} (average of ${n} runs)`);

}

fs.readdirSync('bench/samples').forEach(file => {
	console.log('');
	test(`bench/samples/${file}`);
});

console.log('');