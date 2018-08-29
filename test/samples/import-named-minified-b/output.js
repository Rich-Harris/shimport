__shimport__.define('./import-named-minified-b/input.js', ['./foo.js', './bar.js'], function(__import, __exports, __dep_0, __dep_1){ var foo = __dep_0.foo; /*import{foo}from './foo.js'*/;var bar = __dep_1.bar; /*import{bar}from './bar.js'*/;

console.log(foo, bar);
});
//# sourceURL=./import-named-minified-b/input.js