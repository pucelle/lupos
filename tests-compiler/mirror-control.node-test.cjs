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

test('infers shorthand loop render parameters and checks iterable and callback types', () => {
	checkMirror([
		"import {html} from 'lupos.html'",
		'declare const items: readonly {name: string}[]',
		'const render = (item: {name: string}, index: number) => html`${item.name}: ${index}`',
		'export const result = html`<lu:for ${items}>${render}</lu:for>',
		'<lu:for ${new Set([1])}>${(item, index) => html`${item.toFixed()}: ${index.toFixed()}`}</lu:for>',
		'<lu:for ${items}>${(item, index) => html`<img .src=${item.name} .width=${index} />`}</lu:for>',
		'<lu:for ${items}>${(item: number) => html`${item}`}</lu:for>',
		'<lu:for ${items}>${(item, index: string) => html`${item.name}: ${index}`}</lu:for>',
		'<lu:for ${items}>${123}</lu:for>',
		'<lu:for ${123}>${() => html``}</lu:for>`',
	], errors => {
		assert.equal(errors.length, 4, JSON.stringify(errors))
		assert.equal(errors.filter(error => error.code === 2345).length, 3)
		assert.equal(errors.filter(error => error.code === 2488).length, 1)
	})
})

test('checks shorthand renderers inside narrowed loop scopes', () => {
	checkMirror([
		"import {html} from 'lupos.html'",
		'declare const rows: {items: string[] | null}[]',
		'export const result = html`<lu:for ${row} of ${rows}><lu:if ${row.items}>',
		'<lu:for ${row.items}>${(item, index) => html`${item.toUpperCase()} ${index.toFixed()} ${item.missing}`}</lu:for>',
		'</lu:if></lu:for>`',
	], errors => {
		assert.equal(errors.length, 1, JSON.stringify(errors))
		assert.equal(errors[0].text, 'missing')
	})
})

test('requires await parameters to be promises in their enclosing control scope', () => {
	checkMirror([
		"import {html} from 'lupos.html'",
		'declare const pending: Promise<string> | undefined',
		'declare const thenable: PromiseLike<string>',
		'export const result = html`<lu:await ${Promise.resolve(1)}></lu:await>',
		'<lu:await ${123}></lu:await><lu:await ${"text"}></lu:await>',
		'<lu:await ${null}></lu:await><lu:await ${pending}></lu:await>',
		'<lu:await ${thenable}></lu:await>',
		'<lu:if ${pending}><lu:await ${pending}></lu:await></lu:if>',
		'<lu:for ${promise} of ${[Promise.resolve("ok")]}><lu:await ${promise}></lu:await></lu:for>`',
	], errors => {
		assert.equal(errors.length, 5, JSON.stringify(errors))
		assert.deepEqual(errors.map(error => error.text).sort(), ['123', '"text"', 'null', 'pending', 'thenable'].sort())
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

		analysis.helper.types.getMirroredType(source.statements[1].declarationList.declarations[0].name)
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
