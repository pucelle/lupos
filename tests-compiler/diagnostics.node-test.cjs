const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const {spawnSync} = require('node:child_process')
const test = require('node:test')


const repositoryRoot = path.resolve(__dirname, '..')
const compilerPath = path.join(repositoryRoot, 'cli', 'bin', 'luc')

function compile(projectDirectory) {
	let result = spawnSync(process.execPath, [compilerPath], {
		cwd: projectDirectory,
		encoding: 'utf8',
	})

	return {
		status: result.status,
		output: result.stdout + result.stderr,
	}
}

test('adds transformer diagnostics and deletes superseded TypeScript diagnostics', () => {
	let projectDirectory = fs.mkdtempSync(path.join(repositoryRoot, '.compiler-diagnostics-'))

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
			include: ['src.ts'],
		}, null, '\t'))

		let sourcePrefix = [
			"import {Component, html} from 'lupos.html'",
			'',
			'class UsedOnlyByTemplate extends Component {}',
			'',
			'export class DiagnosticTest extends Component {',
			'\trender() {',
			'\t\treturn html`',
			'\t\t\t<UsedOnlyByTemplate />',
		]
		let sourceSuffix = [
			'\t\t`',
			'\t}',
			'}',
			'',
		]

		fs.writeFileSync(
			path.join(projectDirectory, 'src.ts'),
			[...sourcePrefix, '\t\t\t<lu:if></lu:if>', ...sourceSuffix].join(os.EOL)
		)

		let invalid = compile(projectDirectory)
		assert.notEqual(invalid.status, 0)
		assert.match(invalid.output, /error TS6210: '<lu:if \$\{\.\.\.\}>' must accept a parameter as condition\./)
		assert.doesNotMatch(invalid.output, /UsedOnlyByTemplate.*never (?:read|used)/)

		fs.writeFileSync(
			path.join(projectDirectory, 'src.ts'),
			[...sourcePrefix, ...sourceSuffix].join(os.EOL)
		)

		let valid = compile(projectDirectory)
		assert.equal(valid.status, 0, valid.output)
		assert.equal(valid.output, '')
	}
	finally {
		fs.rmSync(projectDirectory, {recursive: true, force: true})
	}
})

test('reports malformed HTML tag structure in templates', () => {
	let projectDirectory = fs.mkdtempSync(path.join(repositoryRoot, '.compiler-html-diagnostics-'))

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

		let writeSource = template => fs.writeFileSync(
			path.join(projectDirectory, 'src.ts'),
			`import {html} from 'lupos.html'\nexport const result = html\`${template}\`\n`
		)

		writeSource('<div><span></div>')
		let mismatched = compile(projectDirectory)
		assert.notEqual(mismatched.status, 0)
		assert.match(mismatched.output, /warning TS30005: Closing tag '<\/div>' does not match opening tag '<span>'\./)

		writeSource('<section><div></div>')
		let unclosed = compile(projectDirectory)
		assert.notEqual(unclosed.status, 0)
		assert.match(unclosed.output, /warning TS30006: Tag '<section>' is not closed\./)

		writeSource('</aside>')
		let unmatched = compile(projectDirectory)
		assert.notEqual(unmatched.status, 0)
		assert.match(unmatched.output, /warning TS30005: Closing tag '<\/aside>' has no matching opening tag\./)

		writeSource('<div><img><input /></div>')
		let valid = compile(projectDirectory)
		assert.equal(valid.status, 0, valid.output)
		assert.equal(valid.output, '')
	}
	finally {
		fs.rmSync(projectDirectory, {recursive: true, force: true})
	}
})

test('requires a function context template to be the only return value', () => {
	let projectDirectory = fs.mkdtempSync(path.join(repositoryRoot, '.compiler-render-template-diagnostics-'))

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

		let writeRender = body => fs.writeFileSync(
			path.join(projectDirectory, 'src.ts'),
			`import {Component, html} from 'lupos.html'\nexport class Test extends Component {\n\trender() {\n${body}\n\t}\n}\n`
		)

		writeRender('\t\treturn html`<template><div /></template>`')
		let valid = compile(projectDirectory)
		assert.equal(valid.status, 0, valid.output)
		assert.equal(valid.output, '')

		fs.writeFileSync(
			path.join(projectDirectory, 'src.ts'),
			[
				"import {html} from 'lupos.html'",
				'export const arrow = () => html`<template><div /></template>`',
				'export function fn() { return html`<template><span /></template>` }',
			].join('\n')
		)

		let validFunctions = compile(projectDirectory)
		assert.equal(validFunctions.status, 0, validFunctions.output)
		assert.equal(validFunctions.output, '')

		writeRender([
			'\t\tif (Math.random() > 0.5) return html`<template><div /></template>`',
			'\t\treturn html`<div />`',
		].join('\n'))

		let withOtherReturn = compile(projectDirectory)
		assert.notEqual(withOtherReturn.status, 0)
		assert.match(withOtherReturn.output, /error TS30007: A function that returns '<template>' must use it as its only return value\./)

		writeRender([
			'\t\tif (Math.random() > 0.5) return html`<template><div /></template>`',
			'\t\treturn html`<template><span /></template>`',
		].join('\n'))

		let withSecondContextTemplate = compile(projectDirectory)
		assert.notEqual(withSecondContextTemplate.status, 0)
		assert.equal(
			(withSecondContextTemplate.output.match(/error TS30007:/g) ?? []).length,
			2,
			withSecondContextTemplate.output
		)

		writeRender("\t\treturn Math.random() > 0.5 ? html`<template><div /></template>` : html`<div />`")
		let mixedExpression = compile(projectDirectory)
		assert.notEqual(mixedExpression.status, 0)
		assert.match(mixedExpression.output, /error TS30007:/)

		fs.writeFileSync(
			path.join(projectDirectory, 'src.ts'),
			[
				"import {html} from 'lupos.html'",
				'export const arrow = () => Math.random() > 0.5 ? html`<template />` : html`<div />`',
			].join('\n')
		)
		let mixedArrow = compile(projectDirectory)
		assert.notEqual(mixedArrow.status, 0)
		assert.match(mixedArrow.output, /error TS30007:/)
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
		assert.match(invalid.output, /error TS2339: Property 'missing' is not exist on '<Card>'\./)
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

test('does not duplicate native TypeScript diagnostics through the mirror', () => {
	let projectDirectory = fs.mkdtempSync(path.join(repositoryRoot, '.compiler-mirror-filtering-'))

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

		fs.writeFileSync(path.join(projectDirectory, 'src.ts'), [
			"import {Component, html} from 'lupos.html'",
			'class Card extends Component { count: number = 0 }',
			'const nativeError: number = "wrong"',
			'export const result = html`<Card .count=${1} />`',
			'export const nativeAfter = ({value: 1}).missing',
		].join('\n'))

		let invalid = compile(projectDirectory)
		assert.notEqual(invalid.status, 0)
		assert.equal((invalid.output.match(/error TS2322:/g) ?? []).length, 1, invalid.output)
		assert.match(invalid.output, /Type 'string' is not assignable to type 'number'\./)
		assert.equal((invalid.output.match(/error TS2339:/g) ?? []).length, 1, invalid.output)
		assert.match(invalid.output, /Property 'missing' does not exist on type '\{ value: number; \}'\./)
	}
	finally {
		fs.rmSync(projectDirectory, {recursive: true, force: true})
	}
})

test('uses mirror symbol anchors for template-only component imports', () => {
	let projectDirectory = fs.mkdtempSync(path.join(repositoryRoot, '.compiler-mirror-imports-'))

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
		fs.writeFileSync(path.join(projectDirectory, 'cards.ts'), [
			"import {Component} from 'lupos.html'",
			'export class Card extends Component { constructor(_value: string) { super() } }',
			'export class UnusedCard extends Component {}',
		].join('\n'))

		let writeSource = imports => fs.writeFileSync(path.join(projectDirectory, 'src.ts'), [
			"import {html} from 'lupos.html'",
			`import {${imports}} from './cards'`,
			'export const result = html`<Card />`',
		].join('\n'))

		writeSource('Card, UnusedCard')
		let invalid = compile(projectDirectory)
		assert.notEqual(invalid.status, 0)
		assert.match(invalid.output, /'UnusedCard' is declared but its value is never read\./)
		assert.doesNotMatch(invalid.output, /'Card' is declared but its value is never read\./)

		writeSource('Card')
		let valid = compile(projectDirectory)
		assert.equal(valid.status, 0, valid.output)
		assert.equal(valid.output, '')
	}
	finally {
		fs.rmSync(projectDirectory, {recursive: true, force: true})
	}
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
