import type TS from 'typescript'
import {HTMLNode, HTMLRoot} from '../html-syntax'
import {TreeParser} from './tree'
import {TemplateValues} from './template-values'
import {factory, Modifier} from '../../base'


export type TemplateType = 'html' | 'svg'


/**
 * Parse template string value expressions,
 * it will add a parsed to a TemplateMaker instance and add it to source file,
 * and return a expression to replace original template node.
 */
export class TemplateParser {

	readonly type: TemplateType
	readonly values: TemplateValues
	readonly rawNode: TS.TaggedTemplateExpression

	private readonly treeParsers: TreeParser[] = []

	constructor(type: TemplateType, string: string, values: TS.Expression[], rawNode: TS.TaggedTemplateExpression) {
		this.type = type
		this.values = new TemplateValues(values, this)
		this.rawNode = rawNode

		let root = HTMLRoot.fromString(string)
		this.addTreeParser(root, null, null)
	}

	/** Add a root and parent tree parser. */
	addTreeParser(root: HTMLRoot, parent: TreeParser | null, fromNode: HTMLNode | null): TreeParser {
		let parser = new TreeParser(this, root, parent, fromNode)
		
		this.treeParsers.push(parser)
		parser.init()
		
		return parser
	}

	/** Create a template element with `html` as content. */
	createTemplateFromHTML(html: string) {
		let template = document.createElement('template')
		template.innerHTML = html

		return template
	}

	/** 
	 * Output whole template compiled,
	 * and returns a expression to replace original template literal.
	 */
	output(): TS.Expression {
		Modifier.addImport('CompiledTemplateResult', '@pucelle/lupos.js')
		
		for (let treeParser of this.treeParsers) {
			treeParser.output()
		}

		let mainTreeParser = this.treeParsers[0]
		let makerName = mainTreeParser.getTemplateRefName()
		let valuesNodes = this.values.output()

		return factory.createNewExpression(
			factory.createIdentifier('CompiledTemplateResult'),
			undefined,
			[
				factory.createIdentifier(makerName),
				valuesNodes
			]
		)	
	}
}
