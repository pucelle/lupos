const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const ts = require('typescript')
const vm = require('node:vm')
const {compile, repositoryRoot} = require('./compiler-test-helpers.cjs')
const {checkMirror} = require('./mirror-test-helpers.cjs')

test('types loop locals, optional indices and nested scopes in the mirror', () => {
	checkMirror([
		"import {html} from 'lupos.html'",
		'const rows = [{name: "a", children: [1, 2]}]',
		'export const result = html`<lu:for ${row, index} of ${rows}>',
		'<img .src=${row.name} .width=${index} />',
		'<lu:for ${child} of ${row.children}>${child.toFixed()} ${row.name}</lu:for>',
		'<lu:for ${row} of ${[1]}>${row.toFixed()}</lu:for>',
		'${html`<img .src=${row.name} />`} ${html`<input .value=${row.name} />`}',
		'${html`<lu:for ${child} of ${row.children}><img .width=${child} /></lu:for>`}',
		'${row.missing} ${index.toUpperCase()}',
		'</lu:for>${row}`',
	], errors => {
		assert.equal(errors.length, 3, JSON.stringify(errors, null, 2))
		assert.equal(errors.filter(e => e.code === 2339).length, 2)
		assert.ok(errors.some(e => e.code === 2304 && e.text === 'row'))
	})
})

test('checks iterable types and permits empty loop bodies', () => {
	checkMirror([
		"import {html} from 'lupos.html'",
		'export const empty = html`<lu:for ${item, index} of ${new Set<string>()}></lu:for>`',
		'export const invalid = html`<lu:for ${item} of ${123}>${item}</lu:for>`',
	], errors => {
		assert.equal(errors.length, 1, JSON.stringify(errors, null, 2))
		assert.equal(errors[0].code, 2488)
		assert.equal(errors[0].text, '123')
	})
})

test('rejects the old renderer syntax and malformed loop declarations', () => {
	const directory = fs.mkdtempSync(path.join(repositoryRoot, '.compiler-for-invalid-'))
	try {
		fs.writeFileSync(path.join(directory, 'tsconfig.json'), JSON.stringify({compilerOptions: {
			module: 'ESNext', moduleResolution: 'Bundler', target: 'ES2024', strict: true,
			skipLibCheck: true, outDir: 'out',
		}, include: ['src.ts']}))
		fs.writeFileSync(path.join(directory, 'src.ts'), [
			"import {html} from 'lupos.html'",
			'export const old = html`<lu:for ${[1]}>${(item: number) => html`${item}`}</lu:for>`',
			'export const missingOf = html`<lu:for ${item} ${[1]}>${item}</lu:for>`',
			'export const extra = html`<lu:for ${item, index, extra} of ${[1]}>${item}</lu:for>`',
			'export const duplicate = html`<lu:for ${item, item} of ${[1]}>${item}</lu:for>`',
		].join('\n'))
		const result = compile(directory)
		assert.notEqual(result.status, 0)
		assert.equal((result.output.match(/Use '<lu:for/g) ?? []).length, 4, result.output)
		assert.doesNotMatch(result.output, /Failed to transform|TypeError/)
	}
	finally { fs.rmSync(directory, {recursive: true, force: true}) }
})

test('compiles inline loop bodies into separate templates and internal render callbacks', () => {
	const directory = fs.mkdtempSync(path.join(repositoryRoot, '.compiler-for-'))
	try {
		fs.writeFileSync(path.join(directory, 'tsconfig.json'), JSON.stringify({compilerOptions: {
			module: 'ESNext', moduleResolution: 'Bundler', target: 'ES2024', strict: true,
			noUnusedLocals: true, skipLibCheck: true, outDir: 'out',
		}, include: ['src.ts']}))
		fs.writeFileSync(path.join(directory, 'src.ts'), [
			"import {Component, html} from 'lupos.html'",
			'export class View extends Component {',
			' rows = [{name: "a", children: [1, 2]}]; visible = true;',
			' render() { return html`<lu:for ${row, index} of ${this.rows}>',
			'<div .title=${row.name}>${index} ${html`<img .src=${row.name} />`}',
			'<lu:if ${this.visible && row.name}>${row.name}</lu:if>',
			'<lu:for ${child} of ${row.children}>${child}</lu:for>',
			'</div></lu:for>` }',
			'}',
		].join('\n'))
		const result = compile(directory)
		assert.equal(result.status, 0, result.output)
		const output = fs.readFileSync(path.join(directory, 'out/src.js'), 'utf8')
		assert.match(output, /\(row, index\) =>/)
		assert.match(output, /child =>|\(child\) =>/)
		assert.match(output, /updateRenderFn/)
		assert.match(output, /trackGet\(row, "name"/)
		assert.equal((output.match(/new ForBlock\(/g) ?? []).length, 2)
		assert.ok((output.match(/new TemplateMaker\(/g) ?? []).length >= 4, output)

		// Execute result creation and the generated callbacks without constructing DOM.
		// Any leaked item access or tracking outside its callback throws here.
		const tracked = []
		class CompiledTemplateResult {
			constructor(maker, values, context) { Object.assign(this, {maker, values, context}) }
		}
		const runtime = {Component: class {}, TemplateMaker: class {}, HTMLMaker: class {}, CompiledTemplateResult}
		const exports = {}
		vm.runInNewContext(ts.transpileModule(output, {compilerOptions: {module: ts.ModuleKind.CommonJS}}).outputText,
			{exports, require: name => name === 'lupos.html' ? runtime : {trackGet: (...args) => tracked.push(args)}})
		const view = new exports.View()
		let outer
		assert.doesNotThrow(() => { outer = view.render() }, output)
		assert.ok(!tracked.some(args => args[0] === view.rows[0]))
		const renderItem = outer.values.find(value => typeof value === 'function')
		const item = renderItem(view.rows[0], 4)
		assert.ok(item instanceof CompiledTemplateResult)
		assert.ok(item.values.includes('a'))
		assert.ok(item.values.includes(4))
		assert.ok(item.values.some(value => value instanceof CompiledTemplateResult && value.values.includes('a')))
		assert.ok(tracked.some(args => args[0] === view.rows[0] && args.includes('name')))
		const renderChild = item.values.find(value => typeof value === 'function')
		assert.ok(renderChild(2, 1).values.includes(2))
	}
	finally { fs.rmSync(directory, {recursive: true, force: true}) }
})


test('initializes the stable render-method callback once and evaluates it per item', () => {
	const directory = fs.mkdtempSync(path.join(repositoryRoot, '.compiler-for-method-'))
	try {
		fs.writeFileSync(path.join(directory, 'tsconfig.json'), JSON.stringify({
			extends: '../tests/tsconfig.json', include: ['../tests/src/template/flow-control/for.ts'],
			compilerOptions: {outDir: './out', tsBuildInfoFile: './fixture.tsbuildinfo'},
		}))
		const result = compile(directory)
		assert.equal(result.status, 0, result.output)
		const output = fs.readFileSync(path.join(directory, 'out/template/flow-control/for.js'), 'utf8')
		const blocks = []
		class CompiledTemplateResult {
			constructor(maker, values, context) { Object.assign(this, {maker, values, context}) }
		}
		const runtime = {
			Component: class {}, CompiledTemplateResult,
			TemplateMaker: class { constructor(create) { this.create = create } },
			HTMLMaker: class { make() { return {el: {}, childAt: () => ({}), getMarker: () => ({}), getNodes: () => []} } },
			TemplateSlot: class {}, SlotPosition: class {},
			ForBlock: class {
				constructor() { this.calls = 0; blocks.push(this) }
				updateRenderFn(render) { this.render = render; this.calls++ }
				updateData(data) { this.data = data }
			},
		}
		const exports = {}
		vm.runInNewContext(ts.transpileModule(output, {compilerOptions: {module: ts.ModuleKind.CommonJS}}).outputText,
			{exports, require: name => name === 'lupos.html' ? runtime : {trackGet() {}}})
		const view = new exports.TestFor()
		const calls = []
		view.renderItem = item => { calls.push(item); return item * 2 }
		const resultTemplate = view.testForRenderMethod()
		assert.equal(resultTemplate.values.length, 0)
		const instance = resultTemplate.maker.create(view)
		assert.equal(instance.update, undefined)
		assert.equal(blocks.length, 1)
		assert.equal(blocks[0].calls, 1)
		assert.deepEqual(calls, [])
		assert.equal(blocks[0].render(3), 6)
		assert.deepEqual(calls, [3])
	}
	finally { fs.rmSync(directory, {recursive: true, force: true}) }
})
