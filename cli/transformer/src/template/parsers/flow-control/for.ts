import ts from 'typescript'
import {DeclarationScopeTree, Hashing, Modifier, transformContext} from '../../../core'
import {FlowControlBase} from './base'
import {SlotContentType} from '../../../enums'
import {ObservedStateMask, ObservedChecker, TrackingPatch, TrackingRanges, TrackingAreaTypeMask} from '../../../lupos'
import {ForHeader, parseForHeader, parseForRenderer, TemplatePartType, TemplateSlotPlaceholder} from '../../../lupos-ts-module'
import {PartType} from '../tree'
import {TemplateParser} from '../template'
import {MutableConfig} from '../../../core/helpers/mutable-state'


export class ForFlowControl extends FlowControlBase {

	/** $block_0 */
	private blockVariableName: string = ''

	/** $slot_0 */
	private slotVariableName: string = ''

	/** new TemplateSlot(...) */
	private templateSlotGetter!: () => ts.Expression

	private ofValueIndex: number | null = null
	private fnValueIndex: number | null = null

	private ofValueIndexElementsMutable: boolean = false
	private fnValueIndexMutable: boolean = false

	private fnLatestVariableName: string | null = null
	
	/** Parsed for header. */
	private header: ForHeader | null = null

	/** Whether the body supplies a render callback directly. */
	private hasRenderer: boolean = false

	private ofMutableConfig!: MutableConfig 
	private fnMutableConfig!: MutableConfig 

	/** For content template. */
	private contentTemplate: TemplateParser | null = null

	override preInit() {
		this.blockVariableName = this.tree.makeUniqueBlockName()
		this.slotVariableName = this.slot.makeSlotName()
		this.templateSlotGetter = this.slot.prepareAsTemplateSlot(SlotContentType.TemplateResultList)
		this.header = parseForHeader(this.node, this.template.valueNodes, transformContext.helper)
		
		let renderer = parseForRenderer(this.node)
		this.hasRenderer = renderer !== null

		// Register generated parameters only in the transformer's declaration scopes.
		if (this.header) {
			let declaration = this.template.valueNodes[this.header.declarationIndex]
			let scope = DeclarationScopeTree.findClosest(declaration)

			for (let name of this.header.names) {
				scope.setLocalVariable(name.text, name)
			}
		}

		let ofValueIndex = this.header?.iterableIndex ?? renderer?.iterableIndex ?? null
		let content = this.node.getContentString().trim()
		let fnValueIndex = renderer?.rendererIndex ?? TemplateSlotPlaceholder.getUniqueSlotIndex(content)

		// Only a TemplateResult can be returned directly; other content needs a sub-template.
		if (!renderer && fnValueIndex !== null
			&& this.template.values.identifyValueContentType(fnValueIndex) !== SlotContentType.TemplateResult
		) {
			fnValueIndex = null
		}

		let contentIndices = TemplateSlotPlaceholder.getSlotIndices(this.node.getContentString()) ?? []

		if (ofValueIndex !== null) {

			// Force tracking members of array.
			// When parsing template, all descendant nodes have not been visited by tracking module.
			let iterable = this.template.values.valueNodeAt(ofValueIndex)
			if (ObservedChecker.getElementsObserved(iterable)) {
				TrackingPatch.forceTrackType(iterable, ObservedStateMask.Elements)
				TrackingPatch.addCustomTracking(iterable, 'get', iterable, '')

				let itemName = this.header?.names[0].text

				let visit = (node: ts.Node) => {
					if (transformContext.helper.isVariableIdentifier(node) && node.text === itemName) {
						TrackingPatch.forceTrackType(node, ObservedStateMask.Elements)
					}
					ts.forEachChild(node, visit)
				}

				for (let index of contentIndices) visit(this.template.valueNodes[index])
			}

		}

		this.ofValueIndex = ofValueIndex
		this.fnValueIndex = fnValueIndex

		let skipHashes = this.header?.names.map(name => Hashing.hashNode(name).key)

		this.ofMutableConfig! = {
			skipHashes,
		}

		this.fnMutableConfig! = {
			withinFunction: true,
			asLazyCallback: true,
			skipHashes,
		}

		this.ofValueIndexElementsMutable = ofValueIndex !== null
			&& (
				!this.template.values.isTransferableAt(ofValueIndex, {
					skipHashes,
				})

				// Readonly list properties may still have mutable elements.
				|| this.template.values.isElementsMutableAt(ofValueIndex)
		)

		if (fnValueIndex !== null) {
			this.fnValueIndexMutable = !this.template.values.isTransferableAt(fnValueIndex, this.fnMutableConfig!)
		}

		if (this.fnValueIndexMutable) {
			this.fnLatestVariableName = this.tree.makeUniqueLatestName()
		}

		// Like conditional sub-templates, a loop body owns its tracking captures.
		// Its expressions run inside the generated per-item callback.
		if (contentIndices.length) {
			TrackingRanges.markRange(this.template.node,
				this.template.valueNodes[contentIndices[0]].parent,
				this.template.valueNodes[contentIndices[contentIndices.length - 1]].parent,
				TrackingAreaTypeMask.ConditionalContent | TrackingAreaTypeMask.TemplateLoop
			)
		}

		// `<lu:for ${item} of ${list}><...></>`
		// Have inner template content.
		if (fnValueIndex === null) {
			this.contentTemplate = this.template.separateChildrenAsTemplate(this.node)
		}
		else {
			this.node.empty()
		}

		this.tree.addPart(this.blockVariableName, this.node, PartType.Block)
	}

	private outputOfUpdate(): ts.Expression | ts.Statement {
		let ofValueIndices = this.ofValueIndex !== null ? [this.ofValueIndex] : null
		let value = this.template.values.outputValue(null, ofValueIndices, this.tree, TemplatePartType.FlowControl, this.ofMutableConfig)

		// Not compare, update directly.
		// $block_0.updateData(data)
		return transformContext.factory.createCallExpression(
			transformContext.factory.createPropertyAccessExpression(
				transformContext.factory.createIdentifier(this.blockVariableName),
				transformContext.factory.createIdentifier('updateData')
			),
			undefined,
			[
				value.joint,
			]
		)
	}

	private outputFnUpdate(): ts.Expression | ts.Statement {
		let value: {joint: ts.Expression, valueNodes: ts.Expression[]}

		// `<lu:for ${item} of ${list}><...></>`
		if (this.contentTemplate) {
			let templateOutput = this.contentTemplate.outputReplaced()
			let transferred = this.template.values.transferOutputted(templateOutput, this.template.node, this.tree, this.fnMutableConfig)

			value = {
				valueNodes: [],
				joint: transferred,
			}
		}

		// `<lu:for ${item} of ${list}>${renderItem(item)}</>`
		else {
			let fnValueIndices = this.fnValueIndex !== null ? [this.fnValueIndex] : null
			value = this.template.values.outputValue(null, fnValueIndices, this.tree, TemplatePartType.FlowControl, this.fnMutableConfig)
		}

		let factory = transformContext.factory

		// function(item, ?index) {return ...}
		let forFn = this.hasRenderer ? value.joint : factory.createFunctionExpression(
			undefined,
			undefined,
			undefined,
			undefined,
			this.header?.names.map(name =>
				factory.createParameterDeclaration(
					undefined,
					undefined,
					name,
				)
			),
			undefined,
			factory.createBlock([
				factory.createReturnStatement(value.joint)
			], true)
		)


		// if ($latest_0 !== $values[0]) {
		//   $block_0.updateRenderFn($values[0])
		//   $latest_0 = $values[0]
		// }
		if (this.fnLatestVariableName) {
			return transformContext.factory.createIfStatement(
				this.slot.outputLatestComparison([this.fnLatestVariableName], value.valueNodes),
				transformContext.factory.createBlock(
					[
						transformContext.factory.createExpressionStatement(transformContext.factory.createCallExpression(
							transformContext.factory.createPropertyAccessExpression(
								transformContext.factory.createIdentifier(this.blockVariableName),
								transformContext.factory.createIdentifier('updateRenderFn')
							),
							undefined,
							[
								forFn
							]
						)),
						...this.slot.outputLatestAssignments([this.fnLatestVariableName], value.valueNodes),
					],
					true
				),
				undefined
			)
		}
		else {

			// $block_0.updateRenderFn(data)
			return transformContext.factory.createCallExpression(
				transformContext.factory.createPropertyAccessExpression(
					transformContext.factory.createIdentifier(this.blockVariableName),
					transformContext.factory.createIdentifier('updateRenderFn')
				),
				undefined,
				[
					forFn,
				]
			)
		}
	}

	override outputInit() {
		Modifier.addImport('ForBlock', 'lupos.html')

		// let $block_0 = new ForBlock(
		//   new TemplateSlot(new SlotPosition(SlotPositionType.Before, nextChild)),
		//   $context_0,
		// )

		let templateSlot = this.templateSlotGetter()

		let slotInit = this.slot.createVariableAssignment(
			this.slotVariableName,
			templateSlot
		)

		let forBlockInit = this.slot.createVariableAssignment(
			this.blockVariableName,
			transformContext.factory.createNewExpression(
				transformContext.factory.createIdentifier('ForBlock'),
				undefined,
				[
					transformContext.factory.createIdentifier(this.slotVariableName),
				]
			)
		)

		return [
			slotInit,
			forBlockInit,
			...this.fnValueIndexMutable ? [] : [this.outputFnUpdate()],
			...this.ofValueIndexElementsMutable ? [] : [this.outputOfUpdate()],
		]
	}

	override outputUpdate() {
		return [
			...this.fnValueIndexMutable ? [this.outputFnUpdate()] : [],
			...this.ofValueIndexElementsMutable ? [this.outputOfUpdate()] : [],
		]
	}
}
