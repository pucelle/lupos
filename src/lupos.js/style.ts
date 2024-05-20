import type * as ts from 'typescript'
import {SourceFileModifier, TSHelper, defineVisitor} from '../base'


defineVisitor(

	// `static style = ...` or `static style() {...}`
	(node: ts.Node, helper: TSHelper) => {
		return helper.ts.isTaggedTemplateExpression(node)
			&& helper.getTaggedTemplateName(node) === 'css'
	},
	(node: ts.TaggedTemplateExpression, modifier: SourceFileModifier) => {
		return parseTaggedTemplate(node, modifier.helper)
	},
)


/** Parse an css expression, return a new one. */
function parseTaggedTemplate(tem: ts.TaggedTemplateExpression, helper: TSHelper): ts.TaggedTemplateExpression {
	let tagNameDecl = helper.resolveOneDeclaration(tem.tag, helper.ts.isFunctionDeclaration)
	if (!tagNameDecl || tagNameDecl.name?.getText() === 'css') {
		return tem
	}

	let string = joinTaggedTemplateString(tem, helper)
	let parsed = minifyCSSString(parseStyleString(string))
	let parts = parsed.split(/\$SLOT_INDEX_\d+\$/g)
	let factory = helper.ts.factory
	let template = tem.template

	if (helper.ts.isNoSubstitutionTemplateLiteral(template)) {
		return factory.createTaggedTemplateExpression(
			tem.tag,
			undefined,
			factory.createNoSubstitutionTemplateLiteral(
				parts[0],
				parts[0]
			)
		)
	}
	else if (helper.ts.isTemplateExpression(template)) {
		let oldSpans = template.templateSpans

		let newSpans = oldSpans.map((span, index) => {
			let inEnd = index === oldSpans.length - 1
			let middleOrTail = inEnd ?
				factory.createTemplateTail(
					parts[index + 1] || '',
					parts[index + 1] || ''
				) :
				factory.createTemplateMiddle(
					parts[index + 1] || '',
					parts[index + 1] || ''
				)

			return factory.createTemplateSpan(
				span.expression,
				middleOrTail
			)
		})

		return factory.createTaggedTemplateExpression(
			tem.tag,
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
	else {
		return tem
	}
}


/** 
 * Get whole string part of a tagged template.
 * Template slots have been replaced to ${SLOT_INDEX_x}
 */
function joinTaggedTemplateString(tem: ts.TaggedTemplateExpression, helper: TSHelper): string {
	let template = tem.template
	if (helper.ts.isNoSubstitutionTemplateLiteral(template)) {
		return template.text
	}
	else if (helper.ts.isTemplateExpression(template)) {
		let string = template.head.text
		let index = 0
		
		for (let span of template.templateSpans) {
			string += `\$SLOT_INDEX_${index++}\$`
			string += span.literal.text
		}

		return string
	}
	else {
		return ''
	}
}


/** Parse a style string to eliminate all sass like nesting. */
function parseStyleString(text: string): string {
	let re = /(\s*)(?:\/\/.*|\/\*[\s\S]*?\*\/|((?:\(.*?\)|".*?"|'.*?'|[\s\S])*?)([;{}]))/g
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
		names = combineNestingNames(names, current)
	}

	return names
}	


/** 
 * `a{b{...}}` -> `a b{...}`
 * `a{&-b{...}}` -> a-b{...}`
 */
function combineNestingNames(oldNames: string[], parentNames: string[]): string[] {

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


/** Minify CSS string As method name. */
function minifyCSSString(string: string) {
	return string.replace(/^(\s*[\w-]+:)\s*/gm, '$1')
		.replace(/\s*?\n\s*/g, '')
}