import * as ts from 'typescript'
import {defineVisitor, factory, Interpolator, InterpolationContentType, helper} from '../core'
import {TemplateSlotPlaceholder} from '../lupos-ts-module'


defineVisitor(function(node: ts.Node) {
	if (!ts.isTaggedTemplateExpression(node)) {
		return
	}

	if (!helper.symbol.isImportedFrom(node.tag, 'css', '@pucelle/lupos.js')) {
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

			replaced = factory.createTaggedTemplateExpression(
				node.tag,
				undefined,
				factory.createNoSubstitutionTemplateLiteral(
					text,
					text
				)
			)
			
			factory.createStringLiteral(strings![0].text)
		}

		// Output as `css(...)` function call.
		else {
			let stringTexts = strings?.map(v => v.text) ?? ['', '']
			let oldSpans = template.templateSpans

			let newValues = valueIndices!.map(({index: spanIndex}) => {
				let oldSpan = oldSpans[spanIndex]
				return Interpolator.outputUniqueSelf(oldSpan.expression) as ts.Expression
			})

			replaced = factory.createCallExpression(
				node.tag,
				undefined,
				[
					factory.createArrayLiteralExpression(stringTexts.map(text => factory.createStringLiteral(text))),
					factory.createArrayLiteralExpression(newValues),
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