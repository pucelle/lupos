import type TS from 'typescript'
import {TreeParser} from './tree'
import {HTMLNode, HTMLNodeType, HTMLRoot} from '../html-syntax'
import {factory, Helper, Modifier, TemplateSlotPlaceholder, ts} from '../../../base'
import {SlotParserBase} from './slots'
import {VariableNames} from './variable-names'
import {SlotPositionType} from '../enums'
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

	constructor(parser: TreeParser, wrappedBySVG: boolean) {
		this.parser = parser
		this.root = parser.root
		this.template = parser.template

		this.wrappedBySVG = wrappedBySVG
		this.wrappedByTemplate = this.root.firstChild?.tagName === 'template'
	}

	output(slots: SlotParserBase[], varNames: string[], partNames: string[], hasDynamicComponent: boolean) {
		Modifier.addImport('TemplateMaker', '@pucelle/lupos.js')

		// May modify nodes, must before outputting HTML Maker.
		let templatePosition = this.outputSlotPosition()

		// Must output slots firstly, it completes references.
		let {init, staticUpdate, update} = this.outputSlots(slots)

		// Output `$latest_values = $values` if needed.
		this.outputLatestValues(varNames, update)

		// let $node = $html_0.make()
		let rootNode = this.outputRootHTML()

		// let $node_1 = $node.firstChild
		// Must after others.
		let nodeRefs = this.outputHTMLReferences()

		// let $binding_0, $block_0, $latest_0, $slot_0, ...
		// Must after others.
		let varStatements = this.outputVarNames(varNames)

		let initStatements = [
			varStatements,
			rootNode,
			nodeRefs,
			init,
			staticUpdate,
		].flat().map(n => Helper.pack.toStatement(n))

		// $template_0
		let templateName = this.parser.getTemplateRefName()

		// TemplateInitResult
		let initResult = this.outputTemplateInitResult(templatePosition, update, partNames, hasDynamicComponent)

		// const $template_0 = new TemplateMaker((_context: Component) => {
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
					[factory.createArrowFunction(
						undefined,
						undefined,
						[factory.createParameterDeclaration(
							undefined,
							undefined,
							factory.createIdentifier(VariableNames.context),
							undefined,
							undefined,
							undefined
						)],
						undefined,
						factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
						factory.createBlock(
							[
								...initStatements,
								factory.createReturnStatement(initResult)
							],
							true
						)
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

		Modifier.addTopmostDeclarations(templateNode)
	}

	private outputSlots(slots: SlotParserBase[]): {
		init: OutputNodeList,
		staticUpdate: OutputNodeList
		update: OutputNodeList,
	} {
		let init: OutputNodes[] = []
		let staticUpdate: OutputNodes[] = []
		let update: OutputNodes[] = []

		for (let i = 0; i < slots.length; i++) {
			let slot = slots[i]
			let attached = this.outputDynamicComponentAttached(slots, i)
			let attachedInitStatements = attached.init.flat().map(n => Helper.pack.toStatement(n))
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

	private outputDynamicComponentAttached(slots: SlotParserBase[], index: number) {
		let slot = slots[index]
		let init: OutputNodes[] = []
		let staticUpdate: OutputNodes[] = []
		let update: OutputNodes[] = []

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
			update,
		}
	}

	private outputLatestValues(varNames: string[], update: OutputNodeList) {

		// Should output `$latest_values = $values`
		if (this.template.values.isAnyIndexTransferredToTopmost()) {
			varNames.push(VariableNames.latestValues)

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

	private outputRootHTML(): OutputNodes {

		// $html_0
		let htmlName = HTMLOutputHandler.output(this.parser, this.wrappedBySVG)

		// $node
		let rootNodeName = VariableNames.node

		// $node = $html_0.make()
		return factory.createVariableStatement(
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
	}

	private outputHTMLReferences(): OutputNodeList {
		let list: OutputNodeList = []

		for (let {node, visitFromNode, visitSteps} of this.parser.references.output()) {

			// $node_0
			let nodeName = this.parser.references.getRefedName(node)
	
			// $node.firstChild
			let fromExp: TS.Expression | undefined

			// When visiting template.content.firstChild,
			// uses `$context.el` to replace it.
			if (!visitSteps) {
				fromExp = factory.createPropertyAccessExpression(
					factory.createIdentifier(VariableNames.context),
					'el'
				)

				visitSteps = []
			}

			// Where the total reference from.
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

			// Component node reference will be replaced soon.
			if (node.type === HTMLNodeType.Tag
				&& TemplateSlotPlaceholder.isDynamicComponent(node.tagName!)
			) {
				fromExp = undefined
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
		partNames: string[],
		hasDynamicComponent: boolean
	) {
		
		// position part.
		let positionNode: TS.PropertyAssignment | null = null
		if (position) {
			positionNode = factory.createPropertyAssignment(
				factory.createIdentifier('position'),
				position
			)
		}

		// `update` part.
		let updateNode: TS.MethodDeclaration | null = null
		if (update.length > 0) {
			updateNode = factory.createMethodDeclaration(
				undefined,
				undefined,
				factory.createIdentifier('update'),
				undefined,
				undefined,
				[factory.createParameterDeclaration(
					undefined,
					undefined,
					factory.createIdentifier(VariableNames.values),
					undefined,
					undefined,
					undefined
				)],
				undefined,
				factory.createBlock(
					update.map(n => Helper.pack.toStatement(n)),
					true
				)
			)
		}

		// `parts` part, list of all parts.
		let partsNode: TS.PropertyAssignment | null = null
		if (partNames.length > 0) {
			let parts: TS.Expression = factory.createArrayLiteralExpression(
				partNames.map(n => factory.createIdentifier(n)),
				false
			)

			// Becomes `() => [...]`.
			if (hasDynamicComponent) {
				parts = factory.createArrowFunction(
					undefined,
					undefined,
					[],
					undefined,
					factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
					parts
				)  
			}

			partsNode = factory.createPropertyAssignment(
				factory.createIdentifier('parts'),
				parts
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
}