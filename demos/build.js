const fs = require('fs');

process.chdir(__dirname);

const html = fs.readFileSync('index.html', 'utf-8');

const dirs = fs.readdirSync('.').filter(file => {
	if (file === 'node_modules') return;
	if (file[0] === '.') return;

	return fs.statSync(file).isDirectory();
});

fs.writeFileSync('index.html', html
	.replace(/<ul>([\s\S]*)<\/ul>/, `<ul>${
		dirs.map(dir => `\n\t\t<li><a href="${dir}/">${dir}</a></li>`).join('')
	}\n\t</ul>`));