import * as ts from 'typescript'
import {Analyzer, HTMLNode, HTMLRoot, PositionMapper, TemplateBasis, TemplateDiagnostics, TemplatePart, TemplatePartParser} from '../../lupos-ts-module'
import {TreeParser} from './tree'
import {TemplateValues} from './template-values'
import {factory, helper, Modifier, SourceFileDiagnosticModifier, DeclarationScope, DeclarationScopeTree, VisitTree} from '../../core'


/**
 * Parse template string value expressions,
 * it will add a parsed to a TemplateMaker instance and add it to source file,
 * and return a expression to replace original template node.
 */
export class TemplateParser extends TemplateBasis {

	/** All value nodes even for sub template. */
	readonly values: TemplateValues

	private readonly treeParsers: TreeParser[] = []
	private readonly subTemplates: TemplateParser[] = []

	/** Which scope should insert contents. */
	private innerMostScope: DeclarationScope = DeclarationScopeTree.getTopmost()

	constructor(
		tagName: 'html' | 'svg',
		node: ts.TemplateLiteral,
		content: string,
		root: HTMLRoot,
		valueNodes: ts.Expression[],
		positionMapper: PositionMapper
	) {
		super(tagName, node, content, root, valueNodes, positionMapper, DeclarationScopeTree, helper)
		this.values = new TemplateValues(valueNodes)
	}

	/** 
	 * Diagnose whole template.
	 * It make an independent part parser and diagnose it.
	 */
	diagnose() {
		let canModify = false
		let parts: TemplatePart[] = []
		let onPart = (part: TemplatePart) => {parts.push(part)}
		
		let partParser = new TemplatePartParser(this.root, this.values.valueNodes, canModify, onPart, helper)
		partParser.parse()

		// Modify diagnostics.
		let diagnostics = new TemplateDiagnostics(new Analyzer(helper))
		diagnostics.diagnose(parts, this, SourceFileDiagnosticModifier)
	}

	/** Pase for tree parses. */
	parse() {
		let tree = this.addTreeParser(this.root, null, null)
		tree.parse()
	}

	/** Add a root and parent tree parser. */
	addTreeParser(root: HTMLRoot, parent: TreeParser | null, fromNode: HTMLNode | null): TreeParser {
		let tree = new TreeParser(this, root, parent, fromNode)
		this.treeParsers.push(tree)
		return tree
	}

	/** 
	 * Separate children of a node to an independent sub template,
	 * and parse it immediately.
	 * it uses it's own value list.
	 */
	separateChildrenAsTemplate(node: HTMLNode): TemplateParser {
		let root = HTMLRoot.fromSeparatingChildren(node)
		let template = new TemplateParser(this.tagName as 'html' | 'svg', this.node, '', root, this.values.valueNodes, this.positionMapper)
		this.subTemplates.push(template)
		template.parse()
		
		return template
	}
	
	/** 
	 * Add a referenced declaration node, normally component or binding class declaration.
	 * If a template uses a local component,
	 * then generated codes can't be appended to topmost scope.
	 */
	addRefedDeclaration(node: ts.Node) {
		let scope = DeclarationScopeTree.findClosest(node)
		if (!scope) {
			return
		}

		// Pick scope with larger depth.
		if (VisitTree.isPrecedingOf(this.innerMostScope.node, scope.node)) {
			this.innerMostScope = scope
		}
	}

	/** 
	 * Output whole template compiled contents, and sub templates.
	 * Return a callback, call which will finally interpolate to source file.
	 * 
	 * Split it to two steps because it initialize self then children,
	 * but we want to output children firstly, then self.
	 */
	prepareToOutputCompiled(): () => void {
		Modifier.addImport('CompiledTemplateResult', 'lupos.html')
		
		let outputSub: (() => void)[] = []
		let outputSelf: (() => void)[] = []

		// Sub templates prepare earlier, but output later.
		for (let template of this.subTemplates) {
			outputSub.push(template.prepareToOutputCompiled())
		}

		// Self contents prepare later, but output earlier.
		for (let treeParser of this.treeParsers) {
			outputSelf.push(treeParser.prepareToOutput(this.innerMostScope))
		}

		return () => {
			for (let output of outputSelf) {
				output()
			}

			for (let output of outputSub) {
				output()
			}
		}
	}

	/** 
	 * Returns a expression to replace original template literal.
	 * Must after `outputCompiled`.
	 */
	outputReplaced(): ts.Expression {
		let mainTreeParser = this.treeParsers[0]
		let makerName = mainTreeParser.makeTemplateRefName()
		let valuesNodes = this.values.output()

		return factory.createNewExpression(
			factory.createIdentifier('CompiledTemplateResult'),
			undefined,
			[
				factory.createIdentifier(makerName),
				valuesNodes,
				factory.createThis()
			]
		)
	}
}
