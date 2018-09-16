const { readFileSync, writeFileSync } = require('fs')
, { find, transform } = require('../../indexNode.js')
, assert = require('assert')

describe("Shimport as node module", () => {

	const source = readFileSync('test/nodeModule/input.js','utf8')
	, expected = readFileSync('test/nodeModule/output.js','utf8')

	it('Should be equal', () => {

		const transformed = transform(source,'myModule')

		assert.equal(expected,transformed)



	})
})

/*const found = find( source )

console.log( found )

console.log( transformed )

writeFileSync('output.js',transformed)*/