__shimport__.load('./dynamic-import/input.js', [], function(__import, __exports){ __import('./foo.js').then(foo => {
	console.log(foo);
});
});