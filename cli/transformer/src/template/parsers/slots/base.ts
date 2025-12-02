import * as ts from 'typescript'
import {HTMLAttribute, HTMLNode, HTMLNodeType, TemplatePart, TemplatePartType, TemplateSlotPlaceholder} from '../../../lupos-ts-module'
import {PartType, TreeParser} from '../tree'
import {factory, Modifier, DeclarationScopeTree, Packer, Hashing} from '../../../core'
import {TemplateParser} from '../template'
import {SlotPositionType} from '../../../enums'
import {HTMLNodeHelper, PrecedingPositionStability} from '../../html-syntax'


export abstract class SlotParserBase {

	/** Slot part type. */
	readonly type: TemplatePartType

	/** 
	 * Attribute name after removed prefix and modifiers,
	 * be `null` for dynamic binding `<tag ${...}>`.
	 */
	readonly name: string | null = null

	/** Attribute name prefix, like `?`, `@`, `.`, `:`,  `?:`. */
	readonly prefix: string | null = null

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

	readonly attr: HTMLAttribute | null

	/** Tree parser current slot belonged to. */
	readonly tree: TreeParser

	/** Template parser current slot belonged to. */
	readonly template: TemplateParser

	/** Whether output update content as a lazy callback. */
	asLazyCallback: boolean = false

	/** Whether slot attach to an dynamic component. */
	private readonly onDynamicComponent: boolean

	/** Has any custom value outputted. */
	private customValueOutputted: boolean = false

	constructor(slot: TemplatePart, treeParser: TreeParser) {
		let {type, namePrefix, mainName, modifiers, strings, valueIndices, node, attr} = slot

		this.type = type
		this.prefix = namePrefix
		this.name = mainName
		this.modifiers = modifiers
		this.strings = strings ? strings.map(s => s.text) : null
		this.valueIndices = valueIndices ? valueIndices.map(s => s.index) : null
		this.node = node
		this.attr = attr
		this.tree = treeParser
		this.template = treeParser.template
		this.onDynamicComponent = !!(this.node.tagName && TemplateSlotPlaceholder.isCompleteSlotIndex(this.node.tagName))
	}

	/** Returns whether have value indices exist. */
	hasValueIndex(): boolean {
		return this.valueIndices !== null
	}

	/** Returns whether have strings exist. */
	hasString(): boolean {
		return this.strings !== null
	}

	/** Returns whether all current values can't transfer to outer scope. */
	isAnyValueCantTransfer(): boolean {
		return !this.isAllValuesCanTransfer()
	}

	/** Returns whether any of current values can transfer to outer scope. */
	isAllValuesCanTransfer(): boolean {
		return this.valueIndices !== null
			&& this.valueIndices.every(index => this.template.values.isIndexCanTransfer(index, this.asLazyCallback))
	}

	/** Returns whether current value has been outputted as non-transferred. */
	shouldUpdateDynamically(): boolean {
		return this.valueIndices !== null
			&& this.valueIndices.some(index => this.template.values.isIndexNonTransferredOutputted(index))
			|| this.customValueOutputted
	}

	/** 
	 * Get first of raw value nodes,
	 * can only use returned node to identify type, cant output.
	 */
	getFirstRawValueNode(): ts.Expression | undefined {
		return this.valueIndices ? this.template.values.getRawValue(this.valueIndices[0]) : undefined
	}

	/** 
	 * Make a unique slot name `$slot_0`.
	 * Otherwise will add the slot name to `parts`.
	 */
	makeSlotName(): string {
		let name = this.tree.makeUniqueSlotName()
		this.tree.addPart(name, this.node, PartType.Slot)

		return name
	}	

	/** Get a group of latest names. */
	makeGroupOfLatestNames(asLazyCallback: boolean = this.asLazyCallback): (string | null)[] | null {
		if (!this.valueIndices) {
			return null
		}

		let hashes: string[] = []

		let names = this.valueIndices.map(valueIndex => {
			if (this.template.values.isIndexCanTransfer(valueIndex, asLazyCallback)) {
				return null
			}

			let hash = Hashing.hashNode(this.template.values.getRawValue(valueIndex)).name
			if (hashes.includes(hash)) {
				return null
			}

			hashes.push(hash)

			return this.tree.makeUniqueLatestName()
		})

		return names
	}

	/** Get a group of latest names by an expression list. */
	makeCustomGroupOfLatestNames(exps: ts.Expression[]): (string | null)[] {
		let hashes: string[] = []

		let names = exps.map((exp) => {
			let mask = DeclarationScopeTree.checkMutableMask(exp)
			if (DeclarationScopeTree.testCanTransfer(mask, this.asLazyCallback)) {
				return null
			}

			let hash = Hashing.hashNode(exp).name
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
	 * Exist if have referenced in `init` using `refAsComponent()`.
	 * Can only use it in `outputInit` or `outputUpdate`.
	 */
	protected getRefedComponentName(): string | undefined {
		return this.tree.getRefedComponentName(this.node)
	}

	/** Create a variable assignment, either declare variable, or pre-declare and assign.  */
	createVariableAssignment(name: string, exp: ts.Expression, preDeclare = this.onDynamicComponent): ts.Expression | ts.Statement {
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
	outputValue(): {
		joint: ts.Expression,
		valueNodes: ts.Expression[],
	} {
		return this.template.values.outputValue(
			this.strings,
			this.valueIndices,
			this.tree,
			this.asLazyCallback,
			this.type
		)
	}

	/** 
	 * Add a node, normally not a raw node as custom value to value list,
	 * and return reference of this value.
	 */
	outputCustomValue(node: ts.Expression) {
		this.customValueOutputted = true
		return this.template.values.outputCustomValue(node)
	}

	/** `$latest_0 !== $values[0], ...` */
	outputLatestComparison(latestVariableNames: (string | null)[], valueNodes: ts.Expression[]):  ts.Expression {
		let exps: ts.Expression[] = []

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

		return Packer.bundleBinaryExpressions(exps, ts.SyntaxKind.BarBarToken)
	}

	/** `$latest_0 = $values[0], ...` */
	outputLatestAssignments(latestVariableNames: (string | null)[], valueNodes: ts.Expression[]):  ts.Statement[] {
		let exps: ts.Expression[] = []

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

		return Packer.toStatements(exps)
	}

	/** 
	 * Prepare current node to make a template slot.
	 * Return a callback to get `new TemplateSlot(...)`.
	 */
	prepareAsTemplateSlot(slotContentType: number | null): () => ts.Expression {
		Modifier.addImport('TemplateSlot', 'lupos.html')
		Modifier.addImport('SlotPosition', 'lupos.html')

		let parameterGetter = this.prepareTemplateSlotParametersGetter()

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
					...slotContentTypeNodes
				]
			)
		}
	}

	/** Return a callback to get node name and position parameters for outputting template slot. */
	protected prepareTemplateSlotParametersGetter() {
		let position = SlotPositionType.Before
		let nextNode = this.node.nextSibling
		let useNode: HTMLNode

		// Use next node to locate if it's stable,
		// and remove current node to reduce HTML output.
		if (nextNode
			&& HTMLNodeHelper.getPrecedingPositionStability(nextNode, this.template.values.valueNodes)
				=== PrecedingPositionStability.Stable
			&& HTMLNodeHelper.canSafelyRemoveNode(this.node)
		) {
			this.node.remove()
			useNode = nextNode
			HTMLNodeHelper.willInsertContentsBefore(nextNode)
		}

		// Use current node to locate.
		// `<lu:xxx>` excluded `<lu:portal>` will be replaced and outputted as comments.
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

	/** 
	 * Prepare nodes for `SlotRange`, and return a getter,
	 * call which will get slot range node.
	 */
	protected prepareNodesSlotRangeNodes(): (() => ts.Expression[]) | null {
		if (this.node.children.length === 0) {
			return null
		}

		let firstChild = this.node.firstChild!
		let lastChild = this.node.lastChild!

		// Find next stable.
		let firstStableNode = HTMLNodeHelper.findNextStableNode(firstChild, this.template.values.valueNodes)
		if (firstStableNode) {
			firstChild = firstStableNode
		}
		else {
			let comment = new HTMLNode(HTMLNodeType.Comment, -1, -1)

			firstChild.before(comment)
			firstChild = comment
		}

		// Find previous stable, it always exists.
		lastChild = HTMLNodeHelper.findPreviousStableNode(lastChild)!

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


	/** 
	 * Initialize and prepare.
	 * In `parent->child` order.
	 * You may modify nodes, like add or remove sibling nodes here.
	 */
	preInit() {}

	/** 
	 * Initialize and prepare after all children get initialized.
	 * All children and descendants have called `preInit` and `postInit`.
	 * In `child->parent` order.
	 * Child nodes become stable, you may visit them here.
	 */
	postInit() {}

	/** 
	 * Output initialize codes.
	 * Note it should not output variable declaration codes,
	 * which will be output by tree parser.
	 * 
	 * `nodeAttrInits` are all the attribute, binding applied to current node,
	 * it will be applied only for component or dynamic component slot.
	 */
	outputInit(_nodeAttrInits: ts.Statement[]): ts.Statement | ts.Expression | (ts.Statement| ts.Expression)[] {
		return []
	}

	/** Also output init codes, but output them later than all normal init codes. */
	outputMoreInit(): ts.Statement | ts.Expression | (ts.Statement| ts.Expression)[] {
		return []
	}

	/** Output update codes. */
	outputUpdate(): ts.Statement | ts.Expression | (ts.Statement| ts.Expression)[] {
		return []
	}
}