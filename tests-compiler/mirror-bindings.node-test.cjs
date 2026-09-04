const fs = require('node:fs')
const path = require('node:path')
const {repositoryRoot, compile} = require('./compiler-test-helpers.cjs')
const assert = require('node:assert/strict')
const test = require('node:test')
const {checkMirror} = require('./mirror-test-helpers.cjs')

test('checks binding constructors, modifiers, overloads, generics, and each update argument', () => {
	checkMirror([
		"import {Binding, html} from 'lupos.html'",
		'class Pair implements Binding {',
		' constructor(_el: Element, _context: unknown, _modifiers: ("good" | "fine")[] = []) {}',
		' update(a: number, b: string): void;',
		' update(a: string, b: number): void;',
		' update(_a: number | string, _b: number | string) {}',
		'}',
		'class Generic implements Binding { update<T>(value: T, fn: (value: T) => void) {} }',
		'class Triple implements Binding { update(_a: number, _b: string, _c: boolean) {} }',
		'export const valid = html`<div :Pair.good=${1, "a"} :Pair=${"a", 1} :Generic=${1, n => n.toFixed()} :Triple=${(1, "a", true)} />`',
		'export const invalid = html`<div :Pair.bad=${1, true} :Triple=${1} :Triple=${1, "a", true, false} :Generic=${1, n => n.missing} />`',
	], errors => {
		assert.equal(errors.length, 5, JSON.stringify(errors, null, 2))
		assert.ok(errors.some(e => e.code === 2322 && e.text === 'bad'))
		assert.ok(errors.some(e => e.code === 2769))
		assert.equal(errors.filter(e => e.code === 2554).length, 2)
		assert.ok(errors.some(e => e.code === 2339 && e.text === 'missing'))
	})
})

test('narrows conditional binding arguments and checks references in attribute order per element', () => {
	checkMirror([
		"import {Binding, Component, html} from 'lupos.html'",
		'class Show implements Binding { update(_value: string) {} showOnly = 1 }',
		'class Other implements Binding { update(_value: number) {} otherOnly = 1 }',
		'class Card extends Component { cardOnly = 1 }',
		'export class View extends Component {',
		' value: string | null = null; show!: Show; card!: Card; input!: HTMLInputElement;',
		' render() { return html`',
		' <div ?:Show=${this.value, this.value} :ref.binding=${this.show} />',
		' <Card :ref.com=${this.card} :ref=${card => card.cardOnly} />',
		' <${Card} :ref.com=${card => card.cardOnly} />',
		' <input :ref=${this.input} :ref=${el => el.value} />',
		' <div :Show=${"ok"} :Other=${1} :ref.binding=${binding => binding.otherOnly} />',
		' <div :Other=${1} :ref.binding=${this.show} />',
		' <span :ref.binding=${binding => binding.otherOnly} />',
		' ` }',
		'}',
	], (errors, document) => {
		assert.equal(errors.length, 2, JSON.stringify(errors, null, 2))
		assert.ok(errors.some(e => e.code === 2741 && e.text === 'this.show'))
		assert.ok(errors.some(e => e.code === 18047))
		assert.match(document.mirrorText, /if \(\(this.value\)\) \{let .* = new Show/)
	})
})

test('checks special class, style, ref and internal constructor signatures without imports', () => {
	checkMirror([
		"import {Component, html, svg} from 'lupos.html'",
		'export class View extends Component {',
		' elRef!: HTMLDivElement; readonly locked = document.createElement("div");',
		' render() { return html`',
		' <div :class="a b" :class=${["a", "b"]} :class=${{active: 1}} :class.active=${true}',
		' :style="display: block" :style=${{display: "block"}} :style.width.px=${2} :style.width.percent=${50}',
		' :style.background-image.url=${"a.png"} :ref=${this.elRef} :html=${123} />',
		' <div :class=${1} :style=${{width: 2}} :style.width=${2} :transition.invalid=${null}',
		' :ref.invalid=${this.elRef} :ref=${this.locked} />',
		' ` }',
		'}',
		'export const vector = svg`<circle :ref=${el => el.cx.baseVal} />`',
	], errors => {
		assert.equal(errors.length, 6, JSON.stringify(errors, null, 2))
		assert.equal(errors.filter(e => e.code === 2345).length, 1, JSON.stringify(errors, null, 2))
		assert.equal(errors.filter(e => e.code === 2322).length, 4, JSON.stringify(errors, null, 2))
		assert.ok(errors.some(e => e.code === 2540))
	})
})

test('uses mirror symbol anchors for template-only binding imports', () => {
	let projectDirectory = fs.mkdtempSync(path.join(repositoryRoot, '.compiler-mirror-binding-imports-'))

	try {
		fs.writeFileSync(path.join(projectDirectory, 'tsconfig.json'), JSON.stringify({
			compilerOptions: {
				module: 'ESNext',
				moduleResolution: 'Bundler',
				target: 'ES2024',
				strict: true,
				noUnusedLocals: true,
				skipLibCheck: true,
				outDir: 'out',
			},
			include: ['*.ts'],
		}, null, '\t'))
		fs.writeFileSync(path.join(projectDirectory, 'bindings.ts'), [
			"import {Binding} from 'lupos.html'",
			'export class Show implements Binding { update(_value: unknown) {} }',
			'export class UnusedShow implements Binding { update(_value: unknown) {} }',
		].join('\n'))
		fs.writeFileSync(path.join(projectDirectory, 'src.ts'), [
			"import {html} from 'lupos.html'",
			"import {Show, UnusedShow} from './bindings'",
			'export const result = html`<div :Show=${true} />`',
		].join('\n'))

		let invalid = compile(projectDirectory)
		assert.notEqual(invalid.status, 0)
		assert.match(invalid.output, /'UnusedShow' is declared but its value is never read\./)
		assert.doesNotMatch(invalid.output, /'Show' is declared but its value is never read\./)
	}
	finally {
		fs.rmSync(projectDirectory, {recursive: true, force: true})
	}
})

test('reports binding mirror diagnostics through the compiler and removes original comma errors', () => {
	let projectDirectory = fs.mkdtempSync(path.join(repositoryRoot, '.compiler-binding-checks-'))
	try {
		fs.writeFileSync(path.join(projectDirectory, 'tsconfig.json'), JSON.stringify({
			compilerOptions: {module: 'ESNext', moduleResolution: 'Bundler', target: 'ES2024',
				strict: true, noUnusedLocals: true, skipLibCheck: true, outDir: 'out'},
			include: ['src.ts'],
		}))
		let writeSource = template => fs.writeFileSync(path.join(projectDirectory, 'src.ts'), [
			"import {Binding, Part, html} from 'lupos.html'",
			'class Show implements Binding, Part {',
			' constructor(_el: Element, _context: unknown, _modifiers: ("good")[] = []) {}',
			' update<T extends string>(value: T, callback: (value: T) => void) { callback(value) }',
			' afterConnectCallback() {} beforeDisconnectCallback() {}',
			'}',
			'export function render(value: string | null) {',
			' return html`' + template + '`',
			'}',
		].join('\n'))
		writeSource('<div ?:Show.good=${value, value, text => text.toUpperCase()} />')
		let valid = compile(projectDirectory)
		assert.equal(valid.status, 0, valid.output)
		assert.equal(valid.output, '')
		writeSource('<div ?:Show.bad=${value, value, text => text.missing} />')
		let invalid = compile(projectDirectory)
		assert.notEqual(invalid.status, 0)
		assert.equal((invalid.output.match(/error TS2322:/g) ?? []).length, 1, invalid.output)
		assert.equal((invalid.output.match(/error TS2339:/g) ?? []).length, 1, invalid.output)
		assert.doesNotMatch(invalid.output, /TS2695|TS7006|Binding Parameter|Modifier .* is not allowed/)
	}
	finally {
		fs.rmSync(projectDirectory, {recursive: true, force: true})
	}
})
