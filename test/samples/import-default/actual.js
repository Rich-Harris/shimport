__shimport__.load('./import-default/input.js', ['./foo.js'], function(foo, __exports){ foo = foo.default; /*import foo from './foo.js'*/;

console.log(foo);
});