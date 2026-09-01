import ts from 'typescript'
import {defineVisitor, Interpolator, InterpolationContentType, transformContext} from '../core'
import {TemplateSlotPlaceholder} from '../lupos-ts-module'


defineVisitor(function(node: ts.Node) {
	if (!ts.isTaggedTemplateExpression(node)) {
		return
	}

	if (!transformContext.helper.symbol.isImportedFrom(node.tag, 'css', 'lupos.html')) {
		return
	}

	parseCSSTemplate(node)
})


/** Parse a css template literal. */
function parseCSSTemplate(node: ts.TaggedTemplateExpression) {
	let string = TemplateSlotPlaceholder.toTemplateContent(node.template).string
	let parsed = minifyCSSString(string)
	let {strings, valueIndices} = TemplateSlotPlaceholder.parseTemplateContent(parsed, true)
	let template = node.template

	Interpolator.replace(node, InterpolationContentType.Normal, () => {
		let replaced: ts.Expression | null = null

		// Output as template literal css`...`.
		if (ts.isNoSubstitutionTemplateLiteral(template)) {
			let text = strings![0].text

			replaced = transformContext.factory.createTaggedTemplateExpression(
				node.tag,
				undefined,
				transformContext.factory.createNoSubstitutionTemplateLiteral(
					text,
					text
				)
			)
			
			transformContext.factory.createStringLiteral(strings![0].text)
		}

		// Output as `css(...)` function call.
		else {
			let stringTexts = strings?.map(v => v.text) ?? ['', '']
			let oldSpans = template.templateSpans

			let newValues = valueIndices!.map(({index: spanIndex}) => {
				let oldSpan = oldSpans[spanIndex]
				return Interpolator.outputSelfUnique(oldSpan.expression) as ts.Expression
			})

			replaced = transformContext.factory.createCallExpression(
				node.tag,
				undefined,
				[
					transformContext.factory.createArrayLiteralExpression(stringTexts.map(text => transformContext.factory.createStringLiteral(text))),
					...newValues,
				]
			)
		}

		return replaced
	})
}


/** Minify CSS string, eliminate useless whitespace. */
function minifyCSSString(string: string) {
	string = string.replace(/\/\*[\s\S]*?\*\//g, '')

	let re = /(["']).*?\1/g
	let output = ''
	let lastIndex = 0
	let match = re.exec(string)

	while (true) {
		output += string.slice(lastIndex, match ? re.lastIndex - match[0].length : undefined)
			.replace(/^(\s*[\w-]+:)\s*/gm, '$1')
			.replace(/([,;])\s+/g, '$1')
			.replace(/\s*\n\s*/g, '')

		if (match) {
			output += match[0]
		}
		else {
			break
		}

		lastIndex = re.lastIndex
		match = re.exec(string)
	}

	return output
}
