__shimport__.define('myModule', ['foo', 'baz', 'loo', 'rich'], function(__import, __exports, foo, baz, loo, rich){ // This is test module
foo = foo.default; /*import foo from 'foo'*/
baz = baz.default; /*import baz from 'baz'*/
loo = loo.default; /*import loo from 'loo'*/
rich = rich.default; /*import rich from 'rich'*/

/* Some code here */
console.log( foo, bar, baz )

__exports.foo = foo; __exports.bar = bar; __exports.baz = baz; /*export { foo, bar, baz }

*/__exports.default = rich

});
//# sourceURL=myModule