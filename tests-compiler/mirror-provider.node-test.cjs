const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const ts = require('typescript')


const {repositoryRoot, compile} = require('./compiler-test-helpers.cjs')
const {
	buildTypeScriptMirror,
	mapMirrorSpanToOriginal,
	mapOriginalPositionToMirror,
} = require('lupos/mirror-provider')


test('builds a side-effect-free mirror with bidirectional language-service mappings', () => {
	let projectDirectory = fs.mkdtempSync(path.join(repositoryRoot, '.mirror-api-test-'))
	let fileName = path.join(projectDirectory, 'src.ts')

	let source = [
		"import {Component, html} from 'lupos.html'",
		'class Card extends Component { count: number = 0; enabled: boolean = false; child: unknown }',
		'const first = html`<Card .count=${"wrong"} />`',
		'const second = html`<Card .enabled />`',
		'const nested = html`<Card .child=${html`<Card .count=${1} />`} />`',
		'const plain = html`<Card />`',
	].join('\n')

	fs.writeFileSync(fileName, source)

	try {
		let program = ts.createProgram([fileName], {
			module: ts.ModuleKind.ESNext,
			moduleResolution: ts.ModuleResolutionKind.Bundler,
			target: ts.ScriptTarget.ES2024,
			strict: true,
			skipLibCheck: true,
		})

		let sourceFile = program.getSourceFile(fileName)
		let document = buildTypeScriptMirror(ts, program, sourceFile)

		assert.ok(document)
		assert.equal(document.checkSpans.length, 4)
		assert.match(document.mirrorText, /let \$LUPOS_MIRROR_0 = new Card\(\)/)
		assert.match(document.mirrorText, /\$LUPOS_MIRROR_0\.count = \("wrong"\)/)
		assert.match(document.mirrorText, /\$LUPOS_MIRROR_1\.enabled = \(true\)/)
		assert.match(document.mirrorText, /let \$LUPOS_MIRROR_4 = new Card\(\)/)
		assert.doesNotMatch(document.mirrorText, /null! as typeof/)
		assert.ok(document.mirrorText.includes(source.slice(0, source.indexOf('html`'))))

		let transpiled = ts.transpileModule(document.mirrorText, {
			compilerOptions: {module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2024},
			reportDiagnostics: true,
		})

		assert.equal(
			transpiled.diagnostics?.length ?? 0,
			0,
			(transpiled.diagnostics ?? []).map(diagnostic => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')).join('\n')
				+ '\n\n' + document.mirrorText
		)

		let originalProperty = source.indexOf('.count') + 1
		let mirrorProperty = mapOriginalPositionToMirror(document, originalProperty + 2, 'definition')
		
		assert.notEqual(mirrorProperty, null)
		assert.equal(document.mirrorText.slice(mirrorProperty - 2, mirrorProperty + 3), 'count')
		assert.equal(mapOriginalPositionToMirror(document, originalProperty + 2, 'completion'), mirrorProperty)

		let mappedProperty = mapMirrorSpanToOriginal(document, {start: mirrorProperty - 2, length: 5}, 'diagnostic')
		assert.deepEqual(mappedProperty, {start: originalProperty, length: 5})

		let originalValue = source.indexOf('"wrong"')
		let copiedValue = document.mappings.find(mapping => mapping.kind === 'copied-expression')

		assert.ok(copiedValue)

		assert.deepEqual(
			mapMirrorSpanToOriginal(document, {start: copiedValue.mirrorStart, length: 7}, 'diagnostic'),
			{start: originalValue, length: 7}
		)
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

test('resolves destructured dynamic imports used only as component tags', () => {
	let directory = fs.mkdtempSync(path.join(repositoryRoot, '.compiler-mirror-dynamic-import-'))

	try {
		fs.writeFileSync(path.join(directory, 'tsconfig.json'), JSON.stringify({
			compilerOptions: {module: 'ESNext', moduleResolution: 'Bundler', target: 'ES2024',
				strict: true, noUnusedLocals: true, skipLibCheck: true, outDir: 'out'},
			include: ['*.ts'],
		}))
		
		fs.writeFileSync(path.join(directory, 'card.ts'), [
			"import {Component} from 'lupos.html'",
			'export class Card extends Component { count = 0 }',
			'export class Unused extends Component {}',
		].join('\n'))

		let writeSource = (unused, value) => fs.writeFileSync(path.join(directory, 'src.ts'), [
			"import {html} from 'lupos.html'",
			'export async function render() {',
			`const {Card: LocalCard${unused ? ', Unused' : ''}} = await import('./card')`,
			`return html\`<div>\${true ? html\`<LocalCard .count=\${${value}} />\` : null}</div>\``,
			'}',
		].join('\n'))

		writeSource(true, '"bad"')
		let invalid = compile(directory)
		assert.notEqual(invalid.status, 0)
		assert.match(invalid.output, /'Unused' is declared but its value is never read/)
		assert.doesNotMatch(invalid.output, /'LocalCard' is declared but its value is never read/)
		assert.match(invalid.output, /Type 'string' is not assignable to type 'number'/)

		writeSource(false, '1')
		let valid = compile(directory)
		assert.equal(valid.status, 0, valid.output)
	}
	finally {
		fs.rmSync(directory, {recursive: true, force: true})
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
