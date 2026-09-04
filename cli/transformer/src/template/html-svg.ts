import ts from 'typescript'
import {defineVisitor, Interpolator, InterpolationContentType, Modifier, transformSession, transformContext} from '../core'
import {TemplateParser} from './parsers'
import {Analyzer, HTMLRoot, TemplateSlotPlaceholder} from '../lupos-ts-module'


defineVisitor(ts.SyntaxKind.TaggedTemplateExpression, function(node: ts.TaggedTemplateExpression) {
	let nm = transformContext.helper.symbol.resolveImport(node.tag)
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
		transformSession.onJustVisited(toOutput)
	}
})



/** Parse a html template literal. */
function parseHTMLTemplate(node: ts.TaggedTemplateExpression, templateType: 'html' | 'svg') {
	let {string, mapper} = TemplateSlotPlaceholder.toTemplateContent(node.template)
	let values = TemplateSlotPlaceholder.extractTemplateValues(node.template)
	let root = HTMLRoot.fromString(string)

	let analyzer = Analyzer.ofContext(ts, transformContext.program)
	let parser = new TemplateParser(templateType, node.template, string, root, values, mapper, analyzer)

	parser.diagnoseRoot()
	parser.parse()

	return () => {
		parser.prepareToOutputCompiled()()
		let outputted = parser.outputReplaced()
		Interpolator.replace(node, InterpolationContentType.Normal, () => outputted)
	}
}
