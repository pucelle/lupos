import * as ts from 'typescript'
import {HTMLAttribute, HTMLNode, HTMLNodeType} from '../../../lupos-ts-module'
import {PartType, TreeParser} from '../tree'
import {SourceFileDiagnosticModifier, factory, Modifier, MutableMask, ScopeTree, TemplateSlotPlaceholder, Packer, helper} from '../../../core'
import {VariableNames} from '../variable-names'
import {TemplateParser} from '../template'
import {SlotPositionType} from '../../../enums'
import {HTMLNodeHelper} from '../../html-syntax'


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

	readonly attr: HTMLAttribute | null

	/** Tree parser current slot belonged to. */
	readonly tree: TreeParser

	/** Template parser current slot belonged to. */
	readonly template: TemplateParser

	/** Whether slot attach to an dynamic component. */
	private readonly onDynamicComponent: boolean

	/** Has any custom value outputted. */
	private customValueOutputted: boolean = false

	constructor(
		name: string | null,
		strings: string[] | null,
		valueIndices: number[] | null,
		node: HTMLNode,
		attr: HTMLAttribute | null,
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
		this.attr = attr
		this.tree = treeParser
		this.template = treeParser.template
		this.onDynamicComponent = !!(this.node.tagName && TemplateSlotPlaceholder.isCompleteSlotIndex(this.node.tagName))
	}

	private splitNameAndModifiers(name: string) {

		// Main name may be `[@]...` or `[.]...`
		let mainName = name.match(/^[@.?]?[\w-]+/)?.[0] || ''
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
	isAnyValueOutputted(): boolean {
		return this.valueIndices !== null
			&& this.valueIndices.some(index => this.template.values.isIndexOutputted(index))
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
	makeCustomGroupOfLatestNames(exps: ts.Expression[]): (string | null)[] {
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
	outputValue(asCallback: boolean = false): {
		joint: ts.Expression,
		valueNodes: ts.Expression[],
	} {
		return this.template.values.outputValue(this.strings, this.valueIndices, asCallback)
	}

	/** 
	 * Add a custom value to value list,
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

	/** Return a callback to get `new TemplateSlot(...)`. */
	prepareTemplateSlot(slotContentType: number | null): () => ts.Expression {
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
			&& HTMLNodeHelper.isPrecedingPositionStable(nextNode, this.template.values.rawValueNodes)
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
	protected prepareNodesSlotRangeNodes(): (() => ts.Expression[]) | null {
		if (this.node.children.length === 0) {
			return null
		}

		let firstChild = this.node.firstChild!
		let lastChild = this.node.lastChild!

		// If first child is not stable, insert a comment before it.
		if (!HTMLNodeHelper.isPrecedingPositionStable(firstChild, this.template.values.rawValueNodes)) {
			let comment = new HTMLNode(HTMLNodeType.Comment, -1, -1)
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
	protected* resolveComponentDeclarations(): Iterable<ts.ClassLikeDeclaration> {
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

			let decls = helper.symbol.resolveDeclarations(ref, ts.isClassDeclaration)
			if (decls) {
				yield* decls
			}
		}

		// Resolve instance type of constructor interface.
		else {
			let ref = this.template.values.getRawValue(TemplateSlotPlaceholder.getUniqueSlotIndex(tagName)!)
			let decls = helper.symbol.resolveDeclarations(ref, ts.isClassDeclaration)
			if (decls && decls.length > 0) {
				yield* decls
				return
			}

			// Note made type node can't be resolved.
			let typeNode = helper.types.getOrMakeTypeNode(ref)
			if (typeNode) {
				yield* helper.symbol.resolveInstanceDeclarations(typeNode)
				return
			}
		}
	}


	/** Diagnose missing component import of current node. */
	diagnoseMissingTagImport(message: string, ofNode: HTMLNode = this.node) {
		let start = ofNode.start
		let gloStart = this.template.positionMapper.map(start) + 1
		let length = ofNode.tagName!.length

		SourceFileDiagnosticModifier.addMissingImport(gloStart, length, message)
	}

	/** Diagnose normal of current node. */
	diagnoseNormal(message: string, ofNode: HTMLNode = this.node) {
		let start = ofNode.start
		let gloStart = this.template.positionMapper.map(start) + 1
		let length = ofNode.tagName!.length

		SourceFileDiagnosticModifier.addNormal(gloStart, length, message)
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