const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const {repositoryRoot, compile} = require('./compiler-test-helpers.cjs')
const test = require('node:test')
const {checkMirror} = require('./mirror-test-helpers.cjs')
const {mapOriginalPositionToMirror, mapMirrorSpanToOriginal} = require('lupos/mirror-provider')


test('checks DOM dot properties with their concrete element types, without checking attributes', () => {
	checkMirror([
		"import {html} from 'lupos.html'",
		'export const valid = html`<img .src="image.png" .width=${12} src=${123} width=${false} />',
		'<input .checked .value="text ${1}" /><x-widget .title="custom element" />`',
		'export const invalid = html`<img .src=${123} .missing=${true} .naturalWidth=${1} />',
		'<input .checked=${"yes"} .width /><div .onclick=${e => e.missing} />`',
	], (errors, document) => {
		assert.equal(errors.length, 6, JSON.stringify(errors, null, 2))
		assert.equal(errors.filter(e => e.code === 2322).length, 3)
		assert.equal(errors.filter(e => e.code === 2339).length, 2)
		assert.ok(errors.some(e => e.code === 2540 && e.text === 'naturalWidth'))
		assert.ok(errors.some(e => e.message.includes('HTMLImageElement')))
		assert.ok(errors.some(e => e.message.includes('PointerEvent')))
		assert.doesNotMatch(document.mirrorText, /\.src = \(\("" as string\)\)/)
		let original = document.originalText.indexOf('.src') + 1
		let mirrored = mapOriginalPositionToMirror(document, original, 'definition')
		assert.equal(document.mirrorText.slice(mirrored, mirrored + 3), 'src')
		assert.deepEqual(mapMirrorSpanToOriginal(document, {start: mirrored, length: 3}, 'diagnostic'),
			{start: original, length: 3})
	})
})

test('routes component and element properties according to the compiler', () => {
	checkMirror([
		"import {Component, html} from 'lupos.html'",
		'class Card extends Component { count = 0; label = ""; set size(value: number) { this.count = value } get locked() { return 1 } callback() {} }',
		'export class View extends Component {',
		' render() { return html`<template .title="host"><Card .count=${1} .title="element" ..label="component" />',
		'<${Card} .title="dynamic element" .count=${2} .size=${2} .callback=${() => {}} />',
		'<Card .count=${"bad"} .title=${1} ..title="bad" .locked=${1} />',
		'</template>` }',
		'}',
	], errors => {
		assert.equal(errors.length, 4, JSON.stringify(errors, null, 2))
		assert.equal(errors.filter(e => e.code === 2322).length, 2)
		assert.ok(errors.some(e => e.code === 2339 && e.message.includes("type 'Card'")))
		assert.ok(errors.some(e => e.code === 2540 && e.text === 'locked'))
	})
})

test('uses SVG element property types, including HTML inside foreignObject', () => {
	checkMirror([
		"import {html, svg} from 'lupos.html'",
		'export const vector = svg`<circle .id="a" .cx=${1} />`',
		'export const nested = html`<svg><circle .cx=${1} /><foreignObject><img .src="a.png" .src=${1} /></foreignObject></svg>`',
	], errors => {
		assert.equal(errors.length, 3, JSON.stringify(errors, null, 2))
		assert.equal(errors.filter(e => e.code === 2540 && e.text === 'cx').length, 2)
		assert.ok(errors.some(e => e.code === 2322 && e.text === '.src'), JSON.stringify(errors, null, 2))
	})
})

test('reports DOM property diagnostics through the compiler but leaves ordinary attributes alone', () => {
	let projectDirectory = fs.mkdtempSync(path.join(repositoryRoot, '.compiler-dom-properties-'))
	try {
		fs.writeFileSync(path.join(projectDirectory, 'tsconfig.json'), JSON.stringify({
			compilerOptions: {module: 'ESNext', moduleResolution: 'Bundler', target: 'ES2024',
				strict: true, skipLibCheck: true, outDir: 'out'}, include: ['src.ts'],
		}))
		let writeSource = template => fs.writeFileSync(path.join(projectDirectory, 'src.ts'),
			"import {html} from 'lupos.html'\nexport const result = html`" + template + '`\n')
		writeSource('<img .src=${123} .naturalWidth=${1} .missing=${true} src=${123} />')
		let invalid = compile(projectDirectory)
		assert.notEqual(invalid.status, 0)
		assert.equal((invalid.output.match(/error TS2322:/g) ?? []).length, 1, invalid.output)
		assert.equal((invalid.output.match(/error TS2540:/g) ?? []).length, 1, invalid.output)
		assert.equal((invalid.output.match(/error TS2339:/g) ?? []).length, 1, invalid.output)
		assert.match(invalid.output, /HTMLImageElement/)
		writeSource('<img .src="a.png" src=${123} /><input .checked />')
		let valid = compile(projectDirectory)
		assert.equal(valid.status, 0, valid.output)
		assert.equal(valid.output, '')
	}
	finally {
		fs.rmSync(projectDirectory, {recursive: true, force: true})
	}
})

test('uses a TypeScript mirror for component property diagnostics', () => {
	let projectDirectory = fs.mkdtempSync(path.join(repositoryRoot, '.compiler-mirror-diagnostics-'))

	try {
		fs.writeFileSync(path.join(projectDirectory, 'tsconfig.json'), JSON.stringify({
			compilerOptions: {
				module: 'ESNext',
				moduleResolution: 'Bundler',
				target: 'ES2024',
				strict: true,
				skipLibCheck: true,
				outDir: 'out',
			},
			include: ['src.ts'],
		}, null, '\t'))

		fs.writeFileSync(path.join(projectDirectory, 'card.ts'), [
			"import {Component} from 'lupos.html'",
			'export class Card<T> extends Component { value!: T }',
			'export class NumberCard extends Card<number> {}',
		].join('\n'))

		fs.writeFileSync(path.join(projectDirectory, 'src.ts'), [
			"import {Component, html} from 'lupos.html'",
			"import {NumberCard as NumericCard} from './card'",
			'class Card extends Component {',
			'\tcount: number = 0',
			'\tenabled: boolean = false',
			'\tnumeric: number = 0',
			'\treadonly locked: number = 0',
			'\tlabel: string = ""',
			"\tresize: 'both' | 'horizontal' | 'vertical' | 'none' = 'none'",
			'}',
			'export const first = html`<Card .count=${"wrong"} .enabled .missing=${1} .resize="diagonal" /><NumericCard .value=${"wrong"} />`',
			'export const second = html`<Card .numeric .locked=${2} .label="value ${1}" />`',
		].join('\n'))

		let invalid = compile(projectDirectory)
		assert.notEqual(invalid.status, 0)
		assert.equal((invalid.output.match(/error TS2322:/g) ?? []).length, 4, invalid.output)
		assert.match(invalid.output, /Type 'string' is not assignable to type 'number'\./)
		assert.match(invalid.output, /Type 'boolean' is not assignable to type 'number'\./)
		assert.match(invalid.output, /Type '"diagonal"' is not assignable to type '"both" \| "horizontal" \| "vertical" \| "none"'\./)
		assert.match(invalid.output, /error TS2540: Cannot assign to 'locked' because it is a read-only property\./)
		assert.match(invalid.output, /error TS2339: Property 'missing' does not exist on type 'HTMLElement'\./)
		assert.doesNotMatch(invalid.output, /Value type 'string'/)

		fs.writeFileSync(path.join(projectDirectory, 'src.ts'), [
			"import {Component, html} from 'lupos.html'",
			"import {NumberCard as NumericCard} from './card'",
			"class Card extends Component { count: number = 0; enabled: boolean = false; label: string = ''; resize: 'both' | 'horizontal' | 'vertical' | 'none' = 'none' }",
			'export const result = html`<Card .count=${1} .enabled .label="value ${1}" .resize="vertical" /><NumericCard .value=${1} />`',
		].join('\n'))

		let valid = compile(projectDirectory)
		assert.equal(valid.status, 0, valid.output)
		assert.equal(valid.output, '')
	}
	finally {
		fs.rmSync(projectDirectory, {recursive: true, force: true})
	}
})
