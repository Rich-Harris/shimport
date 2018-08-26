__shimport__.define('./import-named-multiple/input.js', ['./x.js'], function(__import, __exports, __dep_0){ var foo = __dep_0.foo; var bar = __dep_0.bar; /*import { foo, bar } from './x.js'*/;

console.log(foo, bar);
});
//# sourceURL=./import-named-multiple/input.js