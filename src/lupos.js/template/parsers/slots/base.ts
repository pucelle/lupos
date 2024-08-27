import type TS from 'typescript'
import {HTMLNode, HTMLNodeType} from '../../html-syntax'
import {TreeParser} from '../tree'
import {factory, Modifier} from '../../../../base'
import {VariableNames} from '../variable-names'
import {TemplateParser} from '../template'
import {SlotPositionType} from '../../enums'


export abstract class SlotParserBase {

	/** Attribute name, be `null` for dynamic binding `<tag ${...}>`. */
	readonly name: string | null = null

	/** Modifiers. */
	readonly modifiers: string[] | null = []

	/** String parts of template slot. */
	readonly strings: string[] | null

	/** 
	 * Value index in the whole template.
	 * Is `null` if slot is a fixed slot defined like `???="..."`.
	 */
	readonly valueIndices: number[] | null

	/** Index of the node the slot placed at within the document fragment. */
	readonly node: HTMLNode

	/** Tree parser current slot belonged to. */
	readonly treeParser: TreeParser

	/** Template parser current slot belonged to. */
	readonly template: TemplateParser

	constructor(
		name: string | null,
		strings: string[] | null,
		valueIndices: number[] | null,
		node: HTMLNode,
		treeParser: TreeParser
	) {
		this.name = name
		this.strings = strings
		this.valueIndices = valueIndices

		if (name !== null) {
			let splitted = name.split(/[.]/g)
			this.name = splitted[0]
			this.modifiers = splitted.slice(1)
		}

		this.node = node
		this.treeParser = treeParser
		this.template = treeParser.template
	}

	/** Returns whether have value indices exist. */
	protected hasValueIndex(): boolean {
		return this.valueIndices !== null
	}

	/** Returns whether have strings exist. */
	protected hasString(): boolean {
		return this.strings !== null
	}

	/** Returns whether current value node is mutable. */
	protected isValueMutable(): boolean {
		return this.valueIndices !== null
			&& this.valueIndices.some(index => this.template.values.isIndexMutable(index))
	}

	/** Returns whether current value node can turn from mutable to static. */
	protected isValueCanTurnStatic(): boolean {
		return this.valueIndices !== null
			&& this.valueIndices.every(index => this.template.values.isIndexCanTurnStatic(index))
	}

	/** Returns whether current value has been outputted as mutable. */
	isValueOutputAsMutable(): boolean {
		return this.valueIndices !== null
			&& this.valueIndices.some(index => this.template.values.isIndexOutputAsMutable(index))
	}

	/** Returns whether current value has been transferred to topmost scope. */
	isValueTransferredToTopmost(): boolean {
		return this.valueIndices !== null
			&& this.valueIndices.some(index => this.template.values.isIndexTransferredToTopmost(index))
	}

	/** 
	 * Get first of raw value nodes,
	 * can only use returned node to identify type, cant output.
	 * If not `hasString()`, this value will always exist.
	 */
	protected getFirstRawValueNode(): TS.Expression | null {
		return this.valueIndices ? this.template.values.getRawNode(this.valueIndices[0]) : null
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
	outputValue(forceStatic: boolean = false): TS.Expression {
		return this.template.values.outputValue(this.valueIndices, this.strings, forceStatic)
	}

	/** Make `new TemplateSlot(...)`. */
	outputTemplateSlot(slotContentType: number | null): TS.Expression {
		Modifier.addImport('TemplateSlot', '@pucelle/lupos.js')
		Modifier.addImport('SlotPosition', '@pucelle/lupos.js')

		let position: number
		let nextNode = this.node.nextSibling
		let parent = this.node.parent!
		let nodeName: string

		// Use next node to locate.
		if (nextNode
			&& nextNode.isPrecedingPositionStable()
			&& this.canRemoveNode(this.node)
		) {
			this.node.remove()
			nodeName = this.treeParser.references.refAsName(nextNode)
			position = SlotPositionType.Before
		}

		// Parent is stable enough.
		// Would be ok although parent is a dynamic component.
		else if (parent.tagName !== 'template'
			&& this.canRemoveNode(this.node)
		) {
			nodeName = this.treeParser.references.refAsName(parent)
			this.node.remove()
			position = SlotPositionType.AfterContent
		}

		// Use the comment node to locate.
		else {
			nodeName = this.getRefedNodeName()
			position = SlotPositionType.Before
		}


		// new TemplateSlot(
		//   new SlotPosition(SlotPositionType.Before / AfterContent, $context),
		//   context,
		//   ?SlotContentType.xxx
		// )

		let slotContentTypeNodes = slotContentType !== null ? [factory.createNumericLiteral(slotContentType)] : []

		let templateSlotParams: TS.Expression[] = [
			factory.createNewExpression(
				factory.createIdentifier('SlotPosition'),
				undefined,
				[
					factory.createNumericLiteral(position),
					factory.createIdentifier(nodeName)
				]
			),
			factory.createIdentifier(VariableNames.context),
			...slotContentTypeNodes
		]

		return factory.createNewExpression(
			factory.createIdentifier('TemplateSlot'),
			undefined,
			templateSlotParams
		)
	}

	/** Whether can remove current node, and will not cause two text node joining. */
	private canRemoveNode(node: HTMLNode): boolean {
		let previousBeText = node.previousSibling?.type === HTMLNodeType.Text
		let nextBeText = node.nextSibling?.type === HTMLNodeType.Text
		
		if (previousBeText && nextBeText) {
			return false
		}

		return true
	}

	/** Make `new SlotRange(...)`. */
	protected makeSlotRange(): TS.Expression {
		if (this.node.children.length === 0) {
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