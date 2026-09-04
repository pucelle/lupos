const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const ts = require('typescript')
const {checkMirror} = require('./mirror-test-helpers.cjs')
const {getMirrorSemanticService, createLuposMirrorDiagnosticProvider} = require('lupos/mirror-provider')
const {getProgramAnalysis} = require('../cli/transformer/out/lupos-ts-module/analyzer/program-analysis')


test('checks loop and conditional bodies with TypeScript branch narrowing', () => {
	checkMirror([
		"import {html} from 'lupos.html'",
		'declare const rows: ({kind: "text", value: string} | {kind: "number", value: number})[]',
		'export const result = html`<lu:for ${item, index} of ${rows}>',
		'<lu:if ${item.kind === "text"}><img .src=${item.value} />${item.value.toUpperCase()}</lu:if>',
		'<lu:elseif ${item.value > 0}>${item.value.toFixed()}</lu:elseif>',
		'<lu:else>${item.value.toFixed()}</lu:else>',
		'<lu:keyed ${index}><lu:cache>${item.missing}</lu:cache></lu:keyed>',
		'</lu:for>`',
	], errors => {
		assert.equal(errors.length, 1, JSON.stringify(errors))
		assert.equal(errors[0].text, 'missing')
	})
})

test('checks switch branches and preserves errors on invalid iterable expressions', () => {
	checkMirror([
		"import {html} from 'lupos.html'",
		'declare const item: {kind: "text", value: string} | {kind: "number", value: number}',
		'export const result = html`<lu:switch ${item.kind}>',
		'<lu:case ${"text"}>${item.value.toUpperCase()}</lu:case>',
		'<lu:default>${item.value.toFixed()}</lu:default>',
		'</lu:switch><lu:for ${entry} of ${123}>${entry}</lu:for>`',
	], errors => {
		assert.equal(errors.length, 1, JSON.stringify(errors))
		assert.equal(errors[0].code, 2488)
		assert.equal(errors[0].text, '123')
	})
})

test('shares diagnostic programs with mapped type queries and invalidates per original program', () => {
	let directory = fs.mkdtempSync(path.join(__dirname, '../.mirror-service-'))

	try {
		let fileName = path.join(directory, 'src.ts')
		let text = [
			"import {html} from 'lupos.html'",
			'declare const value: string | number',
			'export const result = html`<lu:if ${typeof value === "string"}>${value.toUpperCase()}${value}</lu:if>',
			'<lu:else>${value.toFixed()}${value}</lu:else>`',
		].join('\n')

		fs.writeFileSync(fileName, text)
		let options = {target: ts.ScriptTarget.ES2024, module: ts.ModuleKind.ESNext,
			moduleResolution: ts.ModuleResolutionKind.Bundler, strict: true, skipLibCheck: true}
		let host = ts.createCompilerHost(options)
		let program = ts.createProgram([fileName], options, host)
		let source = program.getSourceFile(fileName)
		let analysis = getProgramAnalysis(ts, program)
		let analyzer = analysis.getAnalyzer(source)
		let queries = 0

		analysis.helper.types.setTemplateTypeQuery(() => {
			queries++
			return undefined
		})

		let service = getMirrorSemanticService(program, host)
		let context = service.getContext(source)
		assert.equal(queries, 0)
		assert.equal(getProgramAnalysis(ts, program).helper, analysis.helper)
		assert.equal(getProgramAnalysis(ts, program).getAnalyzer(source), analyzer)
		assert.equal(analyzer.helper, analysis.helper)

		analysis.helper.types.getTemplateValueInfo(source.statements[1].declarationList.declarations[0].name)
		assert.equal(queries, 1)
		let provider = createLuposMirrorDiagnosticProvider(program, host)
		let diagnosticCalls = 0
		let getDiagnostics = context.program.getSemanticDiagnostics.bind(context.program)

		context.program.getSemanticDiagnostics = (...args) => {
			diagnosticCalls++
			return getDiagnostics(...args)
		}

		assert.deepEqual(provider.getSemanticDiagnostics(source), [])
		assert.equal(diagnosticCalls, 1)
		assert.equal(getMirrorSemanticService(program).getContext(source), context)
		assert.deepEqual(context.program.getSyntacticDiagnostics(context.sourceFile), [])

		let values = []
		let visit = node => {
			if (ts.isTemplateSpan(node) && ts.isIdentifier(node.expression)) {
				values.push(node.expression)
			}
			ts.forEachChild(node, visit)
		}

		visit(source)
		assert.deepEqual(values.map(node => {
			let resolved = service.getType(node)
			assert.equal(resolved.checker, context.checker)
			return resolved.checker.typeToString(resolved.type)
		}), ['string', 'number'])

		let ordinary = source.statements[1].declarationList.declarations[0].name
		assert.equal(service.resolveNode(ordinary).checker, program.getTypeChecker())
		let nextProgram = ts.createProgram([fileName], options, host)
		assert.notEqual(getMirrorSemanticService(nextProgram), service)
		assert.notEqual(getProgramAnalysis(ts, nextProgram).helper, analysis.helper)
	}
	finally {
		fs.rmSync(directory, {recursive: true, force: true})
	}
})
