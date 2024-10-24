import type TS from 'typescript'
import {Helper, defineVisitor, ts, Interpolator, InterpolationContentType, TemplateSlotPlaceholder, Modifier, onVisitedSourceFile} from '../base'
import {TemplateParser} from './parsers'
import {VariableNames} from './parsers/variable-names'
import {HTMLRoot} from './html-syntax'


defineVisitor(function(node: TS.Node, index: number) {
	if (ts.isSourceFile(node)) {
		VariableNames.init()
		return
	}

	if (!ts.isTaggedTemplateExpression(node)) {
		return
	}

	let nm = Helper.symbol.resolveImport(node.tag)
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
	let toOutput = parseHTMLTemplate(node, index, nm.memberName as 'html' | 'svg')

	// Must after all observable interpolation outputted.
	// So internal html`...` can be replaced.
	return () => {
		onVisitedSourceFile(toOutput)
	}
})


/** Parse a html template literal. */
function parseHTMLTemplate(node: TS.TaggedTemplateExpression, index: number, templateType: 'html' | 'svg') {
	let {string, mapper} = TemplateSlotPlaceholder.toTemplateString(node)
	let values = TemplateSlotPlaceholder.extractTemplateValues(node)
	let root = HTMLRoot.fromString(string, mapper)
	let parser = new TemplateParser(templateType, root, values, node)

	return () => {
		parser.prepareToOutputCompiled()()
		let outputted = parser.outputReplaced()
		Interpolator.replace(index, InterpolationContentType.Normal, () => outputted)
	}
}

