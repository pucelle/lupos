import ts from 'typescript'
import {defineVisitor, Interpolator, InterpolationContentType, Modifier, onJustVisitedSourceFile, helper, definePostVisitCallback} from '../core'
import {TemplateParser, VariableNames} from './parsers'
import {Analyzer, HTMLRoot, TemplateSlotPlaceholder} from '../lupos-ts-module'


defineVisitor(function(node: ts.Node) {
	if (ts.isSourceFile(node)) {
		VariableNames.init()
		return
	}

	if (!ts.isTaggedTemplateExpression(node)) {
		return
	}

	let nm = helper.symbol.resolveImport(node.tag)
	if (!nm) {
		return
	}

	if (nm.moduleName !== 'lupos.html') {
		return
	}

	if (nm.memberName !== 'html' && nm.memberName !== 'svg') {
		return
	}

	Modifier.removeImportOf(node.tag)

	// Must visit in normal visit order, so it can modify tracking.
	let toOutput = parseHTMLTemplate(node, nm.memberName as 'html' | 'svg')

	// Must after all observable interpolation outputted.
	// So internal html`...` can be replaced.
	return () => {
		onJustVisitedSourceFile(toOutput)
	}
})



/** Parse a html template literal. */
function parseHTMLTemplate(node: ts.TaggedTemplateExpression, templateType: 'html' | 'svg') {
	let {string, mapper} = TemplateSlotPlaceholder.toTemplateContent(node.template)
	let values = TemplateSlotPlaceholder.extractTemplateValues(node.template)
	let root = HTMLRoot.fromString(string)

	let analyzer = getAnalyzerOfCurrentSourceFile()
	let parser = new TemplateParser(templateType, node.template, string, root, values, mapper, analyzer)

	parser.diagnose()
	parser.parse()

	return () => {
		parser.prepareToOutputCompiled()()
		let outputted = parser.outputReplaced()
		Interpolator.replace(node, InterpolationContentType.Normal, () => outputted)
	}
}


/** Cached analyzer, for each source file. */
let analyzer: Analyzer | null = null

/** Get analyzer for current source file. */
function getAnalyzerOfCurrentSourceFile() {
	if (!analyzer) {
		analyzer = new Analyzer(helper)
	}

	return analyzer
}

// Clean the analyzer after each time a source file parsed.
definePostVisitCallback(() => {
	if (analyzer) {
		analyzer = null
	}
})