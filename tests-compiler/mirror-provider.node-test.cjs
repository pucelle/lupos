const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const ts = require('typescript')


const repositoryRoot = path.resolve(__dirname, '..')
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
