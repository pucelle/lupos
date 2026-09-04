const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const ts = require('typescript')
const vm = require('node:vm')
const {compile, repositoryRoot} = require('./compiler-test-helpers.cjs')


test('compiles shorthand callbacks and passes item and index to the renderer', () => {
	let directory = fs.mkdtempSync(path.join(repositoryRoot, '.compiler-for-renderer-'))

	try {
		fs.writeFileSync(path.join(directory, 'tsconfig.json'), JSON.stringify({
			compilerOptions: {module: 'ESNext', moduleResolution: 'Bundler', target: 'ES2024',
				strict: true, skipLibCheck: true, outDir: 'out'},
			include: ['src.ts'],
		}))
		fs.writeFileSync(path.join(directory, 'src.ts'), [
			"import {Component, html} from 'lupos.html'",
			'export const renderItem = (item: number, index: number) => html`${item}: ${index}`',
			'export class View extends Component {',
			' items = [3, 4]; renderer = renderItem;',
			' named() { return html`<lu:for ${this.items}>${renderItem}</lu:for>` }',
			' inline() { return html`<lu:for ${this.items}>${(item, index) => html`${item}: ${index}`}</lu:for>` }',
			' dynamic() { return html`<lu:for ${this.items}>${this.renderer}</lu:for>` }',
			'}',
		].join('\n'))

		let result = compile(directory)
		assert.equal(result.status, 0, result.output)
		let output = fs.readFileSync(path.join(directory, 'out/src.js'), 'utf8')
		let blocks = []

		/** Capture generated template values without constructing a DOM. */
		class CompiledTemplateResult {
			constructor(maker, values, context) {
				Object.assign(this, {maker, values, context})
			}
		}

		let runtime = {
			Component: class {}, CompiledTemplateResult,
			TemplateMaker: class { constructor(create) { this.create = create } },
			HTMLMaker: class { make() { return {el: {}, childAt: () => ({}), getMarker: () => ({}), getNodes: () => []} } },
			TemplateSlot: class {}, SlotPosition: class {},
			ForBlock: class {
				constructor() { blocks.push(this) }
				updateRenderFn(render) { this.render = render }
				updateData(data) { this.data = data }
			},
		}
		let exports = {}

		vm.runInNewContext(ts.transpileModule(output, {compilerOptions: {module: ts.ModuleKind.CommonJS}}).outputText,
			{exports, require: name => name === 'lupos.html' ? runtime : {trackGet() {}}})

		let view = new exports.View()

		for (let method of ['named', 'inline', 'dynamic']) {
			let template = view[method]()
			let instance = template.maker.create(view)
			instance.update?.(template.values)
			let block = blocks.at(-1)
			assert.deepEqual(Array.from(block.data), [3, 4])
			let rendered = block.render(3, 7)
			assert.ok(rendered instanceof CompiledTemplateResult, method)
			assert.ok(rendered.values.includes('3: 7')
				|| rendered.values.includes(3) && rendered.values.includes(7), JSON.stringify(rendered.values))

			if (method === 'dynamic') {
				view.renderer = (item, index) => ({item, index})
				instance.update(view.dynamic().values)
				assert.deepEqual(block.render(5, 2), {item: 5, index: 2}, output)
			}
		}
	}
	finally {
		fs.rmSync(directory, {recursive: true, force: true})
	}
})
