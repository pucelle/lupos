import type TS from 'typescript'
import {HTMLNode, HTMLNodeType} from '../../html-syntax'
import {TreeParser} from '../tree'
import {factory, Modifier} from '../../../../base'
import {VariableNames} from '../variable-names'
import {TemplateParser} from '../template'


export abstract class SlotParserBase {

	/** Attribute name, be `null` for dynamic binding `<tag ${...}>`. */
	readonly name: string | null = null

	/** Modifiers. */
	readonly modifiers: string[] | null = []

	/** If defined as `???="..."`, be `...`. Otherwise be `null`. */
	readonly string: string | null

	/** Index of the node the slot placed at within the document fragment. */
	readonly node: HTMLNode

	/** Tree parser current slot belonged to. */
	readonly treeParser: TreeParser

	/** Template parser current slot belonged to. */
	readonly template: TemplateParser

	/** 
	 * Value index in the whole template.
	 * Is `null` if slot is a fixed slot defined like `???="..."`.
	 */
	readonly valueIndex: number | null

	constructor(
		name: string | null,
		string: string | null,
		valueIndex: number | null,
		node: HTMLNode,
		treeParser: TreeParser
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
		this.treeParser = treeParser
		this.template = treeParser.template
	}

	/** Returns whether have value index exist. */
	protected hasValueIndex(): boolean {
		return this.valueIndex !== null
	}

	/** Returns whether current value node is mutable. */
	protected isValueMutable(): boolean {
		return this.valueIndex !== null
			&& this.template.values.isIndexMutable(this.valueIndex)
	}

	/** Returns whether current value node can turn from mutable to static. */
	protected isValueCanTurnStatic(): boolean {
		return this.valueIndex !== null
			&& this.template.values.isIndexCanTurnStatic(this.valueIndex)
	}

	/** Returns whether current value has been outputted as mutable. */
	isValueOutputAsMutable(): boolean {
		return this.valueIndex !== null
			&& this.template.values.isIndexOutputAsMutable(this.valueIndex)
	}

	/** Returns whether current value has been transferred to topmost scope. */
	isValueTransferredToTopmost(): boolean {
		return this.valueIndex !== null
			&& this.template.values.isIndexTransferredToTopmost(this.valueIndex)
	}

	/** Get raw node, can only use returned node to identify type, cant output. */
	protected getRawNode(): TS.Expression {
		return this.template.values.getRawNode(this.valueIndex!)
	}

	/** Get node variable name. */
	protected getRefedNodeName(): string {
		return this.treeParser.references.refAsName(this.node)
	}

	/** 
	 * Reference as a component.
	 * Can only use it in `init`.
	 */
	protected refAsComponent() {
		this.treeParser.refAsComponent(this.node)
	}

	/**
	 * Get referenced component name.
	 * Must have referenced in `init` using `refAsComponent()`.
	 * Can only use it in `outputInit` or `outputUpdate`.
	 */
	protected getRefedComponentName(): string {
		return this.treeParser.getRefedComponentName(this.node)
	}

	/** 
	 * Get value node, either `$values[0]`, or `"..."`.
	 * Can only use it when outputting update.
	 */
	outputValueNode(): TS.Expression {
		if (this.valueIndex === null) {
			return factory.createStringLiteral(this.string!)
		}
		else {
			return this.template.values.outputNodeAt(this.valueIndex)
		}
	}

	/** Make `new TemplateSlot(...)`. */
	outputTemplateSlotNode(slotContentType: number | null): TS.Expression {
		Modifier.addImport('TemplateSlot', '@pucelle/lupos.js')
		Modifier.addImport('SlotPosition', '@pucelle/lupos.js')

		let position: number
		let nextNode = this.node.nextSibling
		let parent = this.node.parent!
		let nodeName: string

		// Use next node to locate.
		if (nextNode && nextNode.isPrecedingPositionStable()) {
			nodeName = this.treeParser.references.refAsName(nextNode)
			this.node.remove()

			// SlotPositionType.Before
			position = 2
		}

		// Parent is stable enough.
		// Would be ok although parent is a dynamic component.
		else if (parent.tagName !== 'template') {
			nodeName = this.treeParser.references.refAsName(parent)
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
	protected makeSlotRangeNode(): TS.Expression {
		if (this.node.children.length > 0) {
			return factory.createNull()
		}

		Modifier.addImport('SlotRange', '@pucelle/lupos.js')

		let firstChild = this.node.firstChild!
		let lastChild = this.node.lastChild!

		// If first child is not stable, insert a comment before it.
		if (!firstChild.isPrecedingPositionStable()) {
			let comment = new HTMLNode(HTMLNodeType.Comment, {})
			firstChild.before(comment)
			firstChild = comment
		}

		let firstChildName = this.treeParser.references.refAsName(firstChild)
		let lastChildName = this.treeParser.references.refAsName(lastChild)

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
	init() {}

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