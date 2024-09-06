import type TS from 'typescript'
import {HTMLNode, HTMLRoot} from '../html-syntax'
import {TreeParser} from './tree'
import {TemplateValues} from './template-values'
import {factory, Modifier, Scope, Scoping} from '../../base'


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

	/** Which scope should insert contents. */
	private innerMostScope: Scope = Scoping.getTopmostScope()

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

	/** 
	 * Add a referenced declaration node, normally component or binding class declaration.
	 * If a template uses a local component,
	 * then generated codes can't be appended to topmost scope.
	 */
	addRefedDeclaration(node: TS.Node) {
		let scope = Scoping.findClosestScopeOfNode(node)
		if (!scope) {
			return
		}

		// Pick scope with larger depth.
		// One must contain another, so only need to compare visiting index.
		if (this.innerMostScope.visitingIndex < scope.visitingIndex) {
			this.innerMostScope = scope
		}
	}

	/** 
	 * Output whole template compiled,
	 * and returns a expression to replace original template literal.
	 */
	output(): TS.Expression {
		Modifier.addImport('CompiledTemplateResult', '@pucelle/lupos.js')
		
		for (let treeParser of this.treeParsers) {
			treeParser.output(this.innerMostScope)
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
