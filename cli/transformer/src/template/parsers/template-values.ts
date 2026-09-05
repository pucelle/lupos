import ts from 'typescript'
import {Interpolator, Packer, DeclarationScopeTree, Hashing, HashKey, transformContext} from '../../core'
import {TreeParser} from './tree'
import {TemplatePartType} from '../../lupos-ts-module'
import {SlotContentType} from '../../enums'
import {MutableConfig} from '../../core/helpers/mutable-state'


/** Help to manage all value nodes. */
export class TemplateValues {

	readonly valueNodes: ts.Expression[]

	private valueIndexHash: Map<HashKey, number> = new Map()
	private outputNodes: ts.Expression[] = []
	private indicesNonTransferredOutputted: Set<number> = new Set()
	private transferredValueIndexToLatestName: Map<number, string> = new Map()

	constructor(valueNodes: ts.Expression[]) {
		this.valueNodes = valueNodes
	}
	
	/** Returns whether the element of the value at specified index are mutable. */
	isElementsMutableAt(valueIndex: number): boolean {
		return DeclarationScopeTree.testElementsMutable(this.valueNodes[valueIndex])
	}

	/** 
	 * Returns whether the value at specified index can transfer.
	 * It's narrower than mutable, some static may can't transfer.
	 */
	isTransferableAt(valueIndex: number, config?: MutableConfig): boolean {
		let node = this.valueNodes[valueIndex]
		return DeclarationScopeTree.testTransferable(node, config)
	}

	/** Returns whether the value at specified index has been outputted as non-transferred. */
	isNonTransferredOutputtedAt(valueIndex: number): boolean {
		return this.indicesNonTransferredOutputted.has(valueIndex)
	}

	/** Get raw value node at index. */
	valueNodeAt(valueIndex: number): ts.Expression {
		return this.valueNodes[valueIndex]
	}

	/** To identify value content type at specified index. */
	identifyValueContentType(valueIndex: number): SlotContentType | null {
		let helper = transformContext.helper
		let valueNode = this.valueNodeAt(valueIndex)
		let type = valueNode ? helper.types.getMirroredType(valueNode) : null
		let checker = valueNode ? helper.types.getMirroredTypeChecker(valueNode) : null
		let typeText = checker ? helper.types.getTypeFullText(type!, checker) : null
		let slotContentType: number | null = null

		if (typeText === 'TemplateResult') {
			slotContentType = SlotContentType.TemplateResult
		}
		else if (typeText === 'TemplateResult[]') {
			slotContentType = SlotContentType.TemplateResultList
		}
		else if (typeText === 'string' || typeText === 'number'
			|| type && helper.types.isNonNullableValueType(type)
		) {
			slotContentType = SlotContentType.Text
		}
		else if (typeText && /^(?:\w*?Element|Node|Comment|Text)$/.test(typeText)) {
			slotContentType = SlotContentType.Node
		}

		// Should not specify fixed content type for promise,
		// which's contents are always dynamic.

		return slotContentType
	}

	/** 
	 * Output a part value from a template slot / part.
	 * 
	 * Use each value node at index, or output `$values[i]`
	 * to reference a local value,
	 * or skip value node if it is static.
	 * 
	 * Can only use it when outputting update.
	 * must check `isIndexCanTurnStatic()` firstly and ensure it can.
	 */
	outputValue(
		strings: string[] | null = null,
		valueIndices: number[] | null,
		tree: TreeParser,
		partType: TemplatePartType,
		config?: MutableConfig
	): {
		joint: ts.Expression,
		valueNodes: ts.Expression[],
	} {

		if (!strings && !valueIndices) {

			// Like `.booleanProp`.
			if (partType === TemplatePartType.Property) {
				return {
					joint: transformContext.factory.createTrue(),
					valueNodes: [],
				}
			}

			// Like `autofocus` on a component.
			else if (partType === TemplatePartType.SlottedAttribute
				|| partType === TemplatePartType.UnSlottedAttribute
			) {
				return {
					joint: transformContext.factory.createStringLiteral(''),
					valueNodes: [],
				}
			}

			// Otherwise when no value specified.
			else {
				return {
					joint: transformContext.factory.createIdentifier('undefined'),
					valueNodes: [],
				}
			}
		}

		if (valueIndices === null) {
			return {
				joint: transformContext.factory.createStringLiteral(strings![0]),
				valueNodes: [],
			}
		}
		
		let valueNodes = valueIndices.map(valueIndex => {
			let rawValueNode = this.valueNodes[valueIndex]
			return this.doOutputValueOf(rawValueNode, valueIndex, tree, config)
		})

		let joint: ts.Expression

		if (strings) {
			joint = this.bundleStringsAndValueNodes(strings, valueIndices, valueNodes)
		}
		else {
			joint = valueNodes[0]
		}
		
		return {
			joint,
			valueNodes,
		}
	}

	/** Output a raw node of full or partial specified index. */
	private doOutputValueOf(
		rawValueNode: ts.Expression,
		valueIndex: number,
		tree: TreeParser,
		config?: MutableConfig
	): ts.Expression {
		let canTransfer = DeclarationScopeTree.testTransferable(rawValueNode, config)

		// Output static node, and may push local reference to list.
		if (canTransfer) {
			let interpolated = Interpolator.outputSelfUnique(rawValueNode) as ts.Expression
			let transferred = this.transferOutputted(interpolated, rawValueNode, tree, config)
			return transferred
		}

		// Output from value list as `$values[0]`.
		else {
			this.indicesNonTransferredOutputted.add(valueIndex)
			return this.outputNodeAsValue(rawValueNode, rawValueNode, tree, false)
		}
	}

	/** Transfer an outputted node by transfer local reference as appended value nodes. */
	transferOutputted(
		outputted: ts.Expression,
		rawValueNode: ts.Node,
		tree: TreeParser,
		config?: MutableConfig
	) {
		let transferred = DeclarationScopeTree.transferToTopmostScope(
			outputted,
			rawValueNode,
			config,
			this.transferNodeToTopmostScope.bind(this, tree)
		)

		return transferred
	}

	/** 
	 * Replace local variables to values reference:
	 * `this.onClick` -> `$context.onClick`
	 * `localVariableName` -> `$values[...]`, and add it to output value list.
	 */
	private transferNodeToTopmostScope(
		tree: TreeParser,
		node: ts.Identifier | ts.ThisExpression,
		rawNode: ts.Node,
		insideFunction: boolean
	): ts.Expression {

		// Move variable name as an item to output value list.
		if (ts.isIdentifier(node)) {
			return this.outputNodeAsValue(node, rawNode, tree, insideFunction)
		}

		// Replace `this` to `$context`.
		else {
			return tree.createContextIdentifier()
		}
	}

	/** 
	 * Output a node, append it to output value node list,
	 * and returns it's reference value item.
	 * If `transferWithinFunction`, move value to topmost scope and add referenced value to value list.
	 */
	private outputNodeAsValue(
		node: ts.Expression,
		rawNode: ts.Node,
		tree: TreeParser,
		transferWithinFunction: boolean
	): ts.Expression {
		let hash = Hashing.hashMayNewNode(node, rawNode).key
		let valueIndex: number

		if (this.valueIndexHash.has(hash)) {
			valueIndex = this.valueIndexHash.get(hash)!
		}
		else {
			let interpolated = Interpolator.outputSelfUnique(node) as ts.Expression

			valueIndex = this.outputNodes.length
			this.outputNodes.push(interpolated)
			this.valueIndexHash.set(hash, valueIndex)
		}

		if (transferWithinFunction) {
			let latestName: string

			if (this.transferredValueIndexToLatestName.has(valueIndex)) {
				latestName = this.transferredValueIndexToLatestName.get(valueIndex)!
			}
			else {
				latestName = tree.makeUniqueLatestName()
				this.transferredValueIndexToLatestName.set(valueIndex, latestName)
			}

			return transformContext.factory.createIdentifier(latestName)
		}
		else {
			return transformContext.factory.createElementAccessExpression(
				tree.createValuesIdentifier(),
				transformContext.factory.createNumericLiteral(valueIndex)
			)
		}
	}

	/** 
	 * Bundle a interpolation strings and value indices to a new expression.
	 * It uses `indices[0]` as new index.
	 * `...${value}...` -> `${'...' + value + '...'}`
	 */
	private bundleStringsAndValueNodes(strings: string[], valueIndices: number[], valueNodes: ts.Expression[]): ts.Expression {
		let parts: ts.Expression[] = []

		// string[0] + values[0] + strings[1] + ...
		for (let i = 0; i < strings.length; i++) {
			if (strings[i]) {
				parts.push(transformContext.factory.createStringLiteral(strings[i]))
			}

			if (i < strings.length - 1) {
				parts.push(valueNodes[i])
			}
		}

		
		let firstRawNode = this.valueNodeAt(valueIndices[0])

		// '' + ... if it's not a string type of value.
		if (!ts.isStringLiteral(parts[0])
			&& !transformContext.helper.types.isStringType(transformContext.helper.types.getMirroredType(firstRawNode))
		) {
			parts.unshift(transformContext.factory.createStringLiteral(''))
		}

		
		return Packer.bundleBinaryExpressions(parts, ts.SyntaxKind.PlusToken)
	}

	/** 
	 * Add a custom value to value list as `$values[i]`,
	 * and return reference of this value.
	 * Normal `node` is not raw type of node.
	 */
	outputCustomValue(node: ts.Expression, tree: TreeParser): ts.Expression {
		let valueIndex = this.outputNodes.length
		this.outputNodes.push(node)
		this.indicesNonTransferredOutputted.add(valueIndex)

		return transformContext.factory.createElementAccessExpression(
			tree.createValuesIdentifier(),
			transformContext.factory.createNumericLiteral(valueIndex)
		)
	}

	/** Output a single value from a raw node. */
	outputValueOfIndex(rawNode: ts.Expression, valueIndex: number, tree: TreeParser, config?: MutableConfig): ts.Expression {
		return this.doOutputValueOf(rawNode, valueIndex, tree, config)
	}

	/** 
	 * Output custom values from a list of raw nodes list.
	 * Use for passing several parameters to a binding,
	 * like `:binding=${value1, value2}`, or `:binding=${(value1, value2)}`.
	 */
	outputValueListOfIndex(rawNodes: ts.Expression[], valueIndex: number, tree: TreeParser, config?: MutableConfig): ts.Expression[] {
		let valueNodes = rawNodes.map(rawNode => this.outputValueOfIndex(rawNode, valueIndex, tree, config))
		return valueNodes
	}

	/** Output latest names and associated value indices. */
	outputTransferredLatestNames(): Iterable<[number, string]> {
		return this.transferredValueIndexToLatestName.entries()
	}

	/** Output all values to an array. */
	output(): ts.ArrayLiteralExpression {
		return transformContext.factory.createArrayLiteralExpression(
			this.outputNodes,
			true
		)  
	}
}
