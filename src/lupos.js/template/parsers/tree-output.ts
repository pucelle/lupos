import type TS from 'typescript'
import {TreeParser} from './tree'
import {HTMLNode, HTMLNodeType, HTMLTree} from '../html-syntax'
import {factory, Helper, Modifier, TemplateSlotPlaceholder, ts} from '../../../base'
import {SlotParserBase} from './slots'
import {VariableNames} from './variable-names'


type OutputNodes = TS.Expression | TS.Statement | (TS.Expression | TS.Statement)[]
type OutputNodeList = (TS.Expression | TS.Statement)[]


export class TreeOutputHandler {

	readonly parser: TreeParser
	readonly tree: HTMLTree

	private wrappedBySVG: boolean = false
	private wrappedByTemplate: boolean = false

	constructor(parser: TreeParser, wrappedBySVG: boolean) {
		this.parser = parser
		this.tree = parser.tree

		this.wrappedBySVG = wrappedBySVG
		this.wrappedByTemplate = this.tree.firstChild?.tagName === 'template'
	}

	private isEmptyHTMLTemplate(): boolean {
		if (this.wrappedBySVG || this.wrappedByTemplate) {
			return this.tree.firstChild!.children.length === 0
		}
		else {
			return this.tree.children.length === 0
		}
	}

	output(slots: SlotParserBase[], varNames: string[], partNames: string[]) {
		Modifier.addImport('TemplateMaker', '@pucelle/lupos.js')

		// Must output slots firstly, it completes references.
		let {init, staticUpdate, update} = this.outputSlots(slots)

		// Output `$latest_values = $values` if needed.
		this.outputLatestValues(slots, varNames, update)

		// May modify nodes, must before outputting HTML Maker.
		let templatePosition = this.outputSlotPosition()

		// const $html_0 = new HTMLMaker(...)
		this.outputHTMLMaker()

		// let $node = $html_0.make()
		let rootNode = this.outputRootHTML()

		// let $node_1 = $node.firstChild
		// Must after others.
		let nodeRefs = this.outputHTMLReferences()

		// let $binding_0, $block_0, $latest_0, $slot_0, ...
		// Must after others.
		let varStatements = this.outputVarNames(varNames)

		let initStatements = [
			rootNode,
			nodeRefs,
			init,
			varStatements,
			staticUpdate,
		].flat().map(n => Helper.pack.toStatement(n))

		// $template_0
		let templateName = this.parser.getTemplateRefName()

		// TemplateInitResult
		let initResult = this.outputTemplateInitResult(templatePosition, update, partNames)

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

		Modifier.addTopmostDeclarations(templateNode)
	}

	private outputSlots(slots: SlotParserBase[]): {
		init: OutputNodeList,
		update: OutputNodeList,
		staticUpdate: OutputNodeList
	} {
		let init: OutputNodes[] = []
		let staticUpdate: OutputNodes[] = []
		let update: OutputNodes[] = []

		for (let i = 0; i < slots.length; i++) {
			let slot = slots[i]
			let attrInit: OutputNodes[] = []

			if (slot.node.type === HTMLNodeType.Tag
				&& TemplateSlotPlaceholder.isComponent(slot.node.tagName!)
			) {

				let j = i + 1

				for (; j < slots.length; j++) {
					let attrSlot = slots[j]
					if (attrSlot.node !== slot.node) {
						break
					}

					attrInit.push(attrSlot.outputInit([]))
				}

				i = j - 1
			}

			let attrInitStatements = attrInit.flat().map(n => Helper.pack.toStatement(n))
			let initNodes = slot.outputInit(attrInitStatements)
			let updateNodes = slot.outputUpdate()

			init.push(initNodes)

			if (slot.isValueOutputAsMutable()) {
				update.push(updateNodes)
			}
			else {
				staticUpdate.push(updateNodes)
			}
		}

		return {
			init: init.flat(),
			update: update.flat(),
			staticUpdate: staticUpdate.flat()
		}
	}

	private outputLatestValues(slots: SlotParserBase[], varNames: string[], update: OutputNodeList) {

		// Should output `$latest_values = $values`
		let shouldOutputLatestValues = slots.some(s => s.isValueTransferredToTopmost())
		if (shouldOutputLatestValues) {
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
		if (this.isEmptyHTMLTemplate()) {
			return null
		}

		Modifier.addImport('SlotPosition', '@pucelle/lupos.js')

		// SlotPositionType.Before
		let position = 2

		let firstNode = this.tree.firstChild!
		if (this.wrappedBySVG || this.wrappedByTemplate) {
			firstNode = firstNode.firstChild!
		}

		let nodeName: string

		// Use a new comment node to locate.
		if (!firstNode.isPrecedingPositionStable()) {
			let comment = new HTMLNode(HTMLNodeType.Comment, {})
			firstNode.before(comment)
			firstNode = comment
		}

		nodeName = this.parser.references.refAsName(firstNode)

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

	private outputHTMLMaker() {
		Modifier.addImport('HTMLMaker', '@pucelle/lupos.js')

		let htmlString = this.parser.tree.getContentString()

		// $html_0
		let htmlName = this.parser.getHTMLRefName()
		let parameters: TS.Expression[] = [factory.createStringLiteral(htmlString)]

		// Template get wrapped.
		if (this.wrappedBySVG || this.wrappedByTemplate) {
			parameters.push(factory.createTrue())
		}
		
		// const $html_0 = new HTMLMaker('...', wrapped)
		let htmlNode = factory.createVariableStatement(
			undefined,
			factory.createVariableDeclarationList(
				[factory.createVariableDeclaration(
					factory.createIdentifier(htmlName),
					undefined,
					undefined,
					factory.createNewExpression(
						factory.createIdentifier('HTMLMaker'),
						undefined,
						parameters
					)
				)],
				ts.NodeFlags.Const
			)
		)

		Modifier.addTopmostDeclarations(htmlNode)
	}

	private outputRootHTML(): OutputNodes {

		// $html_0
		let htmlName = this.parser.getHTMLRefName()

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
			let nodeName = factory.createIdentifier(this.parser.references.getRefedName(node))

			// $node.firstChild
			let fromExp: TS.Expression

			// Where the total reference from.
			if (visitFromNode === this.tree) {

				// $node.content
				fromExp = factory.createPropertyAccessExpression(
					factory.createIdentifier(VariableNames.node),
					'content'
				)

				// When visiting template.content.firstChild,
				// uses `$context.el` to replace it.
				if (this.wrappedByTemplate && visitSteps.length === 1) {
					fromExp = factory.createPropertyAccessExpression(
						factory.createIdentifier(VariableNames.context),
						'el'
					)

					visitSteps = []
				}

				// Eliminate the first path piece.
				else if (this.wrappedBySVG || this.wrappedByTemplate) {
					visitSteps = visitSteps.slice(1)
				}
			}
			else {

				// $node_0
				let nodeName = this.parser.references.getRefedName(visitFromNode)
				fromExp = factory.createIdentifier(nodeName)
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
	private outputTemplateInitResult(position: TS.Expression | null, update: OutputNodeList, partNames: string[]) {
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

		// `parts` part.
		let partsNode: TS.PropertyAssignment | null = null
		if (partNames.length > 0) {
			partsNode = factory.createPropertyAssignment(
				factory.createIdentifier('parts'),
				factory.createArrayLiteralExpression(
					partNames.map(n => factory.createIdentifier(n)),
					false
				)
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