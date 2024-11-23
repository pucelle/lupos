import * as ts from 'typescript'
import {defineVisitor, factory, Interpolator, InterpolationContentType, TemplateSlotPlaceholder} from '../core'
import {Helper} from '../lupos-ts-module'


defineVisitor(function(node: ts.Node, index: number) {
	if (!ts.isTaggedTemplateExpression(node)) {
		return
	}

	if (!Helper.symbol.isImportedFrom(node.tag, 'css', '@pucelle/lupos.js')) {
		return
	}

	parseCSSTemplate(node, index)
})


/** Parse a css template literal. */
function parseCSSTemplate(node: ts.TaggedTemplateExpression, index: number) {
	let string = TemplateSlotPlaceholder.toTemplateString(node).string
	let parsed = minifyCSSString(parseStyleString(string))
	let parts = TemplateSlotPlaceholder.parseTemplateStrings(parsed)!
	let indices = TemplateSlotPlaceholder.parseTemplateIndices(parsed)!
	let template = node.template

	Interpolator.replace(index, InterpolationContentType.Normal, () => {
		let replaced: ts.TaggedTemplateExpression | null = null

		if (ts.isNoSubstitutionTemplateLiteral(template)) {
			replaced = factory.createTaggedTemplateExpression(
				node.tag,
				undefined,
				factory.createNoSubstitutionTemplateLiteral(
					parts[0],
					parts[0]
				)
			)
		}
		else {
			let oldSpans = template.templateSpans

			let newSpans = indices.map((spanIndex, index) => {
				let inEnd = index === indices.length - 1
				let part = parts[index + 1]
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
						parts[0],
						parts[0]
					),
					newSpans
				)
			)
		}

		return replaced
	})
}



/** Parse a style string to eliminate all sass like nesting. */
function parseStyleString(text: string): string {
	let re = /(\s*)(?:\/\/.*|\/\*[\s\S]*?\*\/|\$LUPOS_SLOT_INDEX_\d+\$|((?:\(.*?\)|".*?"|'.*?'|[\s\S])*?)([;{}]))/g
		/*
			\s* - match white spaces in left
			(?:
				\/\/.* - match comment line
				|
				\/\*[\s\S]*?\*\/ - match comment segment
				|
				(?:
					\(.*?\) - (...), sass code may include @include fn(${name})
					".*?" - double quote string
					|
					'.*?' - double quote string
					|
					[\s\S] - others
				)*? - declaration or selector
				([;{}])
			)
		*/

	let match: RegExpExecArray | null
	let stack: string[][] = []
	let current: string[] | undefined
	let codes = ''
	let keyframesDeep: number = 0

	while (match = re.exec(text)) {
		let spaces = match[1]
		let chars = match[2]
		let endChar = match[3]

		if (endChar === '{' && chars) {

			// Commands likes `@media` must in the outer most level.
			if (chars[0] === '@' || keyframesDeep > 0) {
				codes += match[0]

				if (chars.startsWith('@keyframes')) {
					keyframesDeep = 1
				}
				else if (keyframesDeep > 0) {
					keyframesDeep++
				}
			}
			else {
				if (current) {
					stack.push(current)
					codes += '}'
				}

				let names = current = splitNamesAndCombineNesting(chars, current)
				codes += spaces + names.join(', ') + '{'
			}
		}

		// May also be end paren `@media{...}`, but it's can't be included in any selectors.
		else if (endChar === '}') {
			if (keyframesDeep > 0) {
				keyframesDeep--
			}

			current = stack.pop()

			// Not add `}` for sass like nesting.
			if (!current) {
				codes += match[0]
			}
		}
		else {
			// Skip `/*...*/` and `//...`
			let startChar = match[0][spaces.length]
			if (startChar !== '/') {
				codes += match[0]
			}
		}
	}

	return codes
}


/** `a, b` -> `[parent a, parent b]`. */
function splitNamesAndCombineNesting(selector: string, current: string[] | undefined): string[] {
	let re = /((?:\[.*?\]|\(.*?\)|[\s\S])+?)(?:,|$)/g
	/*
		(?:
			\[.*?\] - match [...]
			|
			\(.*?\) - match (...)
			|
			. - match other characters
		)
		+?
		(?:,|$) - if match ',' or '$', end
	*/

	let match: RegExpExecArray | null
	let names: string[] = []

	while (match = re.exec(selector)) {
		let name = match[1].trim()
		if (name) {
			names.push(name)
		}
	}

	if (current) {
		names = combineNestedNames(names, current)
	}

	return names
}


/** 
 * `a{b{...}}` -> `a b{...}`
 * `a{&-b{...}}` -> a-b{...}`
 */
function combineNestedNames(oldNames: string[], parentNames: string[]): string[] {

	// Has sass reference `&` if match.
	let re = /(^|[\s+>~])&/g  // `/(?<=^|[\s+>~])&/g` should be better, but Firefox doesn't support it.

	let names: string[] = []

	for (let oldName of oldNames) {
		if (re.test(oldName)) {
			for (let parentName of parentNames) {
				names.push(oldName.replace(re, '$1' + parentName))
			}
		}
		else {
			for (let parentName of parentNames) {
				names.push(parentName + ' ' + oldName)
			}
		}
	}

	return names
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