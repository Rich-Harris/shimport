showFoo=()=>import('./foo.js').then(foo => {
	console.log(foo);
});