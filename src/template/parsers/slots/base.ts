import type TS from 'typescript'
import {HTMLNode, HTMLNodeType} from '../../html-syntax'
import {TreeParser} from '../tree'
import {factory, Helper, Modifier, MutableMask, ScopeTree, TemplateSlotPlaceholder, ts} from '../../../base'
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
	readonly tree: TreeParser

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
		this.tree = treeParser
		this.template = treeParser.template
		this.onDynamicComponent = !!(this.node.tagName && TemplateSlotPlaceholder.isCompleteSlotIndex(this.node.tagName))
	}

	private splitNameAndModifiers(name: string) {

		// Main name may be `[@]...` or `[.]...`
		let mainName = name.match(/^[@.?]?\w+/)?.[0] || ''
		let modifiers = name.slice(mainName.length).split(/[.]/).filter(v => v)

		return {
			mainName,
			modifiers,
		}
	}

	/** Returns whether have value indices exist. */
	hasValueIndex(): boolean {
		return this.valueIndices !== null
	}

	/** Returns whether have strings exist. */
	hasString(): boolean {
		return this.strings !== null
	}

	/** Returns whether current raw value node is mutable. */
	isAnyValueMutable(): boolean {
		return this.valueIndices !== null
			&& this.valueIndices.some(index => this.template.values.isIndexMutable(index))
	}

	/** Returns whether current value node can turn from mutable to static. */
	isAllValueCanTurnStatic(): boolean {
		return this.valueIndices !== null
			&& this.valueIndices.every(index => this.template.values.isIndexCanTurnStatic(index))
	}

	/** Returns whether current value has been outputted as mutable. */
	isAnyValueOutputAsMutable(): boolean {
		return this.valueIndices !== null
			&& this.valueIndices.some(index => this.template.values.isIndexOutputAsMutable(index))
	}

	/** 
	 * Get first of raw value nodes,
	 * can only use returned node to identify type, cant output.
	 */
	getFirstRawValueNode(): TS.Expression | undefined {
		return this.valueIndices ? this.template.values.getRawValue(this.valueIndices[0]) : undefined
	}

	/** 
	 * Make a unique slot name `$slot_0`.
	 * Otherwise will add the slot name to `parts`.
	 */
	makeSlotName(): string {
		let name = this.tree.makeUniqueSlotName()
		this.tree.addPart(name, this.node)

		return name
	}	

	/** Get a group of latest names. */
	makeGroupOfLatestNames(): (string | null)[] | null {
		if (!this.valueIndices) {
			return null
		}

		let hashes: string[] = []

		let names = this.valueIndices.map(valueIndex => {
			if (!this.template.values.isIndexMutable(valueIndex)) {
				return null
			}

			let hash = ScopeTree.hashNode(this.template.values.getRawValue(valueIndex)).name
			if (hashes.includes(hash)) {
				return null
			}

			hashes.push(hash)
			return this.tree.makeUniqueLatestName()
		})

		return names
	}

	/** Get a group of latest names by an expression list. */
	makeCustomGroupOfLatestNames(exps: TS.Expression[]): (string | null)[] {
		let hashes: string[] = []

		let names = exps.map((exp) => {
			if ((ScopeTree.testMutable(exp) & MutableMask.Mutable) === 0) {
				return null
			}

			let hash = ScopeTree.hashNode(exp).name
			if (hashes.includes(hash)) {
				return null
			}

			hashes.push(hash)

			return this.tree.makeUniqueLatestName()
		})

		return names
	}

	/** Get whether node has been referenced. */
	protected hasNodeRefed(): boolean {
		return this.tree.references.hasRefed(this.node)
	}

	/** Will later reference node as a variable. */
	protected refNode() {
		this.tree.references.ref(this.node)
	}

	/** Get node variable name. */
	getRefedNodeName(): string {
		return this.tree.references.getRefedName(this.node)
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

	/** Create a variable assignment, either declare variable, or pre-declare and assign.  */
	createVariableAssignment(name: string, exp: TS.Expression, preDeclare = this.onDynamicComponent): TS.Expression | TS.Statement {
		if (preDeclare) {
			this.tree.addPreDeclaredVariableName(name)
			
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
	outputValue(forceStatic: boolean = false): {
		joint: TS.Expression,
		valueNodes: TS.Expression[],
	} {
		return this.template.values.outputValue(this.strings, this.valueIndices, forceStatic)
	}

	/** `$latest_0 !== $values[0], ...` */
	outputLatestComparison(latestVariableNames: (string | null)[], valueNodes: TS.Expression[]):  TS.Expression {
		let exps: TS.Expression[] = []

		for (let i = 0; i < latestVariableNames.length; i++) {
			let name = latestVariableNames[i]
			let valueNode = valueNodes[i]

			if (!name) {
				continue
			}

			exps.push(factory.createBinaryExpression(
				factory.createIdentifier(name),
				factory.createToken(ts.SyntaxKind.ExclamationEqualsEqualsToken),
				valueNode
			))
		}

		return Helper.pack.bundleBinaryExpressions(exps, ts.SyntaxKind.BarBarToken)
	}

	/** `$latest_0 = $values[0], ...` */
	outputLatestAssignments(latestVariableNames: (string | null)[], valueNodes: TS.Expression[]):  TS.Statement[] {
		let exps: TS.Expression[] = []

		for (let i = 0; i < latestVariableNames.length; i++) {
			let name = latestVariableNames[i]
			let valueNode = valueNodes[i]

			if (!name) {
				continue
			}

			exps.push(factory.createBinaryExpression(
				factory.createIdentifier(name),
				factory.createToken(ts.SyntaxKind.EqualsToken),
				valueNode
			))
		}

		return Helper.pack.toStatements(exps)
	}

	/** Return a callback to get `new TemplateSlot(...)`. */
	prepareTemplateSlot(slotContentType: number | null): () => TS.Expression {
		Modifier.addImport('TemplateSlot', '@pucelle/lupos.js')
		Modifier.addImport('SlotPosition', '@pucelle/lupos.js')

		let parameterGetter = this.prepareTemplateSlotParameters()

		return () => {
			let {nodeName, position} = parameterGetter()

			// new TemplateSlot(
			//   new SlotPosition(SlotPositionType.Before / AfterContent, $context),
			//   context,
			//   ?SlotContentType.xxx
			// )

			let slotContentTypeNodes = slotContentType !== null ? [factory.createNumericLiteral(slotContentType)] : []

			return factory.createNewExpression(
				factory.createIdentifier('TemplateSlot'),
				undefined,
				[
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
			)
		}
	}

	/** Return a callback to get node name and position parameters for outputting template slot. */
	protected prepareTemplateSlotParameters() {
		let position = SlotPositionType.Before
		let nextNode = this.node.nextSibling
		let useNode: HTMLNode

		// Use next node to locate.
		if (nextNode
			&& nextNode.isPrecedingPositionStable()
			&& this.canRemoveNode(this.node)
		) {
			this.node.remove()
			useNode = nextNode
		}

		// Use current node to locate.
		else {
			useNode = this.node
		}

		this.tree.references.ref(useNode)

		return () => {
			let nodeName = this.tree.references.getRefedName(useNode)

			return {
				nodeName,
				position,
			}
		}
	}

	/** Whether can remove current node, and will not cause two sibling text nodes joined. */
	private canRemoveNode(node: HTMLNode): boolean {
		let previousBeText = node.previousSibling?.type === HTMLNodeType.Text
		let nextBeText = node.nextSibling?.type === HTMLNodeType.Text
		
		if (previousBeText && nextBeText) {
			return false
		}

		return true
	}

	/** 
	 * Prepare nodes for `SlotRange`, and return a getter,
	 * call which will get slot range node.
	 */
	protected prepareNodesSlotRangeNodes(): (() => TS.Expression[]) | null {
		if (this.node.children.length === 0) {
			return null
		}

		let firstChild = this.node.firstChild!
		let lastChild = this.node.lastChild!

		// If first child is not stable, insert a comment before it.
		if (!firstChild.isPrecedingPositionStable()) {
			let comment = new HTMLNode(HTMLNodeType.Comment, {})
			firstChild.before(comment)
			firstChild = comment
		}

		this.tree.references.ref(firstChild)
		this.tree.references.ref(lastChild)

		return () => {
			let firstChildName = this.tree.references.getRefedName(firstChild)
			let lastChildName = this.tree.references.getRefedName(lastChild)

			if (firstChildName === lastChildName) {
				return [
					factory.createIdentifier(firstChildName)
				]
			}
			else {
				return [
					factory.createIdentifier(firstChildName),
					factory.createIdentifier(lastChildName)
				]
			}
		}
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
			let ref = ScopeTree.getDeclarationByName(tagName, this.template.rawNode)
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
			let ref = this.template.values.getRawValue(TemplateSlotPlaceholder.getUniqueSlotIndex(tagName)!)
			let decls = Helper.symbol.resolveDeclarations(ref, ts.isClassDeclaration)
			if (decls && decls.length > 0) {
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