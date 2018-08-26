__shimport__.define('./import-default-star/input.js', ['./x.js'], function(__import, __exports, bar){ var foo = bar.default; /*import foo, * as bar from './x.js'*/;

console.log(foo, bar);
});
//# sourceURL=./import-default-star/input.js