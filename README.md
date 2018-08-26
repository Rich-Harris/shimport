# Shimport

A 2kb shim for `import` and `export`. Allows you to use JavaScript modules in **all** browsers, including dynamic `import()`.


## Quick start

Suppose you have a module called `js/app.js`. We want to:

1. check to see if modules are fully supported in the current browser, including dynamic imports
2. if they are, just use the native module loader
3. if not, use Shimport

We can do this by adding a simple script tag to our `index.html` file:

```html
<script>
  var __s = document.createElement('script');

  try {
    new Function('import("")');
    __s.type = 'module';
    __s.src = 'js/app.js';
  } catch (e) {
    __s.src = 'https://unpkg.com/shimport'
    __s.dataset.main = 'js/app.js';
  }

  document.head.appendChild(__s);
</script>
```


## Installing locally

In the example above we loaded Shimport from the unpkg CDN. You can also [grab the latest copy](https://unpkg.com/shimport) and include alongside your app's other files.

You can also `npm install shimport`, in which case it will be available as `node_modules/shimport/index.js`.


## API

Most of the time you won't need to interact directly with Shimport, but it's useful to understand how it works. The script creates a global variable, `__shimport__`, with the following methods:

* `load(url: string) => Promise<module>` — `url` must be fully qualified
* `transform(source: string) => string` — converts a JavaScript module to a Shimport module
* `define(id: string, deps: string[], factory: (...) => void)` — used interally to construct modules


## Using with Rollup and code-splitting

Since [Rollup](https://rollupjs.org) can already output JavaScript modules, it's easy to use with Shimport. Just use the `esm` output format:

```js
// rollup.config.js
export default {
  input: 'src/app.js',
  output: {
    dir: 'js',
    format: 'esm'
  },
  experimentalCodeSplitting: true
};
```


## Skipping feature detection

If you want to *always* use Shimport, regardless of environment, you can create a script that loads Shimport with a `data-main` attribute:

```html
<script src="path/to/shimport.js" data-main="path/to/my/module.js"></script>
```


## Using with a web worker

In a web worker environment, Shimport can't auto-start based on a script with `data-main`. Instead, use the API:

```js
importScripts('path/to/shimport.js');

const { href } = new URL('path/to/my/module.js', location.href);
__shimport__.load(href).then(mod => {
	// module is loaded
});
```


## Caveats

The JavaScript module specification is complex, and extremely hard to implement completely with the techniques Shimport uses. It is designed to meet the 98% of cases you encounter in the real world, rather than covering the entire spec at the cost of becoming prohibitively slow and complex.

Specifically, it will not correctly handle cyclical dependencies or live bindings.



## License

[LIL](LICENSE)