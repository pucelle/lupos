const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const {checkMirror} = require('./mirror-test-helpers.cjs')
const {repositoryRoot, compile} = require('./compiler-test-helpers.cjs')


test('checks component handlers and contextually types inline callbacks', () => {
	checkMirror([
		"import {Component, html} from 'lupos.html'",
		'interface Events { change: (value: number, label: string) => void }',
		'class Card extends Component<Events> {}',
		'class Child extends Card {}',
		'declare const Dynamic: typeof Card | typeof Child',
		'export const result = html`<Child @change=${(value, label) => { value.toFixed(); label.toUpperCase() }} />',
		'<${Dynamic} @change=${(value, label) => { value.toFixed(); label.toUpperCase() }} />',
		'<Card @@change=${(value: string) => value.toUpperCase()} />',
		'<Card @change=${123} /><Card @@missing=${() => {}} />`',
	], errors => {
		assert.equal(errors.length, 3, JSON.stringify(errors))
		assert.ok(errors.some(error => error.text.includes('value: string')))
		assert.ok(errors.some(error => error.text === '123'))
		assert.ok(errors.some(error => error.text === 'missing'))
	})
})

test('checks DOM handlers through the on binding, including component element fallback', () => {
	checkMirror([
		"import {Component, html} from 'lupos.html'",
		'class Card extends Component<{}> {}',
		'export const result = html`<div @click.prevent=${event => event.preventDefault()} @keydown=${null} />',
		'<Card @click=${123} /><img @load=${"bad"} /><div @@click=${() => {}} />',
		'<div @click=${(event: KeyboardEvent) => event.key} />`',
	], errors => {
		assert.equal(errors.length, 3, JSON.stringify(errors))
		assert.ok(errors.some(error => error.text === '123'))
		assert.ok(errors.some(error => error.text === '"bad"'))
		assert.ok(errors.some(error => error.text.includes('event: KeyboardEvent')))
	})
})

test('checks event callbacks in narrowed loop scopes without duplicate original diagnostics', () => {
	checkMirror([
		"import {Component, html} from 'lupos.html'",
		'interface Events { change: (value: number) => void }',
		'class Card extends Component<Events> {}',
		'export const result = html`<lu:for ${item} of ${["a", null]}>',
		'<lu:if ${item !== null}><Card @change=${value => item.repeat(value)} />',
		'<Card @change=${value => value.missing} /></lu:if></lu:for>`',
	], errors => {
		assert.equal(errors.length, 1, JSON.stringify(errors))
		assert.equal(errors[0].text, 'missing')
	})
})

test('reports mirror event errors once through the compiler and retains modifier checks', () => {
	let directory = fs.mkdtempSync(path.join(repositoryRoot, '.compiler-events-'))

	try {
		fs.writeFileSync(path.join(directory, 'tsconfig.json'), JSON.stringify({
			compilerOptions: {module: 'ESNext', moduleResolution: 'Bundler', target: 'ES2024',
				strict: true, skipLibCheck: true, outDir: 'out'},
			include: ['src.ts'],
		}))
		fs.writeFileSync(path.join(directory, 'src.ts'), [
			"import {Component, html} from 'lupos.html'",
			'interface Events { change: (value: number) => void }',
			'class Card extends Component<Events> {}',
			'export const result = html`<Card @change=${123} @@missing=${() => {}} />',
			'<div @click=${123} @click.invalid=${() => {}} />`',
		].join('\n'))

		let result = compile(directory)
		assert.notEqual(result.status, 0)
		assert.equal((result.output.match(/error TS2345:/g) ?? []).length, 3, result.output)
		assert.match(result.output, /Modifier 'invalid' is not supported/)
		assert.doesNotMatch(result.output, /is not a event handler|does not support event/)
	}
	finally {
		fs.rmSync(directory, {recursive: true, force: true})
	}
})
