const message = `
<p>Normally, you'd use Shimport with a snippet like the following:</p>

<pre>
var __s = document.createElement('script');
try {
	new Function('import("")');
	__s.type = 'module';
	__s.src = './main.js';
} catch (e) {
	__s.src = 'https://unpkg.com/shimport'
	__s.dataset.main = './main.js';
}

document.head.appendChild(__s);
</pre>

<p>With this code, Shimport is only used if the browser doesn't support modules (or dynamic import).</p>

<p>You might want to <em>always</em> use Shimport, regardless of support — e.g. for testing or performance profiling. In those cases, you can simply add a &lt;script&gt; tag that loads Shimport and tells it where to find your app:</p>

<pre>
&lt;script src="https://unpkg.com/shimport" data-main="./main.js"&gt;&lt;/script&gt;
</pre>
`;

export { message };