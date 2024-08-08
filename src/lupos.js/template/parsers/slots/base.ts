import type TS from 'typescript'
import {HTMLNode, HTMLNodeType} from '../../html-syntax'
import {HTMLTreeParser} from '../html-tree'
import {factory, Modifier} from '../../../../base'
import {VariableNames} from '../variable-names'


export abstract class SlotParserBase {

	/** Attribute name, be `null` for dynamic binding `<tag ${...}>`. */
	readonly name: string | null = null

	/** Modifiers. */
	readonly modifiers: string[] | null = []

	/** If defined as `???="..."`, be `...`. Otherwise be `null`. */
	readonly string: string | null

	/** Index of the node the slot placed at within the document fragment. */
	readonly node: HTMLNode

	/** Tree current slot belonged to. */
	readonly tree: HTMLTreeParser

	/** 
	 * Value index in the whole template.
	 * Is `null` if slot is a fixed slot defined like `???="..."`.
	 */
	private readonly valueIndex: number | null

	constructor(
		name: string | null,
		string: string | null,
		valueIndex: number | null,
		node: HTMLNode,
		tree: HTMLTreeParser
	) {
		this.name = name
		this.string = string
		this.valueIndex = valueIndex

		if (name !== null) {
			let splitted = name.split(/[.]/g)
			this.name = splitted[0]
			this.modifiers = splitted.slice(1)
		}

		this.node = node
		this.tree = tree

		this.init()
	}

	/** Returns whether have value index exist. */
	protected hasValueIndex(): boolean {
		return this.valueIndex !== null
	}

	/** Returns whether current value node is mutable. */
	protected isValueMutable(): boolean {
		return this.valueIndex !== null && this.isValueAtIndexMutable(this.valueIndex)
	}

	/** Returns whether the value node at specified index is mutable. */
	isValueAtIndexMutable(valueIndex: number): boolean {
		return this.tree.template.isValueAtIndexMutable(valueIndex)
	}

	/** Get slot node. */
	protected getSlotNode(): TS.Expression {
		return this.tree.template.slotNodes[this.valueIndex!]
	}

	/** Get node variable name. */
	protected getRefedNodeName(): string {
		return this.tree.references.referenceAsName(this.node)
	}

	/** 
	 * Reference as a component.
	 * Can only use it in `init`.
	 */
	protected refAsComponent() {
		this.tree.refAsComponent(this.node)
	}

	/**
	 * Get referenced component name.
	 * Must have referenced in `init` using `refAsComponent()`.
	 * Can only use it in `outputInit` or `outputUpdate`.
	 */
	protected getRefedComponentName(): string {
		return this.tree.getRefedComponentName(this.node)
	}

	/** Returns whether component of a node has been referenced. */
	protected isRefedAsComponent(): boolean {
		return this.tree.isRefedAsComponent(this.node)
	}

	/** 
	 * Get value node, either `$values[0]`, or `"..."`.
	 * Can only use it when outputting update.
	 */
	getOutputValueNode(): TS.Expression {
		if (this.valueIndex === null) {
			return factory.createStringLiteral(this.string!)
		}
		else {
			return this.getOutputValueNodeAtIndex(this.valueIndex)
		}
	}

	/** 
	 * Get value node at index, either `$values[0]`, or static slot node.
	 * Can only use it when outputting update.
	 */
	getOutputValueNodeAtIndex(index: number): TS.Expression {
		if (!this.tree.template.isValueAtIndexMutable(index)) {
			return this.tree.template.slotNodes[index]
		}
		else {
			let remappedIndex = this.tree.template.getRemappedValueIndex(index)

			return factory.createElementAccessExpression(
				factory.createIdentifier(VariableNames.values),
				factory.createNumericLiteral(remappedIndex)
			)
		}
	}

	/** Make `new TemplateSlot(...)`. */
	makeTemplateSlot(slotContentType: number | null): TS.Expression {
		Modifier.addImport('TemplateSlot', '@pucelle/lupos.js')
		Modifier.addImport('SlotPosition', '@pucelle/lupos.js')

		let position: number
		let nextNode = this.node.nextSibling
		let parent = this.node.parent!
		let nodeName: string

		// Use next node to locate.
		if (nextNode && nextNode.type !== HTMLNodeType.Comment) {
			nodeName = this.tree.references.referenceAsName(nextNode)
			this.node.remove()

			// SlotPositionType.Before
			position = 2
		}

		// Parent is stable enough.
		// Would be ok although parent is a dynamic component.
		else if (parent.tagName !== 'template') {
			nodeName = this.tree.references.referenceAsName(parent)
			this.node.remove()

			// SlotPositionType.AfterContent
			position = 1
		}

		// Use the comment node to locate.
		else {
			nodeName = this.getRefedNodeName()

			// SlotPositionType.Before
			position = 2
		}


		// new TemplateSlot(
		//   new SlotPosition(SlotPositionType.Before / AfterContent, $context),
		//   context,
		//   ?SlotContentType.xxx
		// )

		let templateSlotParams: TS.Expression[] = [
			factory.createNewExpression(
				factory.createIdentifier('SlotPosition'),
				undefined,
				[
					factory.createNumericLiteral(position),
					factory.createIdentifier(nodeName)
				]
			),
			factory.createIdentifier(VariableNames.context)
		]

		// Knows about content type.
		if (slotContentType !== null) {
			templateSlotParams.push(factory.createNumericLiteral(slotContentType))
		}

		return factory.createNewExpression(
			factory.createIdentifier('TemplateSlot'),
			undefined,
			templateSlotParams
		)
	}

	/** Make `new SlotRange(...)`. */
	protected makeSlotRangeExpression(): TS.Expression {
		if (this.node.children.length > 0) {
			return factory.createNull()
		}

		Modifier.addImport('SlotRange', '@pucelle/lupos.js')

		let firstChild = this.node.firstChild!
		let lastChild = this.node.lastChild!

		// End outer position of TemplateSlot, may insert contents before it.
		if (firstChild.type === HTMLNodeType.Comment) {
			let comment = new HTMLNode(HTMLNodeType.Comment, {})
			firstChild.before(comment)
			firstChild = comment
		}

		let firstChildName = this.tree.references.referenceAsName(firstChild)
		let lastChildName = this.tree.references.referenceAsName(lastChild)

		return factory.createNewExpression(
			factory.createIdentifier('SlotRange'),
			undefined,
			[
				factory.createIdentifier(firstChildName),
				factory.createIdentifier(lastChildName)
			]
		)
	}

	/** Initialize and prepare. */
	protected init() {}

	/** 
	 * Output initialize codes.
	 * Note it should not output variable declaration codes,
	 * which will be output by tree parser.
	 * 
	 * `nodeAttrInits` are all the attribute, binding applied to current node,
	 * it will be applied only for component or dynamic component slot.
	 */
	outputInit(_nodeAttrInits: TS.Statement[]): TS.Statement | TS.Expression | (TS.Statement| TS.Expression)[] {
		return []
	}

	/** Output update codes. */
	outputUpdate(): TS.Statement | TS.Expression | (TS.Statement| TS.Expression)[] {
		return []
	}
}