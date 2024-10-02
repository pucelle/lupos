import type TS from 'typescript'
import {TreeParser} from './tree'
import {HTMLNode, HTMLNodeType, HTMLRoot} from '../html-syntax'
import {factory, Helper, Modifier, Scope, TemplateSlotPlaceholder, ts} from '../../base'
import {SlotParserBase} from './slots'
import {VariableNames} from './variable-names'
import {PartPositionType, SlotPositionType} from '../../enums'
import {HTMLOutputHandler} from './html-output'
import {TemplateParser} from './template'


type OutputNodes = TS.Expression | TS.Statement | (TS.Expression | TS.Statement)[]
type OutputNodeList = (TS.Expression | TS.Statement)[]


export class TreeOutputHandler {

	readonly parser: TreeParser
	readonly root: HTMLRoot
	readonly template: TemplateParser

	private wrappedBySVG: boolean = false
	private wrappedByTemplate: boolean = false
	private htmlName: string

	constructor(parser: TreeParser, treeIndex: number, wrappedBySVG: boolean, wrappedByTemplate: boolean) {
		this.parser = parser
		this.root = parser.root
		this.template = parser.template

		this.wrappedBySVG = wrappedBySVG
		this.wrappedByTemplate = wrappedByTemplate
		this.htmlName = VariableNames.buildName(VariableNames.html, treeIndex)
	}

	/** 
	 * Prepare to output whole tree as expressions,
	 * Return a callback, call which will finally interpolate to source file.
	 */
	prepareToOutput(
		slots: SlotParserBase[],
		varNames: string[],
		parts: [string, PartPositionType][],
		scope: Scope
	): () => void {
		Modifier.addImport('TemplateMaker', '@pucelle/lupos.js')

		// May modify nodes, must before outputting HTML Maker.
		let templatePosition = this.outputSlotPosition()

		// Must output slots firstly, it completes references.
		let {init, staticUpdate, update} = this.outputSlots(slots)

		// Output `$latest_values = $values` if needed.
		this.outputLatestValues(update)

		// let $node = $html_0.make()
		let {node: rootNode, output: outputHTML} = this.outputRootHTML()

		// let $node_1 = $node.firstChild
		// Must after others.
		let nodeRefs = this.outputHTMLReferences()

		// let $binding_0, $block_0, $latest_0, $slot_0, ...
		// Must after others.
		let varStatements = this.outputVarNames(varNames)

		let initStatements = Helper.pack.toStatements([
			varStatements,
			rootNode,
			nodeRefs,
			init,
			staticUpdate,
		].flat())

		// $template_0
		let templateName = this.parser.getTemplateRefName()

		// TemplateInitResult
		let initResult = this.outputTemplateInitResult(templatePosition, update, parts)

		// const $template_0 = new TemplateMaker(function(?$context, ?$latestValues) {
		//	 let $node = $html_0()
		//	 let $node_0 = $node.content.firstElementChild!
		//	
		//	 return {
		//	   el: t,
		//	   position: new SlotPosition(SlotPositionType.Before, div),
		//     update,
		//     parts,
		//	 }
		// })
		let templateBlock = factory.createBlock(
			[
				...initStatements,
				factory.createReturnStatement(initResult)
			],
			true
		)

		let templateInitParams = this.outputTemplateInitParameters(templateBlock)

		let templateNode = factory.createVariableStatement(
			undefined,
			factory.createVariableDeclarationList(
				[factory.createVariableDeclaration(
					factory.createIdentifier(templateName),
					undefined,
					undefined,
					factory.createNewExpression(
					factory.createIdentifier('TemplateMaker'),
					undefined,
					[
						factory.createFunctionExpression(
							undefined,
							undefined,
							undefined,
							undefined,
							templateInitParams,
							undefined,
							templateBlock
						)]
					)
				)],
				ts.NodeFlags.Const
			)
		)

		ts.setSyntheticLeadingComments(templateNode, [{
			pos: -1,
			end: -1,
			hasTrailingNewLine: false,
			text: '\n' + this.root.toReadableString(this.template.values.valueNodes) + '\n',
			kind: ts.SyntaxKind.MultiLineCommentTrivia,
		}])

		return () => {
			outputHTML()
			scope.addStatements(templateNode)
		}
	}

	private outputSlots(slots: SlotParserBase[]) {
		let init: OutputNodes[] = []
		let staticUpdate: OutputNodes[] = []
		let update: OutputNodes[] = []

		for (let i = 0; i < slots.length; i++) {
			let slot = slots[i]
			let attached = this.outputDynamicComponentAttached(slots, i, update)
			let attachedInitStatements = Helper.pack.toStatements(attached.init.flat())
			let initNodes = slot.outputInit(attachedInitStatements)
			let updateNodes = slot.outputUpdate()
			

			if (slot.isValueOutputAsMutable()) {
				update.push(updateNodes)
			}
			else {
				staticUpdate.push(updateNodes)
			}

			i = attached.index
			init.push(initNodes)
		}

		return {
			init: init.flat(),
			staticUpdate: staticUpdate.flat(),
			update: update.flat(),
		}
	}

	private outputDynamicComponentAttached(
		slots: SlotParserBase[],
		index: number,
		update: OutputNodes[]
	) {
		let slot = slots[index]
		let init: OutputNodes[] = []
		let staticUpdate: OutputNodes[] = []

		if (slot.node.type === HTMLNodeType.Tag
			&& TemplateSlotPlaceholder.isDynamicComponent(slot.node.tagName!)
		) {
			let i = index + 1

			for (; i < slots.length; i++) {
				let attrSlot = slots[i]
				if (attrSlot.node !== slot.node) {
					break
				}

				init.push(attrSlot.outputInit([]))

				let attrUpdateNodes = attrSlot.outputUpdate()

				if (attrSlot.isValueOutputAsMutable()) {
					update.push(attrUpdateNodes)
				}
				else {
					staticUpdate.push(attrUpdateNodes)
				}
			}

			index = i - 1
		}

		return {
			index,
			init: [...init, ...staticUpdate],
		}
	}

	private outputLatestValues(update: OutputNodeList) {

		// Should output `$latest_values = $values`
		if (this.template.values.isAnyMutableOrFunctionScopeIndexTransferred()) {
			update.unshift(factory.createBinaryExpression(
				factory.createIdentifier(VariableNames.latestValues),
				factory.createToken(ts.SyntaxKind.EqualsToken),
				factory.createIdentifier(VariableNames.values)
			))
		}
	}

	/** Make `new SlotPosition(...)` to indicate the start inner position of template. */
	private outputSlotPosition(): TS.Expression | null {
		Modifier.addImport('SlotPosition', '@pucelle/lupos.js')

		let position = SlotPositionType.Before
		let container: HTMLNode = this.root
		let firstNode = container.firstChild!

		if (this.wrappedBySVG || this.wrappedByTemplate) {
			container = container.firstChild!
			firstNode = firstNode.firstChild!
		}

		// Insert a comment at least, to make sure having a position.
		if (!firstNode) {
			firstNode = new HTMLNode(HTMLNodeType.Comment, {})
			container.append(firstNode)
		}

		// Use a new comment node to locate if position is not stable.
		else if (!firstNode.isPrecedingPositionStable()) {
			let comment = new HTMLNode(HTMLNodeType.Comment, {})
			firstNode.before(comment)
			firstNode = comment
		}

		let nodeName = this.parser.references.refAsName(firstNode)

		// new SlotPosition(SlotPositionType.Before, $context),
		return factory.createNewExpression(
			factory.createIdentifier('SlotPosition'),
			undefined,
			[
				factory.createNumericLiteral(position),
				factory.createIdentifier(nodeName)
			]
		)
	}

	private outputRootHTML(): {node: OutputNodes, output: () => void} {

		// $html_0
		let {name: htmlName, output} = HTMLOutputHandler.prepareOutput(this.parser, this.wrappedBySVG, this.htmlName)

		// $node
		let rootNodeName = VariableNames.node

		// $node = $html_0.make()
		let node = factory.createVariableStatement(
			undefined,
			factory.createVariableDeclarationList(
				[factory.createVariableDeclaration(
					factory.createIdentifier(rootNodeName),
					undefined,
					undefined,
					factory.createCallExpression(
						factory.createPropertyAccessExpression(
							factory.createIdentifier(htmlName),
							factory.createIdentifier('make')
						),
						undefined,
						[]
					)
				)],
				ts.NodeFlags.Let
			)
		)

		return {
			node,
			output,
		}
	}

	private outputHTMLReferences(): OutputNodeList {
		let list: OutputNodeList = []

		for (let {node, visitFromNode, visitSteps} of this.parser.references.output()) {

			// $node_0
			let nodeName = this.parser.references.getRefedName(node)
	
			// $node.firstChild
			let fromExp: TS.Expression | undefined

			// When visiting template.content.firstChild,
			// uses `$context.el` to represent it.
			if (!visitSteps) {
				fromExp = factory.createPropertyAccessExpression(
					factory.createIdentifier(VariableNames.context),
					'el'
				)

				visitSteps = []
			}

			// Where the reference from.
			else if (visitFromNode === this.root) {

				// $node.content
				fromExp = factory.createPropertyAccessExpression(
					factory.createIdentifier(VariableNames.node),
					'content'
				)

				// Eliminate the first path piece.
				if (this.wrappedBySVG || this.wrappedByTemplate) {
					visitSteps = visitSteps.slice(1)
				}
			}

			// $node_0
			else {
				let fromNodeName = this.parser.references.getRefedName(visitFromNode)
				fromExp = factory.createIdentifier(fromNodeName)
			}

			// $node.content.firstChild.lastChild.childNodes[0]
			for (let step of visitSteps) {
				if (step === 0) {
					fromExp = factory.createPropertyAccessExpression(
						fromExp,
						'firstChild'
					)
				}
				else if (step === -1) {
					fromExp = factory.createPropertyAccessExpression(
						fromExp,
						'lastChild'
					)
				}
				else {
					fromExp = factory.createElementAccessExpression(
						factory.createPropertyAccessExpression(
							fromExp,
							factory.createIdentifier('childNodes')
						),
						factory.createNumericLiteral(step)
					)
				}
			}

			list.push(factory.createVariableStatement(
				undefined,
				factory.createVariableDeclarationList(
						[factory.createVariableDeclaration(
						nodeName,
						undefined,
						undefined,
						fromExp
					)],
					ts.NodeFlags.Let
				)
			))
		}

		return list
	}

	private outputVarNames(varNames: string[]): OutputNodes {
		if (!varNames.length) {
			return []
		}

		return factory.createVariableStatement(
			undefined,
			factory.createVariableDeclarationList(
				varNames.map(name => factory.createVariableDeclaration(
					factory.createIdentifier(name),
					undefined,
					undefined,
					undefined
				)),
				ts.NodeFlags.Let
			)
		)
	}

	/** TemplateInitResult, `{el, position, update, parts}`. */
	private outputTemplateInitResult(
		position: TS.Expression | null,
		update: OutputNodeList,
		parts: [string, PartPositionType][]
	) {
		
		// position part.
		let positionNode: TS.PropertyAssignment | null = null
		if (position) {
			positionNode = factory.createPropertyAssignment(
				factory.createIdentifier('position'),
				position
			)
		}

		let updateBlock = factory.createBlock(
			Helper.pack.toStatements(update),
			true
		)

		let updateParameters = this.outputUpdateParameters(updateBlock)

		// `update` part.
		let updateNode: TS.MethodDeclaration | null = null
		if (update.length > 0) {
			updateNode = factory.createMethodDeclaration(
				undefined,
				undefined,
				factory.createIdentifier('update'),
				undefined,
				undefined,
				updateParameters,
				undefined,
				updateBlock
			)
		}

		// `parts` part, list of all parts.
		let partsNode: TS.PropertyAssignment | null = null
		if (parts.length > 0) {
			let partExp: TS.Expression = factory.createArrayLiteralExpression(
				parts.map(part => factory.createArrayLiteralExpression([
					factory.createIdentifier(part[0]),
					factory.createNumericLiteral(part[1])
				], false)),
				false
			)

			partsNode = factory.createPropertyAssignment(
				factory.createIdentifier('parts'),
				partExp
			)
		}

		return factory.createObjectLiteralExpression(
			[
				factory.createPropertyAssignment(
					factory.createIdentifier('el'),
					factory.createIdentifier(VariableNames.node)
				),
				...(positionNode ? [positionNode] : []),
				...(updateNode ? [updateNode] : []),
				...(partsNode ? [partsNode] : []),
			],
			true
		)
	}

	/** Output parameters `(?$values)` of update function. */
	private outputUpdateParameters(block: TS.Block): TS.ParameterDeclaration[] {
		let hasValuesRef = !!Helper.findInward(block, node => ts.isIdentifier(node) && node.text === VariableNames.values)
		let params: TS.ParameterDeclaration[] = []

		if (hasValuesRef) {
			params.push(factory.createParameterDeclaration(
				undefined,
				undefined,
				factory.createIdentifier(VariableNames.values),
				undefined,
				undefined,
				undefined
			))
		}

		return params
	}

	/** Output parameters `(?$context, ?$latestValues)` of template maker init function. */
	private outputTemplateInitParameters(block: TS.Block): TS.ParameterDeclaration[] {
		let hasContextRef = !!Helper.findInward(block, node => ts.isIdentifier(node) && node.text === VariableNames.context)
		let params: TS.ParameterDeclaration[] = []

		if (hasContextRef) {
			params.push(factory.createParameterDeclaration(
				undefined,
				undefined,
				factory.createIdentifier(VariableNames.context),
				undefined,
				undefined,
				undefined
			))
		}

		if (this.template.values.isAnyIndexTransferred()) {
			params.push(factory.createParameterDeclaration(
				undefined,
				undefined,
				factory.createIdentifier(VariableNames.latestValues),
				undefined,
				undefined,
				undefined
			))
		}

		return params
	}
}