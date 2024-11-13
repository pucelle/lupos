import type TS from 'typescript'
import {HTMLNode, HTMLNodeType} from '../../html-syntax'
import {TreeParser} from '../tree'
import {FlowControlSlotParser} from '../slots'
import {factory, TemplateSlotPlaceholder} from '../../../core'
import {TemplateParser} from '../template'
import {CapturedOutputWay, TrackingScopeTree, TrackingScopeTypeMask} from '../../../ff'


export abstract class FlowControlBase {

	readonly slot: FlowControlSlotParser
	readonly node: HTMLNode
	readonly tree: TreeParser
	readonly template: TemplateParser

	constructor(slot: FlowControlSlotParser) {
		this.slot = slot
		this.node = slot.node
		this.tree = slot.tree
		this.template = slot.template
	}

	protected eatNext(...tagNames: string[]): HTMLNode[] {
		let node = this.node.nextSibling
		let eaten: HTMLNode[] = []

		while (node && node.type === HTMLNodeType.Tag) {
			if (tagNames.includes(node.tagName!)) {
				eaten.push(node)
				node = node.nextSibling
			}
			else {
				break
			}
		}

		for (let node of eaten) {
			node.remove()
		}
		
		return eaten
	}

	/** Returns whether has specified attribute name. */
	protected hasAttrValue(node: HTMLNode, name: string): boolean {
		return !!node.attrs?.find(attr => attr.name === name)
	}

	/** Get value index of slot `<lu:xx ${...}>`. */
	protected getAttrValueIndex(node: HTMLNode): number | null {
		let attrName = node.attrs?.find(attr => TemplateSlotPlaceholder.isCompleteSlotIndex(attr.name))?.name
		let index = attrName ? TemplateSlotPlaceholder.getUniqueSlotIndex(attrName) : null

		return index
	}

	/** Get value index of slot `<lu:xx>${...}<>`. */
	protected getUniqueChildValueIndex(node: HTMLNode): number | null {
		if (node.children.length === 0) {
			return null
		}

		let childNode = node.children.find(n => {
			return n.type === HTMLNodeType.Text
				&& TemplateSlotPlaceholder.isCompleteSlotIndex(n.text!)
		})

		let index = childNode ? TemplateSlotPlaceholder.getUniqueSlotIndex(childNode.text!) : null

		return index
	}

	/** Make a maker array nodes by maker names. */
	protected outputMakerNodes(templateNames: (string | null)[]): TS.ArrayLiteralExpression {
		return factory.createArrayLiteralExpression(
			templateNames.map(name => this.outputMakerNode(name)),
			false
		)
	}

	/** Make a maker node by a maker name. */
	protected outputMakerNode(templateName: string | null): TS.Identifier | TS.NullLiteral {
		return templateName ? factory.createIdentifier(templateName) : factory.createNull()
	}

	/** 
	 * Mark as independent tracking range.
	 * Must before separation as sub template.
	 * Returns start node of range.
	 */
	protected markTrackingRangeBeforeSeparation(node: HTMLNode): TS.Node | null {

		// Get raw content string to get used indices.
		let contentString = node.getContentString()
		let subValueIndices = TemplateSlotPlaceholder.getSlotIndices(contentString)
		let rawValueNodes = this.template.values.rawValueNodes
		
		if (subValueIndices) {
			TrackingScopeTree.markRange(
				this.template.rawNode,
				rawValueNodes[subValueIndices[0]].parent,
				rawValueNodes[subValueIndices[subValueIndices.length - 1]].parent,
				TrackingScopeTypeMask.ConditionalContent,
				CapturedOutputWay.Custom
			)

			return rawValueNodes[subValueIndices[0]].parent
		}

		return null
	}

	preInit() {}
	postInit() {}
	outputInit(): TS.Statement | TS.Expression | (TS.Statement| TS.Expression)[] {
		return []
	}
	outputUpdate(): TS.Statement | TS.Expression | (TS.Statement| TS.Expression)[] {
		return []
	}
}