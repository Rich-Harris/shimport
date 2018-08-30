__shimport__.define('./dynamic-import-minified/input.js', [], function(__import, __exports){ showFoo=()=>__import('./foo.js').then(foo => {
	console.log(foo);
});
});
//# sourceURL=./dynamic-import-minified/input.js