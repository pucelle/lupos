import type TS from 'typescript'
import {HTMLNode, HTMLNodeType} from '../../html-syntax'
import {TreeParser} from '../tree'
import {FlowControlSlotParser} from '../slots'
import {factory, TemplateSlotPlaceholder} from '../../../../base'
import {TemplateParser} from '../template'


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

	/** Get value index of slot `<lupos:xx ${...}>`. */
	protected getAttrValueIndex(node: HTMLNode): number | null {
		let attrName = node.attrs?.find(attr => TemplateSlotPlaceholder.isCompleteSlotIndex(attr.name))?.name
		let index = attrName ? TemplateSlotPlaceholder.getUniqueSlotIndex(attrName) : null

		return index
	}

	/** Get value index of slot `<lupos:xx>${...}<>`. */
	protected getUniqueChildValueIndex(node: HTMLNode): number | null {
		if (node.children.length === 0) {
			return null
		}

		let childNode = node.children.find(n => {
			return n.type === HTMLNodeType.Tag
				&& TemplateSlotPlaceholder.isCompleteSlotIndex(n.tagName!)
		})

		let index = childNode ? TemplateSlotPlaceholder.getUniqueSlotIndex(childNode.tagName!) : null

		return index
	}

	/** Make a maker array nodes by maker names. */
	protected outputMakerNodes(makerNames: (string | null)[]): TS.ArrayLiteralExpression {
		return factory.createArrayLiteralExpression(
			makerNames.map(name => this.outputMakerNode(name)),
			false
		)
	}

	/** Make a maker node by a maker name. */
	protected outputMakerNode(makerName: string | null): TS.Identifier | TS.NullLiteral {
		return makerName ? factory.createIdentifier(makerName) : factory.createNull()
	}

	/** Initialize and prepare. */
	init() {}

	/** Output initialize codes. */
	outputInit(): TS.Statement | TS.Expression | (TS.Statement| TS.Expression)[] {
		return []
	}

	/** Output update codes. */
	outputUpdate(): TS.Statement | TS.Expression | (TS.Statement| TS.Expression)[] {
		return []
	}
}