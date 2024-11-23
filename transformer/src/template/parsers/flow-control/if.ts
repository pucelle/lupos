import type * as ts from 'typescript'
import {factory, Interpolator, Modifier, Packer, TemplateSlotPlaceholder} from '../../../core'
import {FlowControlBase} from './base'
import {TemplateParser} from '../template'
import {SlotContentType} from '../../../enums'
import {CapturedOutputWay, TrackingPatch, TrackingRanges, TrackingScopeTree, TrackingScopeTypeMask} from '../../../ff'
import {HTMLNode} from '../../html-syntax'


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

	preInit() {
		let tags = ['lu:elseif', 'lu:else']
		let nextNodes = this.eatNext(...tags)
		let allNodes = [this.node, ...nextNodes]

		this.initByNodesAndTags(allNodes, tags)
	}

	protected initByNodesAndTags(allNodes: HTMLNode[], tags: string[]) {
		this.blockVariableName = this.tree.makeUniqueBlockName()
		this.slotVariableName = this.slot.makeSlotName()
		this.cacheable = this.hasAttrValue(this.node, 'cache')

		let conditionIndices: (number | null)[] = []
		let lastConditionIndex: number | null = null
		let contentStrings: (string | null)[] = []

		for (let child of allNodes) {
			let conditionIndex = this.getAttrValueIndex(child)
			
			if (conditionIndex === null && child.tagName === tags[0]) {
				this.slot.diagnoseNormal(`<${tags[0]} \${...}> must accept a parameter as condition!`, child)
			}
			else if (conditionIndex !== null && child.tagName === tags[1]) {
				this.slot.diagnoseNormal(`<${tags[1]}> should not accept any parameter!`, child)
			}
			else if (conditionIndex === null && lastConditionIndex === null) {
				this.slot.diagnoseNormal(`<${tags[1]}> is allowed only one to exist on the tail!`, child)
			}

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
		this.templateSlotGetter = this.slot.prepareTemplateSlot(slotContentType)
	}

	protected initTrackingRanges(conditionIndices: (number | null)[], contentStrings: (string | null)[]) {
		let contentIndicesList = contentStrings.map(s => s ? TemplateSlotPlaceholder.getSlotIndices(s) ?? [] : [])
		let flatContentIndices = contentIndicesList.flat()
		let rawValueNodes = this.template.values.rawValueNodes
		let endContentIndex = flatContentIndices.length > 0 ? flatContentIndices[flatContentIndices.length - 1] : null

		for (let i = 0; i < conditionIndices.length; i++) {
			let conditionIndex = conditionIndices[i]
			let contentIndices = contentIndicesList[i]


			if (conditionIndex !== null) {
				let valueNode = rawValueNodes[conditionIndex]
				TrackingScopeTree.specifyType(valueNode, TrackingScopeTypeMask.ConditionalCondition)
			}


			if (contentIndices.length > 0) {
				let contentRangeId = TrackingRanges.markRange(
					this.template.rawNode,
					rawValueNodes[contentIndices[0]].parent,
					rawValueNodes[contentIndices[contentIndices.length - 1]].parent,
					TrackingScopeTypeMask.ConditionalContent,
					CapturedOutputWay.Custom
				)

				this.contentRangeIds.push(contentRangeId)
			}
			else {
				this.contentRangeIds.push(null)
			}


			if (conditionIndex !== null && contentIndices.length > 0) {
				let type = TrackingScopeTypeMask.Conditional
				
				if (i > 0) {
					type |= TrackingScopeTypeMask.ConditionalContent
				}

				let conditionalRangeId = TrackingRanges.markRange(
					this.template.rawNode,
					rawValueNodes[conditionIndex].parent,
					rawValueNodes[endContentIndex!].parent,
					type,
					CapturedOutputWay.Custom
				)

				this.conditionalRangeIds.push(conditionalRangeId)
			}
			else {
				this.conditionalRangeIds.push(null)
			}
		}
	}

	outputInit() {
		let blockClassName = this.cacheable ? 'CacheableIfBlock' : 'IfBlock'
		return this.outputInitByClassName(blockClassName)
	}

	protected outputInitByClassName(blockClassName: string) {
		Modifier.addImport(blockClassName, '@pucelle/lupos.js')

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
				factory.createNewExpression(
					factory.createIdentifier(blockClassName),
					undefined,
					[
						factory.createIdentifier(this.slotVariableName),
					]
				)
			)
		]
	}

	outputUpdate(): ts.Statement | ts.Expression | (ts.Statement| ts.Expression)[] {
		let toValue = this.outputConditionalExpression()

		// $block_0.update($values[0])
		return factory.createCallExpression(
			factory.createPropertyAccessExpression(
				factory.createIdentifier(this.blockVariableName),
				factory.createIdentifier('update')
			),
			undefined,
			[toValue]
		)
	}

	/** Make an index output function by an if condition value index sequence. */
	protected outputConditionalExpression(): ts.Expression {
		let conditions = this.conditionIndices.map(index => {
			if (index === null) {
				return factory.createNull()
			}
			else {
				let rawNode = this.template.values.getRawValue(index)
				return Interpolator.outputNodeSelf(rawNode) as ts.Expression
			}
		})

		let contents = this.contentTemplates.map((template, index) => {
			let rangeId = this.contentRangeIds[index]
			let contentTrackingExps = rangeId ? TrackingPatch.outputCustomRangeTracking(rangeId) : []

			if (template === null) {
				return factory.createNull()
			}
			else {
				let output = template.outputReplaced()
				return Packer.parenthesizeExpressions(...contentTrackingExps, output)
			}
		})

		let conditionalTrackings = this.conditionalRangeIds.map(rangeId => rangeId ? TrackingPatch.outputCustomRangeTracking(rangeId) : [])

		// Make a new expression: `(track1, cond1 ? content1 : (track2, cond2 ? content2 : ...))`
		let value = Packer.toConditionalExpression(conditions, contents, conditionalTrackings)

		// Add it as a value item to original template, and returned it's reference.
		let toValue = this.slot.outputCustomValue(value)

		return toValue
	}

	protected outputConditionsExps() {
		let conditions = this.conditionIndices.map(index => {
			if (index === null) {
				return factory.createNull()
			}
			else {
				let rawNode = this.template.values.getRawValue(index)
				return Interpolator.outputNodeSelf(rawNode) as ts.Expression
			}
		})

		return conditions
	}
}