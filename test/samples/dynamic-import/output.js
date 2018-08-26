__shimport__.define('./dynamic-import/input.js', [], function(__import, __exports){ __import('./foo.js').then(foo => {
	console.log(foo);
});
});