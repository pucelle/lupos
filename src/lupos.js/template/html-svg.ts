import type TS from 'typescript'
import {helper, defineVisitor, ts, interpolator, InterpolationContentType, TemplateSlotPlaceholder} from '../../base'
import {TemplateParser, HTMLTreeParser} from './parsers'


defineVisitor(function(node: TS.Node, index: number) {
	if (ts.isSourceFile(node)) {
		HTMLTreeParser.initialize()
		return
	}

	if (!ts.isTaggedTemplateExpression(node)) {
		return
	}
	
	let nm = helper.symbol.resolveImport(node)
	if (!nm) {
		return
	}

	if (nm.moduleName !== '@pucelle/lupos.js') {
		return
	}

	if (nm.memberName !== 'html' && nm.memberName !== 'svg') {
		return
	}

	parseHTMLTemplate(node, index, nm.memberName)
})


/** Parse a html template literal. */
function parseHTMLTemplate(node: TS.TaggedTemplateExpression, index: number, templateType: 'html' | 'svg') {
	let string = TemplateSlotPlaceholder.joinTemplateString(node)
	let values = TemplateSlotPlaceholder.extractTemplateValues(node)
	let parser = new TemplateParser(templateType, string, values)

	interpolator.replace(index, InterpolationContentType.Normal, () => parser.output())
}

