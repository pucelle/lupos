import ts from 'typescript'
import {Part, TreeParser} from './tree'
import {HTMLNodeType, HTMLRoot, TemplateSlotPlaceholder} from '../../lupos-ts-module'
import {Modifier, Packer, DeclarationScope, transformContext} from '../../core'
import {SlotParserBase} from './slots'
import {VariableNames} from './variable-names'
import {SlotPositionType} from '../../enums'
import {HTMLOutputHandler} from './html-output'
import {TemplateParser} from './template'
import {HTMLNodeHelper, VisitStepType} from '../html-syntax'


type OutputNodes = ts.Expression | ts.Statement | (ts.Expression | ts.Statement)[]
type OutputNodeList = (ts.Expression | ts.Statement)[]


export class TreeOutputHandler {

	readonly tree: TreeParser
	readonly root: HTMLRoot
	readonly template: TemplateParser

	private wrappedBySVG: boolean = false
	private wrappedByTemplate: boolean = false
	private htmlName: string

	constructor(tree: TreeParser, treeIndex: number, wrappedBySVG: boolean, wrappedByTemplate: boolean) {
		this.tree = tree
		this.root = tree.root
		this.template = tree.template

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
		parts: Part[],
		scope: DeclarationScope
	): () => void {
		Modifier.addImport('TemplateMaker', 'lupos.html')

		// May modify nodes, must before outputting HTML.
		let templatePosition = this.outputStartInnerSlotPosition()

		// Must output slots firstly, it completes references.
		let {init, moreInit, staticUpdate, update} = this.outputSlots(slots)

		// Output `$latest_values = $values` if needed.
		this.outputTransferredLatestValues(update)

		// let $node = $html_0.make()
		let {node: rootNode, output: outputHTML} = this.outputRootHTML()

		// let $node_1 = $node.firstChild
		// Must after others.
		let nodeRefs = this.outputHTMLReferences()

		// let $binding_0, $block_0, $latest_0, $slot_0, ...
		// Must after others.
		let varStatements = this.outputVarNames(varNames)

		let initStatements = Packer.toStatements([
			varStatements,
			rootNode,
			nodeRefs,
			init,
			moreInit,
			staticUpdate,
		].flat())

		// $template_0
		let templateName = this.tree.makeTemplateRefName()

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
		let templateBlock = transformContext.factory.createBlock(
			[
				...initStatements,
				transformContext.factory.createReturnStatement(initResult)
			],
			true
		)

		let templateInitParams = this.outputTemplateInitParameters()

		let templateMaker = transformContext.factory.createNewExpression(
			transformContext.factory.createIdentifier('TemplateMaker'),
			undefined,
			[transformContext.factory.createFunctionExpression(
				undefined,
				undefined,
				undefined,
				undefined,
				templateInitParams,
				undefined,
				templateBlock
			)]
		)

		// For tree shaking.
		ts.setSyntheticLeadingComments(templateMaker, [
			{
				text: "#__PURE__",
				kind: ts.SyntaxKind.MultiLineCommentTrivia,
				pos: -1,
				end: -1,
				hasTrailingNewLine: false,
			}
		])

		let templateNode = transformContext.factory.createVariableStatement(
			undefined,
			transformContext.factory.createVariableDeclarationList(
				[transformContext.factory.createVariableDeclaration(
					transformContext.factory.createIdentifier(templateName),
					undefined,
					undefined,
					templateMaker
				)],
				ts.NodeFlags.Const
			)
		)

		ts.setSyntheticLeadingComments(templateNode, [{
			pos: -1,
			end: -1,
			hasTrailingNewLine: false,
			text: '\n' + HTMLNodeHelper.toReadableString(this.root, this.template.values.valueNodes) + '\n',
			kind: ts.SyntaxKind.MultiLineCommentTrivia,
		}])

		return () => {
			outputHTML()
			scope.findClosestToAddStatements().addStatements([templateNode], this.tree.index)
		}
	}

	private outputSlots(slots: SlotParserBase[]) {
		let init: OutputNodes[] = []
		let moreInit: OutputNodes[] = []
		let staticUpdate: OutputNodes[] = []
		let update: OutputNodes[] = []

		for (let i = 0; i < slots.length; i++) {
			let slot = slots[i]
			let attached = this.outputDynamicComponentAttached(slots, i, update)
			let attachedInitStatements = Packer.toStatements(attached.init.flat())
			let initNodes = slot.outputInit(attachedInitStatements)
			let moreInitNodes = slot.outputMoreInit()
			let updateNodes = slot.outputUpdate()

			if (slot.shouldUpdateDynamically()) {
				update.push(updateNodes)
			}
			else {
				staticUpdate.push(updateNodes)
			}

			i = attached.index
			init.push(initNodes)
			moreInit.push(moreInitNodes)
		}

		return {
			init: init.flat(),
			moreInit: moreInit.flat(),
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
		let moreInit: OutputNodes[] = []
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
				moreInit.push(attrSlot.outputMoreInit())

				let attrUpdateNodes = attrSlot.outputUpdate()

				if (attrSlot.shouldUpdateDynamically()) {
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
			init: [...init, ...moreInit, ...staticUpdate],
		}
	}

	private outputTransferredLatestValues(update: OutputNodeList) {

		// Output `$latest_value_i = $values[i]`
		let assignments = [...this.template.values.outputTransferredLatestNames()].map(([valueIndex, latestName]) => {
			return transformContext.factory.createBinaryExpression(
				transformContext.factory.createIdentifier(latestName),
				transformContext.factory.createToken(ts.SyntaxKind.EqualsToken),
				transformContext.factory.createElementAccessExpression(
					this.tree.createValuesIdentifier(),
					transformContext.factory.createNumericLiteral(valueIndex)
				)
			)
		})

		update.unshift(...assignments.reverse())
	}

	/** Make `new SlotPosition(...)` to indicate the start inner position of template. */
	private outputStartInnerSlotPosition(): ts.Expression | null {
		Modifier.addImport('SlotPosition', 'lupos.html')

		let position = SlotPositionType.Before
		let container = this.root
		let firstNode = this.root.firstChild

		// Being wrapped.
		if (this.wrappedBySVG || this.wrappedByTemplate) {
			container = container?.firstChild!
			firstNode = firstNode?.firstChild!
		}

		let nodeName = this.tree.references.getRefedName(firstNode ?? container)

		if (!firstNode) {
			position = SlotPositionType.AfterContent
		}

		// new SlotPosition(SlotPositionType.Before, $context),
		return transformContext.factory.createNewExpression(
			transformContext.factory.createIdentifier('SlotPosition'),
			undefined,
			[
				transformContext.factory.createNumericLiteral(position),
				transformContext.factory.createIdentifier(nodeName)
			]
		)
	}

	private outputRootHTML(): {node: OutputNodes, output: () => void} {

		// $html_0
		let {name: htmlName, output} = HTMLOutputHandler.prepareOutput(this.tree, this.wrappedBySVG, this.htmlName)

		// $locator
		let locatorName = VariableNames.locator

		// $locator = $html_0.make()
		let node = transformContext.factory.createVariableStatement(
			undefined,
			transformContext.factory.createVariableDeclarationList(
				[transformContext.factory.createVariableDeclaration(
					transformContext.factory.createIdentifier(locatorName),
					undefined,
					undefined,
					transformContext.factory.createCallExpression(
						transformContext.factory.createPropertyAccessExpression(
							transformContext.factory.createIdentifier(htmlName),
							transformContext.factory.createIdentifier('make')
						),
						undefined,
						[
							transformContext.factory.createIdentifier(VariableNames.hydrates)
						]
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

		for (let {node, fromNode: visitFromNode, visitSteps} of this.tree.references.output()) {

			// $node_0
			let nodeName = this.tree.references.getRefedName(node)
	
			// $node.firstChild
			let fromExp: ts.Expression | undefined

			// When visiting template.content.firstChild,
			// uses `$context.el` to represent it.
			if (!visitSteps) {
				fromExp = transformContext.factory.createPropertyAccessExpression(
					this.tree.createContextIdentifier(),
					'el'
				)

				visitSteps = []
			}

			// From root, use `$locator`.
			else if (visitFromNode === this.root) {
				fromExp = transformContext.factory.createIdentifier(VariableNames.locator)
			}

			// $node_0
			else {
				let fromNodeName = this.tree.references.getRefedName(visitFromNode)
				fromExp = transformContext.factory.createIdentifier(fromNodeName)
			}

			// $locator.childAt(0).firstChild.lastChild.childNodes[0]
			// $locator.getMarker('abcdef')...
			for (let i = 0; i < visitSteps.length; i++) {
				let {type, node, index} = visitSteps[i]

				if (type === VisitStepType.ChildIndex) {

					// $locator.childAt(0)
					if (i === 0 && visitFromNode === this.root) {
						fromExp = transformContext.factory.createCallExpression(
							transformContext.factory.createPropertyAccessExpression(
								fromExp,
								transformContext.factory.createIdentifier('childAt')
							),
							undefined,
							[transformContext.factory.createNumericLiteral(index)]
						)
					}
					else if (index === 0) {
						fromExp = transformContext.factory.createPropertyAccessExpression(
							fromExp,
							'firstChild'
						)
					}
					else if (index === -1) {
						fromExp = transformContext.factory.createPropertyAccessExpression(
							fromExp,
							'lastChild'
						)
					}
					else {
						fromExp = transformContext.factory.createElementAccessExpression(
							transformContext.factory.createPropertyAccessExpression(
								fromExp,
								transformContext.factory.createIdentifier('childNodes')
							),
							transformContext.factory.createNumericLiteral(index)
						)
					}
				}

				// Visit next siblings from `$locator.getMarker('abcdef')`.
				else if (type === VisitStepType.Marker) {
					fromExp = transformContext.factory.createCallExpression(
						transformContext.factory.createPropertyAccessExpression(
							transformContext.factory.createIdentifier(VariableNames.locator),
							transformContext.factory.createIdentifier('getMarker')
						),
						undefined,
						[transformContext.factory.createStringLiteral(node.markerId!)]
					)
				}

				// Visit next siblings from `$locator.getMarker('abcdef')`.
				else {
					for (let j = 0; j < index; j++) {
						fromExp = transformContext.factory.createPropertyAccessExpression(
							fromExp,
							'nextSibling'
						)
					}
				}
				
				// Access `template.content` for element in <lu:portal>.
				if (node.tagName === 'template' || node.tagName === 'lu:portal') {
					fromExp = transformContext.factory.createPropertyAccessExpression(
						fromExp,
						'content'
					)
				}
			}

			list.push(transformContext.factory.createVariableStatement(
				undefined,
				transformContext.factory.createVariableDeclarationList(
						[transformContext.factory.createVariableDeclaration(
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

		return transformContext.factory.createVariableStatement(
			undefined,
			transformContext.factory.createVariableDeclarationList(
				varNames.map(name => transformContext.factory.createVariableDeclaration(
					transformContext.factory.createIdentifier(name),
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
		position: ts.Expression | null,
		update: OutputNodeList,
		parts: Part[]
	) {
		
		// position part.
		let positionNode: ts.PropertyAssignment | null = null
		if (position) {
			positionNode = transformContext.factory.createPropertyAssignment(
				transformContext.factory.createIdentifier('position'),
				position
			)
		}

		let updateBlock = transformContext.factory.createBlock(
			Packer.toStatements(update),
			true
		)

		let updateParameters = this.outputUpdateParameters()

		// `update` part.
		let updateNode: ts.MethodDeclaration | null = null
		if (update.length > 0) {
			updateNode = transformContext.factory.createMethodDeclaration(
				undefined,
				undefined,
				transformContext.factory.createIdentifier('update'),
				undefined,
				undefined,
				updateParameters,
				undefined,
				updateBlock
			)
		}

		// `parts` part, list of all parts.
		let partsNode: ts.PropertyAssignment | null = null
		if (parts.length > 0) {
			let partExp: ts.Expression = transformContext.factory.createArrayLiteralExpression(
				parts.map(part => transformContext.factory.createArrayLiteralExpression([
					transformContext.factory.createIdentifier(part.name),
					transformContext.factory.createNumericLiteral(part.position)
				], false)),
				true
			)

			partsNode = transformContext.factory.createPropertyAssignment(
				transformContext.factory.createIdentifier('parts'),
				partExp
			)
		}

		return transformContext.factory.createObjectLiteralExpression(
			[
				transformContext.factory.createPropertyAssignment(
					transformContext.factory.createIdentifier('el'),
					transformContext.factory.createPropertyAccessExpression(
						transformContext.factory.createIdentifier(VariableNames.locator),
						'el'
					)
				),
				...(positionNode ? [positionNode] : []),
				...(updateNode ? [updateNode] : []),
				...(partsNode ? [partsNode] : []),
			],
			true
		)
	}

	/** Output parameters `(?$values)` of update function. */
	private outputUpdateParameters(): ts.ParameterDeclaration[] {
		let params: ts.ParameterDeclaration[] = []

		if (this.tree.usesValues()) {
			params.push(transformContext.factory.createParameterDeclaration(
				undefined,
				undefined,
				transformContext.factory.createIdentifier(VariableNames.values),
				undefined,
				undefined,
				undefined
			))
		}

		return params
	}

	/** Output parameters `($context, $hydrates)` of template maker init function. */
	private outputTemplateInitParameters(): ts.ParameterDeclaration[] {
		let params: ts.ParameterDeclaration[] = [
			transformContext.factory.createParameterDeclaration(
				undefined,
				undefined,
				transformContext.factory.createIdentifier(this.tree.usesContext() ? VariableNames.context : '_' + VariableNames.context),
				undefined,
				undefined,
				undefined
			),
			transformContext.factory.createParameterDeclaration(
				undefined,
				undefined,
				transformContext.factory.createIdentifier(VariableNames.hydrates),
				undefined,
				undefined,
				undefined
			)
		]

		return params
	}
}
