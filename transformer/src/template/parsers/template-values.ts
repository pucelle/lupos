import * as ts from 'typescript'
import {factory, Interpolator, MutableMask, Packer, DeclarationScopeTree, helper, Hashing} from '../../core'
import {VariableNames} from './variable-names'
import {TreeParser} from './tree'
import {TemplatePartType} from '../../lupos-ts-module'


/** Help to manage all value nodes. */
export class TemplateValues {

	readonly valueNodes: ts.Expression[]

	private valueIndexHash: Map<string, number> = new Map()
	private outputNodes: ts.Expression[] = []
	private indicesMutableMask: Map<number, MutableMask | 0> = new Map()
	private indicesNonTransferredOutputted: Set<number> = new Set()
	private transferredValueIndexToLatestName: Map<number, string> = new Map()

	constructor(valueNodes: ts.Expression[]) {
		this.valueNodes = valueNodes
		this.checkIndicesMutable()
	}
	
	/** Removes all static values and remap value indices. */
	private checkIndicesMutable() {
		for (let i = 0; i < this.valueNodes.length; i++) {
			let node = this.valueNodes[i]
			this.indicesMutableMask.set(i, DeclarationScopeTree.checkMutableMask(node))
		}
	}

	/** Returns whether the element of the value at specified index are mutable. */
	isElementsPartMutable(valueIndex: number): boolean {
		return DeclarationScopeTree.testElementsPartMutable(this.valueNodes[valueIndex])
	}

	/** 
	 * Returns whether the value at specified index can transfer.
	 * It's narrower than mutable, some static may can't transfer.
	 */
	isIndexCanTransfer(valueIndex: number, asLazyCallback: boolean): boolean {
		let mask = this.indicesMutableMask.get(valueIndex)!
		return DeclarationScopeTree.testCanTransfer(mask, asLazyCallback)
	}

	/** Returns whether the value at specified index has been outputted as non-transferred. */
	isIndexNonTransferredOutputted(valueIndex: number): boolean {
		return this.indicesNonTransferredOutputted.has(valueIndex)
	}

	/** Get raw value node at index. */
	getRawValue(valueIndex: number): ts.Expression {
		return this.valueNodes[valueIndex]
	}

	/** 
	 * Use value node at index, either `$values[0]`, or static raw node.
	 * Can only use it when outputting update.
	 * must check `isIndexCanTurnStatic()` firstly and ensure it can.
	 */
	outputValue(
		strings: string[] | null = null,
		valueIndices: number[] | null,
		tree: TreeParser,
		asLazyCallback: boolean,
		partType: TemplatePartType
	): {
		joint: ts.Expression,
		valueNodes: ts.Expression[],
	} {

		if (!strings && !valueIndices) {

			// Like `.booleanProp`.
			if (partType === TemplatePartType.Property) {
				return {
					joint: factory.createTrue(),
					valueNodes: [],
				}
			}

			// Like `autofocus` on a component.
			else if (partType === TemplatePartType.SlottedAttribute
				|| partType === TemplatePartType.UnSlottedAttribute
			) {
				return {
					joint: factory.createStringLiteral(''),
					valueNodes: [],
				}
			}

			// Otherwise when no value specified.
			else {
				return {
					joint: factory.createIdentifier('undefined'),
					valueNodes: [],
				}
			}
		}

		if (valueIndices === null) {
			return {
				joint: factory.createStringLiteral(strings![0]),
				valueNodes: [],
			}
		}
		
		let valueNodes = valueIndices.map(valueIndex => {
			let rawValueNode = this.valueNodes[valueIndex]
			let canTransfer = this.isIndexCanTransfer(valueIndex, asLazyCallback)

			return this.doOutputValueOfIndex(rawValueNode, valueIndex, tree, canTransfer)
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
	private doOutputValueOfIndex(rawValueNode: ts.Expression, valueIndex: number, tree: TreeParser, toTransfer: boolean): ts.Expression {

		// Output static node.
		if (toTransfer) {
			let interpolated = Interpolator.outputNodeSelf(rawValueNode) as ts.Expression

			let transferred = DeclarationScopeTree.transferToTopmostScope(
				interpolated,
				rawValueNode,
				this.transferNodeToTopmostScope.bind(this, tree)
			)

			return transferred
		}

		// Output from value list.
		else {
			this.indicesNonTransferredOutputted.add(valueIndex)
			return this.outputNodeAsValue(rawValueNode, rawValueNode, tree, false)
		}
	}

	/** 
	 * Replace local variables to values reference:
	 * `this.onClick` -> `$context.onClick`
	 * `localVariableName` -> `$values[...]`, and add it to output value list.
	 */
	private transferNodeToTopmostScope(
		tree: TreeParser,
		node: ts.Identifier | ts.ThisExpression,
		closestRawNode: ts.Node,
		insideFunction: boolean
	): ts.Expression {

		// Move variable name as an item to output value list.
		if (ts.isIdentifier(node)) {
			return this.outputNodeAsValue(node, closestRawNode, tree, insideFunction)
		}

		// Replace `this` to `$context`.
		else {
			return factory.createIdentifier(VariableNames.context)
		}
	}

	/** 
	 * Output a node, append it to output value node list,
	 * and returns it's reference value item.
	 * If `transferWithinFunction`, move value to topmost scope and add referenced value to value list.
	 */
	private outputNodeAsValue(
		node: ts.Expression,
		rawValueNode: ts.Node,
		tree: TreeParser,
		transferWithinFunction: boolean
	): ts.Expression {
		let hash = Hashing.hashMayNewNode(node, rawValueNode).name
		let valueIndex: number

		if (this.valueIndexHash.has(hash)) {
			valueIndex = this.valueIndexHash.get(hash)!
		}
		else {
			let interpolated = Interpolator.outputNodeSelf(node) as ts.Expression

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

			return factory.createIdentifier(latestName)
		}
		else {
			return factory.createElementAccessExpression(
				factory.createIdentifier(VariableNames.values),
				factory.createNumericLiteral(valueIndex)
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
				parts.push(factory.createStringLiteral(strings[i]))
			}

			if (i < strings.length - 1) {
				parts.push(valueNodes[i])
			}
		}

		
		let firstRawNode = this.getRawValue(valueIndices[0])

		// '' + ... if it's not a string type of value.
		if (!ts.isStringLiteral(parts[0])
			&& !helper.types.isStringType(helper.types.typeOf(firstRawNode))
		) {
			parts.unshift(factory.createStringLiteral(''))
		}

		
		return Packer.bundleBinaryExpressions(parts, ts.SyntaxKind.PlusToken)
	}

	/** 
	 * Add a custom value to value list,
	 * and return reference of this value.
	 * Normal `node` is not raw type of node.
	 */
	outputCustomValue(node: ts.Expression): ts.Expression {
		let valueIndex = this.outputNodes.length
		this.outputNodes.push(node)
		this.indicesNonTransferredOutputted.add(valueIndex)

		return factory.createElementAccessExpression(
			factory.createIdentifier(VariableNames.values),
			factory.createNumericLiteral(valueIndex)
		)
	}

	/** Output a single value from a raw node. */
	outputValueOfIndex(rawNode: ts.Expression, valueIndex: number, tree: TreeParser, asLazyCallback: boolean): ts.Expression {
		let mutableMask = DeclarationScopeTree.checkMutableMask(rawNode)
		let canTransfer = DeclarationScopeTree.testCanTransfer(mutableMask, asLazyCallback)

		return this.doOutputValueOfIndex(rawNode, valueIndex, tree, canTransfer)
	}

	/** 
	 * Output custom values from a list of raw nodes list.
	 * Use for passing several parameters to a binding,
	 * like `:binding=${value1, value2}`, or `:binding=${(value1, value2)}`.
	 */
	outputValueListOfIndex(rawNodes: ts.Expression[], valueIndex: number, tree: TreeParser, asLazyCallback: boolean): ts.Expression[] {
		let valueNodes = rawNodes.map(rawNode => this.outputValueOfIndex(rawNode, valueIndex, tree, asLazyCallback))
		return valueNodes
	}

	/** Output latest names and associated value indices. */
	outputTransferredLatestNames(): Iterable<[number, string]> {
		return this.transferredValueIndexToLatestName.entries()
	}

	/** Output all values to an array. */
	output(): ts.ArrayLiteralExpression {
		return factory.createArrayLiteralExpression(
			this.outputNodes,
			true
		)  
	}
}