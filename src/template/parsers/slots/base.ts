import type TS from 'typescript'
import {HTMLNode, HTMLNodeType} from '../../html-syntax'
import {TreeParser} from '../tree'
import {factory, Helper, Modifier, Scoping, TemplateSlotPlaceholder, ts} from '../../../base'
import {VariableNames} from '../variable-names'
import {TemplateParser} from '../template'
import {SlotPositionType} from '../../../enums'


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

	/** Whether slot attach to an dynamic component. */
	private readonly onDynamicComponent: boolean

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
			let splitted = this.splitNameAndModifiers(name)
			this.name = splitted.mainName
			this.modifiers = splitted.modifiers
		}

		this.node = node
		this.treeParser = treeParser
		this.template = treeParser.template
		this.onDynamicComponent = !!(this.node.tagName && TemplateSlotPlaceholder.isCompleteSlotIndex(this.node.tagName))
	}

	private splitNameAndModifiers(name: string) {

		// Main name may be `[@]...` or `[.]...`
		let mainName = name.match(/^[@.]?\w+/)?.[0] || ''
		let modifiers = name.slice(mainName.length).split(/[.]/).filter(v => v)

		return {
			mainName,
			modifiers,
		}
	}

	/** Returns whether have value indices exist. */
	protected hasValueIndex(): boolean {
		return this.valueIndices !== null
	}

	/** Returns whether have strings exist. */
	protected hasString(): boolean {
		return this.strings !== null
	}

	/** Returns whether current raw value node is mutable. */
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
	isValueTransferred(): boolean {
		return this.valueIndices !== null
			&& this.valueIndices.some(index => this.template.values.isIndexTransferred(index))
	}

	/** 
	 * Get first of raw value nodes,
	 * can only use returned node to identify type, cant output.
	 * If not `hasString()`, this value will always exist.
	 */
	protected getFirstRawValueNode(): TS.Expression | undefined {
		return this.valueIndices ? this.template.values.getRawNode(this.valueIndices[0]) : undefined
	}

	/** Get node variable name. */
	protected getRefedNodeName(): string {
		return this.treeParser.references.refAsName(this.node)
	}

	/** Get whether node has been referenced. */
	protected hasNodeRefed(): boolean {
		return this.treeParser.references.hasRefed(this.node)
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

	/** Add a variable assignment, either declare variable, or pre-declare and assign.  */
	addVariableAssignment(name: string, exp: TS.Expression): TS.Expression | TS.Statement {
		if (this.onDynamicComponent) {
			this.treeParser.addPreDeclaredVariableName(name)
			
			return factory.createBinaryExpression(
				factory.createIdentifier(name),
				factory.createToken(ts.SyntaxKind.EqualsToken),
				exp
			) 
		}
		else {
			return factory.createVariableStatement(
				undefined,
				factory.createVariableDeclarationList(
					[factory.createVariableDeclaration(
						factory.createIdentifier(name),
						undefined,
						undefined,
						exp
					)],
					ts.NodeFlags.Let
				)
			)
		}
	}

	/** 
	 * Get value node, either `$values[0]`, or `"..."`.
	 * Can only use it when outputting update.
	 */
	outputValue(forceStatic: boolean = false): TS.Expression {
		return this.template.values.outputValue(this.strings, this.valueIndices, forceStatic)
	}

	/** Make `new TemplateSlot(...)`. */
	outputTemplateSlot(slotContentType: number | null): TS.Expression {
		Modifier.addImport('TemplateSlot', '@pucelle/lupos.js')
		Modifier.addImport('SlotPosition', '@pucelle/lupos.js')

		let {nodeName, position} = this.getTemplateSlotParameters()

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

	/** Get node name and position parameters for outputting template slot. */
	protected getTemplateSlotParameters() {
		let position: number
		let nextNode = this.node.nextSibling
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

		// Use current node to locate.
		else {
			nodeName = this.getRefedNodeName()
			position = SlotPositionType.Before
		}

		return {
			nodeName,
			position,
		}
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
	protected makeSlotRange(): TS.Expression | null {
		if (this.node.children.length === 0) {
			return null
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

	/** Try resolve component declarations. */
	protected* resolveComponentDeclarations(): Iterable<TS.ClassDeclaration> {
		let tagName = this.node.tagName!
		let isNamedComponent = TemplateSlotPlaceholder.isNamedComponent(tagName)
		let isDynamicComponent = TemplateSlotPlaceholder.isDynamicComponent(tagName)

		if (!isNamedComponent && !isDynamicComponent) {
			return
		}

		// Resolve class declarations directly.
		if (isNamedComponent) {
			let ref = Scoping.getDeclarationByName(tagName, this.template.rawNode)
			if (!ref) {
				return
			}

			let decls = Helper.symbol.resolveDeclarations(ref, ts.isClassDeclaration)
			if (decls) {
				yield* decls
			}
		}

		// Resolve instance type of constructor interface.
		else {
			let ref = this.template.values.getRawNode(TemplateSlotPlaceholder.getUniqueSlotIndex(tagName)!)
			let decls = Helper.symbol.resolveDeclarations(ref, ts.isClassDeclaration)
			if (decls) {
				yield* decls
				return
			}

			let typeNode = Helper.types.getTypeNode(ref)
			if (typeNode) {
				yield* Helper.symbol.resolveInstanceDeclarations(typeNode)
				return
			}
		}
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