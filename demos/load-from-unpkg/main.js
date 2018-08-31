import range from 'https://unpkg.com/lodash-es/range.js?module';

document.querySelector('main').innerHTML += `
<pre>
range(1, 10)
-> ${range(1, 10).join(', ')}
</pre>

<p>You might have noticed this took a few moments to appear.</p>

<p>If you look at the network tab in your devtools and reload, you'll see why: <code>range.js</code> depends on many other modules in the <code>lodash-es</code> package, which must be downloaded individually.</p>

<p>This is why, in production, you should use a bundler to combine the individual modules in your app into a few coarse-grained chunks. <a href="https://rollupjs.org">Rollup</a> can do this for you, and will output native JavaScript modules that can be used with Shimport.</p>
`;