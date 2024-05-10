module.exports = {
	preset: 'ts-jest/presets/js-with-ts-esm',
	transformIgnorePatterns: [
    	'node_modules/(?!@pucelle/ff)',
		'node_modules/(?!@pucelle/lupos.js)'
    ],
	testEnvironment: 'jsdom',
	testMatch: [
		'**/tests/**/*.test.ts'
	]
}