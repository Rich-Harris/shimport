importScripts('../shimport.js');

const main = new URL('./app/main.js', location.href);
__shimport__.load(main.href);