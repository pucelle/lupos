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
		let replaced: ts.TaggedTemplateExpression | null = null

		if (ts.isNoSubstitutionTemplateLiteral(template)) {
			replaced = factory.createTaggedTemplateExpression(
				node.tag,
				undefined,
				factory.createNoSubstitutionTemplateLiteral(
					strings![0].text,
					strings![0].text
				)
			)
		}
		else {
			let oldSpans = template.templateSpans

			let newSpans = valueIndices!.map(({index: spanIndex}, index) => {
				let inEnd = index === valueIndices!.length - 1
				let part = strings![index + 1].text
				let oldSpan = oldSpans[spanIndex]

				let middleOrTail = inEnd ?
					factory.createTemplateTail(
						part,
						part
					) :
					factory.createTemplateMiddle(
						part,
						part
					)

				return factory.createTemplateSpan(
					Interpolator.outputNodeSelf(oldSpan.expression) as ts.Expression,
					middleOrTail
				)
			})

			replaced = factory.createTaggedTemplateExpression(
				node.tag,
				undefined,
				factory.createTemplateExpression(
					factory.createTemplateHead(
						strings![0].text,
						strings![0].text
					),
					newSpans
				)
			)
		}

		return replaced
	})
}


/** Minify CSS string, eliminate useless whitespace. */
function minifyCSSString(string: string) {
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