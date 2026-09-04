import type ts from 'typescript'
import {Interpolator, Modifier, Packer, transformContext} from '../../../core'
import {FlowControlBase} from './base'
import {TemplateParser} from '../template'
import {SlotContentType} from '../../../enums'
import {TrackingRanges, TrackingAreaTree, TrackingAreaTypeMask} from '../../../lupos'
import {HTMLNode, TemplateSlotPlaceholder} from '../../../lupos-ts-module'


export class IfFlowControl extends FlowControlBase {

	/** $block_0 */
	protected blockVariableName: string = ''

	/** $slot_0 */
	protected slotVariableName: string = ''

	/** new TemplateSlot(...) */
	protected templateSlotGetter!: () => ts.Expression

	protected cacheable: boolean = false
	protected conditionIndices: (number | null)[] = []
	protected contentTemplates: (TemplateParser | null)[] = []
	protected contentRangeIds: (number | null)[] = []
	protected conditionalRangeIds: (number | null)[] = []

	override preInit() {
		let tags = ['lu:elseif', 'lu:else']
		let nextNodes = this.eatNext(...tags)
		let allNodes = [this.node, ...nextNodes]

		this.initByNodesAndTags(allNodes)
	}

	protected initByNodesAndTags(allNodes: HTMLNode[]) {
		this.blockVariableName = this.tree.makeUniqueBlockName()
		this.slotVariableName = this.slot.makeSlotName()
		this.cacheable = this.hasAttrValue(this.node, 'cache')

		let conditionIndices: (number | null)[] = []
		let lastConditionIndex: number | null = null
		let contentStrings: (string | null)[] = []

		for (let child of allNodes) {
			let conditionIndex = this.getAttrValueIndex(child)
			
			conditionIndices.push(conditionIndex)
			lastConditionIndex = conditionIndex

			if (child.children.length > 0) {
				contentStrings.push(child.getContentString())
			}
			else {
				contentStrings.push(null)
			}
		}

		this.initTrackingRanges(conditionIndices, contentStrings)
		this.conditionIndices = conditionIndices

		for (let child of allNodes) {
			if (child.children.length > 0) {
				let template = this.template.separateChildrenAsTemplate(child)
				this.contentTemplates.push(template)
			}
			else {
				this.contentTemplates.push(null)
			}
		}

		// Ensure always have an `else` branch.
		if (lastConditionIndex !== null) {
			this.contentTemplates.push(null)
		}

		let allBeResult = this.contentTemplates.every(t => t)
		let slotContentType = allBeResult ? SlotContentType.TemplateResult : null
		this.templateSlotGetter = this.slot.prepareAsTemplateSlot(slotContentType)
	}

	protected initTrackingRanges(conditionIndices: (number | null)[], contentStrings: (string | null)[]) {
		let contentIndicesList = contentStrings.map(s => s ? TemplateSlotPlaceholder.getSlotIndices(s) ?? [] : [])
		let flatContentIndices = contentIndicesList.flat()
		let rawValueNodes = this.template.values.valueNodes
		
		let endContentIndex = flatContentIndices.length > 0
			? flatContentIndices[flatContentIndices.length - 1]
			: null

		for (let i = 0; i < conditionIndices.length; i++) {
			let conditionIndex = conditionIndices[i]
			let contentIndices = contentIndicesList[i]


			if (conditionIndex !== null) {
				let valueNode = rawValueNodes[conditionIndex]
				TrackingAreaTree.specifyType(valueNode, TrackingAreaTypeMask.ConditionalCondition)
			}


			if (contentIndices.length > 0) {
				let contentRangeId = TrackingRanges.markRange(
					this.template.node,
					rawValueNodes[contentIndices[0]].parent,
					rawValueNodes[contentIndices[contentIndices.length - 1]].parent,
					TrackingAreaTypeMask.ConditionalContent,
				)

				this.contentRangeIds.push(contentRangeId)
			}
			else {
				this.contentRangeIds.push(null)
			}


			if (conditionIndex !== null && contentIndices.length > 0) {
				let type = TrackingAreaTypeMask.Conditional
				
				if (i > 0) {
					type |= TrackingAreaTypeMask.ConditionalContent
				}

				let conditionalRangeId = TrackingRanges.markRange(
					this.template.node,
					rawValueNodes[conditionIndex].parent,
					rawValueNodes[endContentIndex!].parent,
					type,
				)

				this.conditionalRangeIds.push(conditionalRangeId)
			}
			else {
				this.conditionalRangeIds.push(null)
			}
		}
	}

	override outputInit() {
		let blockClassName = this.cacheable ? 'CacheableIfBlock' : 'IfBlock'
		return this.outputInitByBlockClassName(blockClassName)
	}

	protected outputInitByBlockClassName(blockClassName: string) {
		Modifier.addImport(blockClassName, 'lupos.html')

		// let $block_0 = new IfBlock / CacheableIfBlock(
		//   new TemplateSlot(new SlotPosition(SlotPositionType.Before, nextChild)),
		// )
		let templateSlot = this.templateSlotGetter()

		let slotInit = this.slot.createVariableAssignment(
			this.slotVariableName,
			templateSlot
		)

		return [
			slotInit,
			this.slot.createVariableAssignment(
				this.blockVariableName,
				transformContext.factory.createNewExpression(
					transformContext.factory.createIdentifier(blockClassName),
					undefined,
					[
						transformContext.factory.createIdentifier(this.slotVariableName),
					]
				)
			)
		]
	}

	override outputUpdate(): ts.Statement | ts.Expression | (ts.Statement| ts.Expression)[] {
		let toValue = this.outputConditionalExp()

		// $block_0.update($values[0])
		return transformContext.factory.createCallExpression(
			transformContext.factory.createPropertyAccessExpression(
				transformContext.factory.createIdentifier(this.blockVariableName),
				transformContext.factory.createIdentifier('update')
			),
			undefined,
			[toValue]
		)
	}

	/** Make an index output function by an if condition value index sequence. */
	protected outputConditionalExp(): ts.Expression {
		let conditions = this.outputConditionsExps()

		// The conditional parts are plain in template, but becomes flow when generating,
		// so we need to output tracking codes for conditional nodes manually.
		let contents = this.contentTemplates.map((template) => {
			if (template === null) {
				return transformContext.factory.createNull()
			}
			else {
				return template.outputReplaced()
			}
		})

		// Make a new expression: `(track1, cond1 ? content1 : (track2, cond2 ? content2 : ...))`
		let value = Packer.toConditionalExpression(conditions, contents)

		// Add it as a value item to original template, and returned it's reference.
		let toValue = this.slot.outputCustomValue(value)

		return toValue
	}

	protected outputConditionsExps() {
		let conditions = this.conditionIndices.map(index => {
			if (index === null) {
				return transformContext.factory.createNull()
			}
			else {
				let rawNode = this.template.values.valueNodeAt(index)
				return Interpolator.outputSelfUnique(rawNode) as ts.Expression
			}
		})

		return conditions
	}
}
