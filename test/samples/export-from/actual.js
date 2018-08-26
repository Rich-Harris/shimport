__shimport__.load('./export-from/input.js', ['foo'], function(foo){// TODO export from
foo = foo.default; /*import foo from 'foo'*/;

console.log(foo);
});