import * as ts from 'typescript'
import {defineVisitor, Interpolator, InterpolationContentType, Modifier, onVisitedSourceFile, helper} from '../core'
import {TemplateParser, VariableNames} from './parsers'
import {HTMLRoot, TemplateSlotPlaceholder} from '../lupos-ts-module'


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

	if (nm.moduleName !== '@pucelle/lupos.js') {
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
		onVisitedSourceFile(toOutput)
	}
})


/** Parse a html template literal. */
function parseHTMLTemplate(node: ts.TaggedTemplateExpression, templateType: 'html' | 'svg') {
	let {string, mapper} = TemplateSlotPlaceholder.toTemplateString(node.template)
	let values = TemplateSlotPlaceholder.extractTemplateValues(node.template)
	let root = HTMLRoot.fromString(string)
	let parser = new TemplateParser(templateType, root, values, node, mapper)

	return () => {
		parser.prepareToOutputCompiled()()
		let outputted = parser.outputReplaced()
		Interpolator.replace(node, InterpolationContentType.Normal, () => outputted)
	}
}

