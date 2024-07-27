import type TS from 'typescript'
import {ts} from './global'


/** 
 * Get whole string part of a tagged template.
 * Template slots have been replaced to placeholder `$LUPOS_SLOT_INDEX_\d$`.
 */
export function joinTemplateString(tem: TS.TaggedTemplateExpression): string {
	let template = tem.template
	if (ts.isNoSubstitutionTemplateLiteral(template)) {
		return template.text
	}
	else if (ts.isTemplateExpression(template)) {
		let string = template.head.text
		let index = -1
		
		for (let span of template.templateSpans) {
			string += `\$LUPOS_SLOT_INDEX_${++index}\$`
			string += span.literal.text
		}

		return string
	}
	else {
		return ''
	}
}

/** Split a full template string by template slot placeholder `$LUPOS_SLOT_INDEX_\d_. */
export function splitTemplateString(parsed: string): string[] {
	return parsed.split(/\$LUPOS_SLOT_INDEX_\d+\$/g)
}


/** Extract all expression interpolations from a template. */
export function extractTemplateValues(tem: TS.TaggedTemplateExpression): TS.Expression[] {
	let template = tem.template
	let values: TS.Expression[] = []

	if (!ts.isTemplateExpression(template)) {
		return values
	}

	for (let span of template.templateSpans) {
		values.push(span.expression)
	}

	return values
}